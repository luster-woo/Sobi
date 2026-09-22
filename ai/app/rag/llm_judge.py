"""Jev 장애 시 폴백. GMS 에 같은 질문을 시키고 같은 게이트를 태운다.

판정 규칙은 여기 없다. app/rag/jev.py 의 gate() 가 한다.

다만 LLM 이 말하는 confidence 는 계산값이 아니라 생성된 문자열이라 지표로
쓸 수 없다. 그래서 확신도 게이트는 끄고(tau=0) 사실 질문 셋만 쓴다.

**이 경로의 정확도는 측정되지 않았다.** gpt-4.1-mini 를 이 구조로 재본 적이
없다(GMS 크레딧을 운영에 남겨둔 탓). 서비스가 죽지 않게 하는 장치일 뿐이다.
"""

import asyncio
import json
import logging

from app.core import gms
from app.rag import jev

logger = logging.getLogger(__name__)

BATCH_SIZE = 5    # 출력 토큰 한계. Jev 와 달리 배치가 필요하다
MAX_OUTPUT = 3000
NEUTRAL_CONF = 0.5  # CERTAIN(0.99) 도 tau 도 타지 않는 값

SYSTEM_PROMPT = """\
너는 소상공인 정부지원사업 자격 심사관이다.
아래 JSON 형식으로만 답한다. 설명을 덧붙이지 않는다.

{"results": [{"program_id": 1, "status": "eligible",
  "needs_status": 0.0, "needs_person": 0.0,
  "needs_registered": 0.0, "either": 0.0}]}

status 는 "eligible" 또는 "ineligible" 둘 중 하나만 고른다.
"모르겠다"는 선택지가 아니다. 판단을 미루는 처리는 코드가 한다.

나머지 넷은 사업자가 아니라 **공고의 성질**을 묻는다. 0~1 확률로 답한다.
사업자가 누구든 같은 답이 나와야 한다.

needs_status      특정 지위·자격을 이미 보유한 사업자만 신청할 수 있는가
                  (백년소상공인 지정, 보험 가입, 신용평점 기준,
                   특정 상권 소속, 기존 대출 보유, 교육 수료)
needs_person      대표자 개인 신상이 요건인가
                  (자녀 유무, 출산, 육아휴직, 성별, 장애 여부)
needs_registered  사업자등록을 마치고 영업 중인 사업자만 신청할 수 있는가
                  (예비창업자도 신청 가능한 갈래가 있으면 낮게)
either            지원대상이 여러 유형 중 어느 하나만 충족하면 되는 택일 구조인가
"""


def _num(v: object, default: float = 0.0) -> float:
    try:
        return max(0.0, min(1.0, float(v)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


async def _batch(states: dict[int, str]) -> dict[int, dict]:
    user = "\n\n".join(f"## program_id: {pid}\n{s}" for pid, s in states.items())
    try:
        r = await gms.get_client().chat.completions.create(
            model=gms.DEFAULT_MODEL,
            response_format={"type": "json_object"},
            temperature=0,
            max_completion_tokens=MAX_OUTPUT,
            messages=[{"role": "system", "content": SYSTEM_PROMPT},
                      {"role": "user", "content": user}],
        )
        if r.choices[0].finish_reason == "length":
            logger.warning("폴백 응답 잘림 — 공고 %d건 중 일부 누락 (BATCH_SIZE 를 줄여야 한다)",
                           len(states))
        rows = json.loads(r.choices[0].message.content).get("results", [])
    except Exception:
        logger.exception("폴백 판정 실패 (공고 %d건, 입력 %d자)",
                         len(states), len(user))
        return {}
    return {v["program_id"]: v for v in rows if isinstance(v, dict) and "program_id" in v}


async def judge(states: dict[int, str], *, prestartup: bool = False) -> dict[int, dict]:
    """program_id → 판정. jev.judge() 와 같은 모양을 돌려준다."""
    ids = list(states)
    batches = [{k: states[k] for k in ids[i:i + BATCH_SIZE]}
               for i in range(0, len(ids), BATCH_SIZE)]

    parsed: dict[int, dict] = {}
    for part in await asyncio.gather(*(_batch(b) for b in batches)):
        parsed |= part

    missing = set(states) - parsed.keys()
    if missing:
        logger.warning("폴백 판정 누락 %d건: %s", len(missing), sorted(missing))

    out: dict[int, dict] = {}
    for pid in states:
        v = parsed.get(pid)
        if v is None:
            out[pid] = {"status": "unknown", "failed": True}
            continue
        choice = v.get("status")
        sig = {
            "choice": choice if choice in ("eligible", "ineligible") else "ineligible",
            "conf": NEUTRAL_CONF,
            "needs_status": _num(v.get("needs_status")),
            "needs_person": _num(v.get("needs_person")),
            "needs_registered": _num(v.get("needs_registered")),
            "either": _num(v.get("either")),
            "model": gms.DEFAULT_MODEL,
        }
        # 확신도 게이트는 끈다. 사실 질문 셋만 작동한다.
        sig["status"] = jev.gate(sig, prestartup=prestartup, tau=0.0)
        out[pid] = sig
    return out
