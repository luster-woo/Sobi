"""정형 필터 + 벡터 검색.

SQL 필터를 통과한 공고 전체를 후보로 돌려준다. 벡터 유사도는 순서를 정하는
데만 쓴다. 탈락 공고는 사유와 함께 따로 돌려준다(LLM을 부르지 않는다).
설계 근거는 docs/04_judgement_design.md.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import date

from app.core import db
from app.rag import lexical, profile
from app.rag import rerank as rerank_mod
from app.rag.embedding import koe5

logger = logging.getLogger(__name__)

# 4·6·8·12·18 을 각 3회 재서 고른 값. 12가 정점이고 양쪽으로 떨어진다.
# 8 아래로 내리면 위험 오판이 6배, 18 로 올리면 무관한 조각이 사실 판단을
# 흐린다. 토큰을 아끼려고 줄이지 말 것. 근거는 docs/07_jev_judgement.md.
CHUNKS_PER_PROGRAM = 12

# 정형 필터. 원칙: 공고 값이 NULL이면 통과. 확실한 탈락만 SQL이 담당한다.
FILTER_SQL = """
    (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
    AND (
      cond.id IS NULL
      OR (
        (cond.nationwide OR cond.region_sido IS NULL OR cond.region_sido = %(region)s)
        AND (cond.target_scale IS NULL
             OR cond.target_scale = '무관'
             OR cond.target_scale = '중소기업'
             OR (cond.target_scale = '소상공인' AND %(employee_count)s < 5))
        AND (cond.max_revenue IS NULL OR %(revenue)s::bigint IS NULL
             OR %(revenue)s::bigint <= cond.max_revenue)
        AND (cond.min_biz_months IS NULL OR %(months)s >= cond.min_biz_months)
        AND (cond.max_biz_months IS NULL OR %(months)s <= cond.max_biz_months)
      )
    )
"""

# 공고별 상위 청크만 남긴다. 상위 N청크가 소수 공고에 몰리는 것을 막는다.
PASSED_SQL = f"""
WITH ranked AS (
    SELECT c.support_program_id,
           c.content,
           c.chunk_index,
           c.embedding <=> %(vec)s::vector AS distance,
           ROW_NUMBER() OVER (
               PARTITION BY c.support_program_id
               ORDER BY c.embedding <=> %(vec)s::vector
           ) AS rn
    FROM program_chunk c
)
SELECT sp.id AS program_id,
       sp.pblanc_id,
       sp.pblanc_nm,
       sp.type,
       cond.llm_conditions,
       MIN(r.distance) AS best_distance,
       -- 고르는 것은 유사도(rn), 싣는 것은 문서 순서(chunk_index).
       -- 유사도 순으로 실으면 3페이지 문장이 1페이지 문장보다 앞에 온다.
       array_agg(r.content ORDER BY r.chunk_index) AS chunks
FROM support_program sp
JOIN ranked r ON r.support_program_id = sp.id AND r.rn <= {CHUNKS_PER_PROGRAM}
LEFT JOIN program_condition cond ON cond.support_program_id = sp.id
WHERE {FILTER_SQL}
GROUP BY sp.id, sp.pblanc_id, sp.pblanc_nm, sp.type, cond.llm_conditions
ORDER BY best_distance
"""

# 탈락 공고. 사유를 만들 수 있게 조건 값을 그대로 가져온다.
REJECTED_SQL = f"""
SELECT sp.id AS program_id,
       sp.pblanc_id,
       sp.pblanc_nm,
       sp.end_date,
       cond.nationwide,
       cond.region_sido,
       cond.target_scale,
       cond.max_revenue,
       cond.min_biz_months,
       cond.max_biz_months
FROM support_program sp
LEFT JOIN program_condition cond ON cond.support_program_id = sp.id
WHERE NOT ({FILTER_SQL})
ORDER BY sp.pblanc_nm
"""

# 안전장치. 무관한 질의에 억지 결과를 주지 않으려는 상한이다.
#
# 0.55 였을 때 질의 4개가 결과 0건이었다. 정답이 2~3위에 있었는데도 그랬다.
# LEAST(min + MARGIN, MAX) 구조라, 그 질의의 최상위 문서가 상한보다 멀면
# 통과 조건이 수학적으로 불가능해진다. 어려운 질의일수록 전부 죽는 장치였다.
#
# 최소거리만으로는 실제 질의(0.557~0.607)와 무관 질의(0.565~0.890)가 겹쳐
# 완전히 가르는 값이 없다. 그래서 최적값이 아니라 거래 조건으로 골랐다.
#   0.55 → 협의 Recall 0.750 / 광의 Precision 0.632 / 무관 누출 0건
#   0.68 → 1.000 / 0.692 / 2건        ← 여기. 0.72 부터 누출만 는다
# 빈 화면이 엉뚱한 결과보다 나쁘다고 보고 누출 2건을 샀다.
# 측정은 scripts/search_diag.py, 근거는 docs/06_search_quality.md.
MAX_DISTANCE = 0.68

# 질의마다 거리 분포가 통째로 움직인다(최솟값 0.32~0.47).
# 최상위 기준 상대 여유를 둬 분포를 따라가게 한다. 근거는 docs/06_search_quality.md.
DISTANCE_MARGIN = 0.1

# 질의 문장으로만 찾는다. 사업자 정보도 정형 필터도 쓰지 않는다.
# 자격 판정은 마이데이터 연동 때 이미 계산해 저장했으므로 여기서는 고르기만 한다.
#
# 마감 공고는 여기서 뺀다. 결과가 보통 한 자릿수라, 마감 건이 cutoff 의
# 최솟값과 LIMIT 예산을 먹으면 체감 결과가 반으로 준다.
TEXT_SEARCH_SQL = """
SELECT c.support_program_id AS program_id,
       MIN(c.embedding <=> %(vec)s::vector) AS distance
FROM program_chunk c
JOIN support_program sp ON sp.id = c.support_program_id
WHERE (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
  AND NOT (sp.pblanc_id = ANY(%(advisory)s))
GROUP BY c.support_program_id
ORDER BY distance
"""

# 안내문서. 사업이 아니라 제도 설명·목록이라 신청 대상이 없다.
#
# `117016` 중기부 통합공고는 그 해 모든 지원사업을 한 문서에 나열한다. 그래서
# 어떤 드문 용어를 찾든 걸린다. 평가셋 60개 중 19개 질의의 상위 10에 끼었다.
# 사용자에게는 신청할 수 없는 문서이므로 자리만 차지한다.
#
# 지금은 두 건을 이름으로 뺀다. 일반 규칙(제목 패턴, sp.type)은 실제 공고를
# 같이 날릴 위험이 있어 쓰지 않았다. 근거는 docs/06_search_quality.md.
ADVISORY = ("PBLN_000000000117016", "PBLN_000000000092578")

# 어휘 검색(BM25). 벡터가 놓치는 고유명사·키워드 질의를 줍는다.
#
# 단독으로는 손해다. 후보를 넓히는 만큼 잡음이 들어와 Precision 이 떨어진다.
# 뒤의 재정렬이 그 잡음을 걸러낼 때만 이득이 된다. 둘은 한 쌍이다.
#
#   어휘만        키워드 R 0.944 / 광의 P 0.729 / 무관 차단 0.000
#   어휘+재정렬   키워드 R 0.972 / 광의 P 0.857 / 무관 차단 1.000

# 융합 방식. "append" 는 벡터 결과를 그대로 두고 어휘가 찾은 것만 뒤에 붙인다.
# "rrf" 는 두 순위의 역수를 가중 합산한다(LangChain EnsembleRetriever 와 같은 방식).
#
# **재서 append 를 골랐다.** 재정렬 필터가 없던 시절에 rrf 가 손해였고
# (광의 P 0.900 → 0.733), 필터가 생긴 뒤 다시 쟀더니 여전히 손해다:
#
#              협의 R (제목/본문/키워드)   광의 P (제목/본문/키워드)
#   append     1.000 / 0.719 / 0.972      0.855 / 0.691 / 0.852
#   rrf(0.7:0.3) 1.000 / 0.625 / 0.972    0.855 / 0.691 / 0.852
#
# 광의는 완전히 같고 **본문 협의만 떨어진다.** RRF 는 순위만 보고 거리를
# 버리기 때문이다. 본문 질의의 정답은 벡터 3~8위에 애매하게 걸려 있는데,
# 어휘 1위(대개 다른 공고)가 0.3/61 을 받아 그 사이로 끼어들면 정답이 k 밖으로
# 밀린다. append 는 벡터 순위를 보존하므로 그 밀림이 없다.
#
# 가중치를 벡터 쪽으로 더 기울이면 결국 append 에 수렴하므로 더 잴 값이 없다.
# rrf 경로는 남겨 뒀다. 지우면 다음 사람이 다시 제안하고 같은 측정을 반복한다.
FUSION = "append"   # "append" 또는 "rrf"
RRF_K = 60          # RRF 표준 상수. 상위 순위 간 차이를 완만하게 만든다
RRF_W_VEC = 0.7     # 벡터 가중치. 문서 예시(0.7 : 0.3)를 따랐다
RRF_W_LEX = 0.3

LEX_MIN = 4.0       # 벡터가 뭔가 찾았을 때의 문턱
LEX_ONLY_MIN = 3.0  # 벡터가 빈손일 때의 문턱
LEX_TOP = 10        # 어휘 쪽에서 가져올 최대 건수


# 재정렬에 넣을 본문. 제목만으로는 부족하고 전량은 느리다.
RERANK_CHUNKS = 3

# 이 점수 아래는 아예 버린다(0~3 척도). 0 이면 버리지 않는다.
#
# **재정렬의 값은 정렬이 아니라 여기에 있다.** 처음에는 순서만 바꿨고, 그때는
# 후보가 이미 깨끗해서 고칠 것이 없어 망가뜨리기만 했다("재정렬은 손해"라고
# 결론 냈다). 어휘 검색으로 후보를 넓힌 뒤 버리게 하자 전부 뒤집혔다.
#
#   본문 질의 Precision  0.410 → 0.711
#   무관 질의 차단       0.500 → 1.000   (거리로는 못 가르던 것을 읽고 가른다)
#
# 1 은 "전혀 관련 없다"만 버리고 2 는 "분야만 겹친다"까지 버린다. 2 가 낫다.
# 대가로 맞는 공고도 가끔 잘린다("해외 전시회" 1.00 → 0.50).
RERANK_MIN = 2.0
RERANK_SQL = f"""
WITH ranked AS (
    SELECT c.support_program_id,
           c.content,
           c.chunk_index,
           ROW_NUMBER() OVER (
               PARTITION BY c.support_program_id
               ORDER BY c.embedding <=> %(vec)s::vector
           ) AS rn
    FROM program_chunk c
    WHERE c.support_program_id = ANY(%(ids)s)
)
SELECT sp.id AS program_id,
       sp.pblanc_nm,
       array_agg(r.content ORDER BY r.chunk_index) AS chunks
FROM support_program sp
JOIN ranked r ON r.support_program_id = sp.id AND r.rn <= {RERANK_CHUNKS}
GROUP BY sp.id, sp.pblanc_nm
"""


# 문서 앞에서 무조건 가져올 청크 수. 유사도와 무관하게 싣는다.
#
# **유사도로는 사업 내용이 안 뽑힌다.** 프로필 벡터는 업종·매출액·근로자수로
# 만들어지는데, 공고 끝에 붙는 중소기업기본법 별표가 정확히 그 세 항목으로만
# 이뤄져 있다. 그래서 붙임 표가 상위를 쓸어간다. 실측(scripts/chunk_overlap.py):
#
#   122273 "찾아가는 1:1 디지털 교육"
#     #0~#24  고유 — 사업 개요·지원 내용·제출 서류·선정 평가
#     #25~#40 공용 — 별표3 + 지원제외업종 표 (다른 공고 26건과 동일)
#     상위 12청크: 전부 #20 이후 → **사업 내용을 한 글자도 읽지 않는다**
#
# 공고 문서는 개요가 맨 앞에 온다. 그래서 앞 N개를 조건 없이 싣는다.
#
# **처음 켰을 때는 효과가 없어 0으로 껐다가, 프롬프트를 고치고 다시 켰다.**
# 앞 청크를 넣으니 입력에 사업 내용이 들어오기는 했는데(122273 입력 4,421 →
# 5,591토큰, 비용 +25%) 출력은 그대로 요건 나열이었다. 병목이 청크가 아니라
# 프롬프트였다 — 설명에 사업 내용을 묻지 않으니 들어와도 쓰지 않는다.
#
# 지금은 프롬프트가 마지막 문장에서 사업 내용을 원문 그대로 인용하게 한다.
# 그래서 이 청크가 필요해졌다. **둘 중 하나만 바꾸면 효과가 없다.**
#
# 남아 있는 근본 원인은 따로다. 공고 간 중복 문단이 청크의 17.8%(911/5,119)를
# 차지하고 판정 입력도 같이 오염시킨다(scripts/chunk_overlap.py). 적재 단계에서
# 걸러야 하는데 임계값 재측정이 따라온다.
LEAD_CHUNKS = 2

# 설명에 실을 청크 수. 판정(CHUNKS_PER_PROGRAM)과 따로 둔다.
#
# 비용이 여기 걸려 있다. 건당 11.9크레딧 중 **97%가 입력**이고, 그 입력의
# 대부분이 청크다(예: 고용보험료 공고 4,643토큰 중 약 3,900).
#
# **판정보다 적게 보면 원칙을 깎는 것이다.** 판정을 가른 근거가 9번 청크에
# 있었다면 설명은 그것을 말하지 못한다. 다만 유사도 순으로 자르므로 중요한
# 것부터 남고, 지금 프롬프트는 근거를 하나만 말하게 하므로 손실이 작을 수 있다.
#
# 골든셋 6쌍 × 2회로 3·6·12 를 재봤다.
#
#   청크  건당 크레딧   판정과 어긋난 설명
#     3       6.1            0
#     6       8.0            0
#    12      11.9            0
#
# 품질 차이는 보이지 않았고 비용은 절반이 된다. 그래서 3 으로 둔다.
#
# **다만 근거가 약하다.** 6쌍 중 3쌍은 공고 자체가 4청크 이하라 개수를 줄여도
# 입력이 그대로다 — 실제로 비교된 것은 3쌍뿐이다. 그 3쌍에서 본 문장 차이도
# 실행 간 흔들림과 구분되지 않았다(같은 입력을 두 번 돌려도 문장이 달라진다.
# temperature=0 이어도 그렇다). 평가셋이 생기면 다시 재야 하는 값이다.
EXPLAIN_CHUNKS = 3

# 공고 하나만 다시 꺼낸다. 설명 생성(app/rag/explain.py)이 쓴다.
#
# **판정이 본 청크를 빠뜨리지 않아야 한다.** 판정이 못 본 대목만으로 설명하면
# 둘이 어긋난다. 그래서 정렬 기준(프로필 벡터)과 개수(CHUNKS_PER_PROGRAM)를
# PASSED_SQL 과 똑같이 맞추고, 거기에 앞 청크를 **더한다.** 더 보는 것은
# 어긋남을 만들지 않는다. 선택이 결정론적이라 저장할 필요가 없다 — 오히려
# 저장하면 프로필이 바뀌었을 때 옛 청크로 설명하게 된다.
ONE_PROGRAM_SQL = f"""
WITH ranked AS (
    SELECT c.content,
           c.chunk_index,
           c.embedding <=> %(vec)s::vector AS distance,
           ROW_NUMBER() OVER (
               ORDER BY c.embedding <=> %(vec)s::vector
           ) AS rn
    FROM program_chunk c
    WHERE c.support_program_id = %(pid)s
)
SELECT sp.id AS program_id,
       sp.pblanc_id,
       sp.pblanc_nm,
       sp.type,
       cond.llm_conditions,
       -- 거리는 판정이 고른 것만으로 잰다. 앞 청크는 유사도와 무관하게
       -- 실은 것이라 여기 섞이면 공고가 실제보다 멀어 보인다.
       MIN(r.distance) FILTER (WHERE r.rn <= %(n)s) AS best_distance,
       array_agg(r.content ORDER BY r.chunk_index) AS chunks
FROM support_program sp
LEFT JOIN program_condition cond ON cond.support_program_id = sp.id
JOIN ranked r ON r.rn <= %(n)s
             OR r.chunk_index < %(lead)s
WHERE sp.id = %(pid)s
GROUP BY sp.id, sp.pblanc_id, sp.pblanc_nm, sp.type, cond.llm_conditions
"""


@dataclass
class ProgramHit:
    program_id: int
    pblanc_id: str
    title: str
    type: str
    best_distance: float
    chunks: list[str]
    llm_conditions: dict | None


@dataclass
class RejectedProgram:
    program_id: int
    pblanc_id: str
    title: str
    reason: str


@dataclass
class SearchResult:
    query_text: str
    industry_name: str
    std_excluded: bool
    hits: list[ProgramHit]
    rejected: list[RejectedProgram] = field(default_factory=list)


async def lookup_industry(business_code: str) -> tuple[str, bool]:
    """업종 코드 → (이름, 표준제외업종 여부)."""
    async with db.acquire() as conn:
        cur = await conn.execute(
            "SELECT name, is_std_excluded FROM minor_code WHERE code = %s",
            (business_code,),
        )
        row = await cur.fetchone()
    if row is None:
        raise ValueError(f"알 수 없는 업종 코드: {business_code}")
    return row["name"], row["is_std_excluded"]


def _reject_reason(row: dict, *, region: str, employee_count: int,
                   months: int, revenue: int | None, is_prestartup: bool = False) -> str:
    """SQL 탈락 사유를 문장으로. LLM을 부르지 않는다."""
    if row["end_date"] and row["end_date"] < date.today():
        return f"접수가 마감되었습니다 ({row['end_date']})"
    if not row["nationwide"] and row["region_sido"] and row["region_sido"] != region:
        return f"{row['region_sido']} 소재 사업자만 신청할 수 있습니다 (현재 {region})"
    scale = row["target_scale"]
    if scale == "소공인":
        return "제조업 기반 소공인만 신청할 수 있습니다"
    if scale == "소상공인" and employee_count >= 5:
        return f"상시근로자 5인 미만이어야 합니다 (현재 {employee_count}명)"
    if row["max_revenue"] and revenue and revenue > row["max_revenue"]:
        return (f"연매출 {row['max_revenue'] / 100_000_000:.1f}억원 이하여야 합니다 "
                f"(현재 {revenue / 100_000_000:.1f}억원)")
    if row["min_biz_months"] and months < row["min_biz_months"]:
        if is_prestartup:
            return (f"이미 창업한 사업자만 신청할 수 있습니다 "
                    f"(업력 {row['min_biz_months']}개월 이상 필요)")
        return (f"업력 {row['min_biz_months']}개월 이상이어야 합니다 "
                    f"(현재 {months}개월)")
    if row["max_biz_months"] and months > row["max_biz_months"]:
        return (f"업력 {row['max_biz_months']}개월 이하여야 합니다 "
                f"(현재 {months}개월)")
    return "신청 자격에 해당하지 않습니다"


async def search(
    *,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date | None = None,
    annual_revenue: int | None = None,
    is_prestartup: bool = False,
    with_rejected: bool = False,
) -> SearchResult:
    """검색 질의문·업종명·후보 공고를 돌려준다.

    with_rejected=True 면 SQL에서 탈락한 공고도 사유와 함께 담는다.
    """
    industry_name, std_excluded = await lookup_industry(business_code)

    query_text = profile.to_query(
        region=region,
        address=address,
        business_name=industry_name,
        business_code=business_code,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        is_prestartup=is_prestartup
    )
    # 임베딩은 CPU 를 오래 잡는다. 이벤트 루프를 막으면 같이 도는
    # /rag/search-text 의 "1초 미만" 전제가 깨진다.
    vector = await asyncio.to_thread(koe5.embed_query, query_text)
    months = 0 if is_prestartup else profile.biz_months(open_date)
    params = {
        "vec": vector,
        "region": region,
        "employee_count": employee_count,
        "revenue": annual_revenue,
        "months": months,
    }

    async with db.acquire() as conn:
        cur = await conn.execute(PASSED_SQL, params)
        rows = await cur.fetchall()

        rejected: list[RejectedProgram] = []
        if with_rejected:
            cur = await conn.execute(REJECTED_SQL, {k: v for k, v in params.items()
                                                    if k != "vec"})
            for r in await cur.fetchall():
                rejected.append(RejectedProgram(
                    program_id=r["program_id"],
                    pblanc_id=r["pblanc_id"],
                    title=r["pblanc_nm"],
                    reason=_reject_reason(r, region=region,
                                          employee_count=employee_count,
                                          months=months, revenue=annual_revenue),
                ))

    hits = [
        ProgramHit(
            program_id=row["program_id"],
            pblanc_id=row["pblanc_id"],
            title=row["pblanc_nm"],
            type=row["type"],
            best_distance=row["best_distance"],
            chunks=row["chunks"],
            llm_conditions=row["llm_conditions"],
        )
        for row in rows
    ]

    logger.info("검색: 후보 %d공고 / 탈락 %d공고", len(hits), len(rejected))
    return SearchResult(
        query_text=query_text,
        industry_name=industry_name,
        std_excluded=std_excluded,
        hits=hits,
        rejected=rejected,
    )


async def hit_for_program(
    program_id: int,
    *,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date | None = None,
    annual_revenue: int | None = None,
    is_prestartup: bool = False,
) -> tuple[ProgramHit | None, str, bool]:
    """공고 하나를 프로필 기준으로 다시 꺼낸다. (공고, 업종명, 융자제외여부).

    search() 와 같은 프로필 문장을 임베딩하므로 판정 때와 같은 청크가 나온다.
    공고가 없거나 청크가 없으면 첫 값이 None 이다.
    """
    industry_name, std_excluded = await lookup_industry(business_code)
    query_text = profile.to_query(
        region=region,
        address=address,
        business_name=industry_name,
        business_code=business_code,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        is_prestartup=is_prestartup,
    )
    vector = await asyncio.to_thread(koe5.embed_query, query_text)

    async with db.acquire() as conn:
        # 개수를 SQL 문자열이 아니라 파라미터로 넘긴다. 스윕할 때 모듈 값만
        # 갈아끼우면 되고, SQL 을 다시 만들 필요가 없다.
        cur = await conn.execute(ONE_PROGRAM_SQL, {
            "vec": vector, "pid": program_id,
            "n": EXPLAIN_CHUNKS, "lead": LEAD_CHUNKS,
        })
        row = await cur.fetchone()

    if row is None:
        return None, industry_name, std_excluded
    return ProgramHit(
        program_id=row["program_id"],
        pblanc_id=row["pblanc_id"],
        title=row["pblanc_nm"],
        type=row["type"],
        best_distance=row["best_distance"],
        chunks=row["chunks"],
        llm_conditions=row["llm_conditions"],
    ), industry_name, std_excluded


async def search_by_text(*, query: str, top_k: int = 20,
                         rerank: bool = False,
                         hybrid: bool = False) -> list[dict]:
    """질의 문장으로 공고를 찾는다. LLM을 부르지 않는다.

    /rag/recommend 와 성격이 다르다. 저 쪽은 사업자 프로필로 전량을 판정하고
    여기는 "질의 ↔ 공고" 유사도만 본다. 판정을 붙이는 것은 백엔드의 몫이다.
    설계 근거는 docs/02_api_contract.md.
    """
    # 임베딩은 CPU 를 오래 잡는다. 이벤트 루프를 막지 않도록 스레드로 뺀다.
    vector = await asyncio.to_thread(koe5.embed_query, query)

    async with db.acquire() as conn:
        cur = await conn.execute(TEXT_SEARCH_SQL,
                                 {"vec": vector, "advisory": list(ADVISORY)})
        rows = await cur.fetchall()
    if not rows:
        return []

    # 컷오프는 파이썬에서 건다. 어휘 검색과 합치려면 잘리기 전 순위가 필요하다.
    limit = min(rows[0]["distance"] + DISTANCE_MARGIN, MAX_DISTANCE)
    dist = {r["program_id"]: r["distance"] for r in rows}
    passed = [r["program_id"] for r in rows if r["distance"] <= limit][:top_k]

    lex: dict[int, float] = {}
    if hybrid:
        # 기본이 꺼짐이라 기동 시에는 색인을 만들지 않는다. 켠 요청이
        # 처음 들어올 때 한 번 짓는다(수 초). 그 뒤로는 메모리에 남는다.
        if not lexical.ready():
            await lexical.build(ADVISORY)

        # 벡터가 빈손이면 문턱을 올린다.
        #
        # 처음에는 "벡터가 빈손이면 어휘도 돌리지 않는다"로 막았다. 무관 질의
        # ("어제 야구 경기 결과")가 [경기] 태그에 걸려 공고를 끌어오는 것을
        # 막으려는 것이었다. 그런데 그 조건이 **어휘 검색이 가장 잘하는 경우**를
        # 같이 막았다. "키오스크"·"CCTV"·"HACCP" 은 본문에 그대로 있는데도
        # 벡터 최소거리가 0.68 을 넘어 결과가 0건이 된다.
        #
        # 그래서 막는 기준을 "벡터가 찾았나"가 아니라 "어휘 점수가 충분한가"로
        # 바꿨다. 드문 단어가 정확히 맞으면 점수가 높고, 걸리는 것이 없으면 낮다.
        floor = LEX_MIN if passed else LEX_ONLY_MIN
        lex = {p: s for p, s in lexical.search(query, LEX_TOP).items()
               if s >= floor and p not in set(passed)}

    if FUSION == "rrf" and lex:
        vec_rank = {p: i for i, p in enumerate(passed)}
        lex_rank = {p: i for i, p in enumerate(sorted(lex, key=lambda p: -lex[p]))}

        def rrf(p: int) -> float:
            s = 0.0
            if p in vec_rank:
                s += RRF_W_VEC / (RRF_K + vec_rank[p])
            if p in lex_rank:
                s += RRF_W_LEX / (RRF_K + lex_rank[p])
            return s

        order = sorted(set(passed) | set(lex),
                       key=lambda p: (-rrf(p), dist[p]))[:top_k]
    else:
        # 기본. 벡터 결과를 그대로 두고 어휘가 찾은 것만 뒤에 붙인다.
        order = (passed + sorted(lex, key=lambda p: -lex[p]))[:top_k]

    if lex:
        logger.info("텍스트 검색: %r → 벡터 %d + 어휘 %d공고",
                    query, len(passed), len(lex))
    else:
        logger.info("텍스트 검색: %r → %d공고", query, len(passed))

    out = [{"program_id": p,
            "distance": round(dist[p], 4),
            "lexical": round(lex[p], 2) if p in lex else None}
           for p in order]
    return await _rerank(query, out, vector) if rerank else out


async def _rerank(query: str, out: list[dict], vector: list[float]) -> list[dict]:
    """Jev 가 순서를 다시 매긴다. 근거와 측정치는 app/rag/rerank.py."""
    if not out:
        return out
    ids = [r["program_id"] for r in out]
    async with db.acquire() as conn:
        cur = await conn.execute(RERANK_SQL, {"vec": vector, "ids": ids})
        docs = {r["program_id"]: (r["pblanc_nm"], r["chunks"])
                for r in await cur.fetchall()}

    scores = await rerank_mod.rerank(query, docs)
    for item in out:
        sc = scores.get(item["program_id"])
        item["relevance"] = round(sc[0], 2) if sc else None
        item["rerank_confidence"] = round(sc[1], 3) if sc else None

    # 점수 없는 건(호출 실패)은 뒤로 보내되 원래 순서를 지킨다.
    out.sort(key=lambda x: (-(x["relevance"] if x["relevance"] is not None else -1),
                            x["distance"]))
    before = len(out)
    if RERANK_MIN > 0:
        # 호출 실패(relevance=None)는 버리지 않는다. 모르는 것과 무관한 것은 다르다.
        out = [r for r in out
               if r["relevance"] is None or r["relevance"] >= RERANK_MIN]
    logger.info("재정렬: %d건 중 %d건 채점, %d건 남김",
                before, len(scores), len(out))
    return out