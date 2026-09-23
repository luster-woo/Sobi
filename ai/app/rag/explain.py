"""판정 사유 설명 생성. 검색해 온 공고 원문을 근거로 문장을 만든다.

**여기가 이 서비스에서 유일하게 글을 생성하는 곳이다.** 검색은 공고 목록을,
판정은 확률을 돌려준다. 둘 다 원문에 있는 것을 고르거나 셀 뿐이라, 사장님의
상황과 공고 요건을 겹쳐 놓아야만 나오는 문장은 아무도 만들지 않았다.

    "필수 요건을 충족합니다"                    ← 지금 (recommend._reason 템플릿)
    "울산에서 6개월 이상 영업 중인 소상공인이
     대상이고, 사장님은 업력 37개월이라 해당합니다"  ← 여기

**판정을 다시 하지 않는다.** status 는 입력으로 받아 확정된 사실로 넣는다.
생성 쪽에 판단을 맡기면 Jev 는 "가능"인데 설명은 "어려워 보입니다"가 나오고,
사용자는 어느 쪽을 믿을지 알 수 없게 된다. 그래서 프롬프트가 묻는 것은
"해당하나요"가 아니라 "왜 그렇게 나왔나요"다.

**근거는 판정이 본 청크 그대로다.** search.hit_for_program() 이 같은 프로필
벡터로 같은 12개를 다시 꺼낸다. 선택이 결정론적이라 저장하지 않는다.

**금지 규칙 하나가 채점 항목 하나다.** 아래 RULES 의 각 줄은
scripts/eval_explain.py 가 세는 위반과 1:1로 대응한다. 규칙을 고치면 채점도
같이 고쳐야 한다. 측정은 docs/08_explain.md.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

from app.core import gms
from app.rag import recommend, search

logger = logging.getLogger(__name__)

MAX_OUTPUT = 400     # 2~3문장이면 충분하다. 길어지면 규칙을 어긴 것이다
TEMPERATURE = 0.0    # 재현성. 측정값이 실행마다 흔들리면 비교가 안 된다

# GMS 크레딧 환산율. **출력이 입력의 4배다.**
#
# 처음에는 균일 3/1K 로 잡았다가 실측과 어긋나 다시 맞췄다. 호출 6건의
# (입력, 출력, 크레딧)을 GMS 사용 로그에서 받아 풀면 소수점 셋째 자리까지
# 정확히 떨어진다.
#
#   1,531×0.004 + 85×0.016 = 7.484   (로그: 7.484)
#   4,321×0.004 + 100×0.016 = 18.884 (로그: 18.884)
#
# 균일 요율로 잡으면 과소 추정한다(6건 실측 73.4 vs 균일 추정 51).
# 이 경로는 입력이 크고 출력이 짧아 차이가 작았을 뿐, 출력이 길어지면 벌어진다.
CREDITS_IN_PER_1K = 4.0
CREDITS_OUT_PER_1K = 16.0


@dataclass
class Explanation:
    """설명 문장과 그것을 만드는 데 든 비용.

    토큰을 같이 돌려주는 이유: 이 경로는 사용자가 누를 때마다 GMS 크레딧을
    쓴다. 호출부가 로그로 남길 수 있어야 예산이 언제 바닥날지 알 수 있다.
    """
    text: str
    prompt_tokens: int
    completion_tokens: int

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    @property
    def credits(self) -> float:
        return (self.prompt_tokens * CREDITS_IN_PER_1K
                + self.completion_tokens * CREDITS_OUT_PER_1K) / 1000

STATUS_LABEL = {
    "eligible": "신청 가능",
    "ineligible": "해당 없음",
    "unknown": "확인 필요",
}

# **근거의 개수가 아니라 확인 가능성으로 자른다.** 이 프롬프트의 핵심 설계다.
#
# 처음에는 "근거를 하나만 말하라"로 막았다. 틀린 자리가 전부 두 번째 주장이라
# 그렇게 했는데, 그것은 증상을 누른 것이지 원인이 아니었다. 원인은 개수가
# 아니라 **대조할 수 없는 것을 근거로 든 것**이다.
#
#   [5] "제품 보유 요건에도 해당하지 않아" — [사업자]에 제품 항목이 없다.
#       사장님이 제품을 가졌는지는 아무도 모른다
#   [4] "표준 융자제외업종이 아니라 지원제외 업종이 아니다" — 둘은 다른 목록이다
#   [4] "사업장 소재지가 서울특별시로" — 이 공고는 전국이라 지역이 요건이 아니다
#   [4] "만 50세 이상이어야 하는 우대 조건은 충족하지 않습니다" — 판정이
#       '가능'인데 부정문으로 시작한다. 우대는 못 채워도 신청되는 항목이다
#   [4] "휴업·폐업 상태가 아니고 체납도 없어 결격 사유가 없습니다" — 셋 다
#       [사업자]에 없는 값이다. 판정이 '가능'이니 결격이 없었겠지 하고
#       역추론했다. Jev 는 체납을 확인하고 통과시킨 것이 아니다
#
# **고칠 때마다 같은 실패가 옆 칸에서 나왔다.** 우대를 막으니 결격으로,
# 제품 보유를 막으니 체납으로 옮겨갔다. 전부 "대조할 수 없는 것을 단정한다"는
# 한 뿌리다. 규칙을 더 늘리기보다 채점으로 재는 편이 낫다 —
# 쌍 6개로 프롬프트를 계속 깎으면 그 6개에만 맞는 프롬프트가 된다.
#
# 그래서 "하나만" 대신 **대조 가능한 것만, 있는 만큼**으로 바꿨다. 근거의
# 자격을 이렇게 정의한다:
#
#   공고가 요구한 요건이고([공고 조건]·[공고 원문]에 있고)
#   그 요건에 대응하는 값이 [사업자] 블록에 있어서 대조가 되는 것
#
# 두 조건을 모두 만족해야 한다. [4]의 소재지는 첫째에서, [5]의 제품 보유는
# 둘째에서 걸린다.
#
# **마지막 문장은 사업 내용을 원문 그대로 인용한다.** 자격 판단만 하면
# 주소 두 개를 비교한 문장이 되어 검색이나 DB 조회와 구별되지 않는다.
# 금액·기간·지원 내용은 원문에만 있고, 틀렸는지 원문과 대조해 바로 확인된다.
# 자격 판단과 달리 **검증 가능한 주장**이라 환각 위험이 낮다.
RULES = """\
너는 소상공인 정부지원사업 상담사다. 사장님께 직접 말하듯 설명한다.

[판정 결과]는 이미 확정된 사실이다. 바꾸거나 의심하지 마라.

**근거로 쓸 수 있는 것**은 다음 두 조건을 모두 만족하는 것뿐이다.
1. 공고가 요구한 요건이다 ([공고 조건] 또는 [공고 원문]에 적혀 있다)
2. 그 요건에 대응하는 값이 [사업자] 블록에 있어서 대조가 된다

- 자격이 되는 근거를 **1~3개** 말하라. 위 조건을 만족하는 만큼만이다.
  하나뿐이면 하나만 말하라. 억지로 채우지 마라
- [사업자]에 대응하는 값이 없으면 근거가 아니다.
  "해당하지 않는다"가 아니라 "확인이 필요하다"로 써라
- [사업자] 블록의 항목 이름을 공고 요건인 것처럼 쓰지 마라.
  특히 '표준 융자제외업종'은 공고가 정한 지원제외 업종과 다른 목록이다
- 공고가 요구하지 않은 것은 근거가 아니다.
  전국 사업이면 사장님의 지역은 근거가 되지 않는다
- [공고 조건]에서 `[우대/...]` 로 표시된 것은 자격 요건이 아니다.
  충족하지 못해도 신청할 수 있으므로 근거로 쓰지 말고, 못 채웠다고 말하지도 마라
- [판정 결과]로부터 개별 요건의 충족 여부를 역으로 추론하지 마라.
  '신청 가능'이라고 해서 휴폐업·체납 같은 결격 사유가 확인된 것은 아니다

**마지막 문장**에서 이 사업이 무엇을 주는지 한 줄로 알려라.
금액·기간·지원 내용을 [공고 원문]에 적힌 표현 그대로 옮겨 쓴다.
원문에서 찾을 수 없으면 이 문장을 쓰지 마라.

존댓말. 인사말과 맺음말은 쓰지 마라. 전체 2~4문장.
"""

# 상태마다 설명이 답해야 할 질문이 다르다. 하나의 프롬프트로 셋을 덮으면
# "충족하거나 충족하지 않습니다" 같은 무의미한 문장이 나온다.
GOAL = {
    "eligible": "공고의 필수 요건 중 사장님이 충족하는 것을 짚어라.",
    "ineligible": "사장님이 충족하지 못하는 요건을 짚어라.",
    "unknown": ("확정하지 못한 이유와, 사장님이 공고문에서 확인할 것을 "
                "말하라. 해당한다/안 한다로 단정하지 마라."),
}


def _prompt(status: str) -> str:
    return f"{RULES}\n{GOAL.get(status, GOAL['unknown'])}"


async def explain(
    *,
    program_id: int,
    status: str,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date | None = None,
    annual_revenue: int | None = None,
    birth_date: date | None = None,
    is_prestartup: bool = False,
) -> Explanation | None:
    """설명 문장과 토큰 사용량. 실패하면 None — 호출 쪽이 템플릿 사유로 돌아간다.

    실패를 예외로 올리지 않는 이유: 설명은 부가 정보다. 이것 때문에 공고
    상세 화면이 통째로 죽으면 안 된다.
    """
    if status not in GOAL:
        logger.warning("설명 생성: 모르는 판정 %r (공고 %d)", status, program_id)
        return None

    hit, industry_name, std_excluded = await search.hit_for_program(
        program_id,
        region=region,
        address=address,
        business_code=business_code,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        is_prestartup=is_prestartup,
    )
    if hit is None or not hit.chunks:
        # SQL 하드필터에서 탈락한 공고가 여기로 올 수 있다. 그 사유는
        # 결정론적이라(_reject_reason) 생성할 것이 없다.
        logger.info("설명 생성: 공고 %d 의 원문이 없다", program_id)
        return None

    block = recommend.format_profile(
        address=address,
        industry_name=industry_name,
        std_excluded=std_excluded,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        birth_date=birth_date,
        is_prestartup=is_prestartup,
    )
    # 판정과 같은 입력에 판정 결과만 덧붙인다.
    state = recommend.build_state(hit, block)
    user = f"{state}\n\n[판정 결과]\n{STATUS_LABEL[status]}"

    try:
        r = await gms.get_client().chat.completions.create(
            model=gms.DEFAULT_MODEL,
            temperature=TEMPERATURE,
            max_completion_tokens=MAX_OUTPUT,
            messages=[{"role": "system", "content": _prompt(status)},
                      {"role": "user", "content": user}],
        )
    except Exception:
        logger.exception("설명 생성 실패 (공고 %d, 입력 %d자)", program_id, len(user))
        return None

    if r.choices[0].finish_reason == "length":
        # 2~3문장 규칙을 어긴 것이다. 잘린 문장을 내보내면 안 된다.
        logger.warning("설명이 %d토큰에서 잘렸다 (공고 %d)", MAX_OUTPUT, program_id)
        return None

    text = (r.choices[0].message.content or "").strip()
    if not text:
        return None

    u = getattr(r, "usage", None)
    return Explanation(
        text=text,
        prompt_tokens=getattr(u, "prompt_tokens", 0) or 0,
        completion_tokens=getattr(u, "completion_tokens", 0) or 0,
    )
