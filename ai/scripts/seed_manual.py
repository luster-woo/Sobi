"""검색 동작 확인용 수동 시드. 골든셋 P05(경북 안동 제과점) 기준 5건.

적재 파이프라인(티켓 E) 완성 전까지 쓰는 임시 데이터다.

    python scripts/seed_manual.py
"""

import sys
from pathlib import Path

import psycopg
from pgvector.psycopg import register_vector

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core import config
from app.rag.embedding import koe5

# (pblanc_id, 제목, 주관, 수행, 유형, 마감일, 정형조건, llm조건, 청크본문들)
SEED = [
    {
        "pblanc_id": "PBLN_000000000121646",
        "title": "[경북] 안동시 2026년 소상공인 카드수수료 지원사업 참여점포 모집 공고",
        "jrsdinstt": "경상북도", "excinstt": "경상북도경제진흥원",
        "type": "지원금", "end_date": None,   # 예산 소진시까지
        "cond": {"nationwide": False, "region_sido": "경북", "target_scale": "소상공인",
                 "std_exclusion": True, "max_revenue": 400_000_000,
                 "min_biz_months": None, "max_biz_months": None},
        "llm": [{"category": "region", "text": "사업자등록증상 소재지가 안동시인 소상공인", "mode": "필수"}],
        "chunks": [
            "경상북도경제진흥원에서 국내외 경기침체로 어려움을 겪는 소상공인을 위한 "
            "카드수수료 지원사업 참여점포를 모집합니다. 전년도 카드매출액의 0.4~1.0%를 "
            "업체당 최저 10만원 최대 100만원 한도로 지원합니다.",
            "지원대상은 전년도(2025년) 연매출액 4억원 이하인 소상공인으로, 사업자등록증상 "
            "소재지가 안동시여야 합니다. 매출액은 부가가치세과세표준증명원 또는 "
            "면세사업자수입금액증명원을 기준으로 합니다. 붙임의 지원 제한 업종에 해당하는 "
            "경우 신청할 수 없습니다.",
        ],
    },
    {
        "pblanc_id": "PBLN_000000000125962",
        "title": "[경북] 2026년 상인ㆍ소상공인 AI코칭 지원사업 참여자 모집 연장공고",
        "jrsdinstt": "경상북도", "excinstt": "경상북도경제진흥원",
        "type": "기타", "end_date": None,
        "cond": {"nationwide": False, "region_sido": "경북", "target_scale": "소상공인",
                 "std_exclusion": False, "max_revenue": None,
                 "min_biz_months": None, "max_biz_months": None},
        "llm": [{"category": "region", "text": "경주시·안동시·울진군·예천군·청송군 5개 시군 소재", "mode": "필수"}],
        "chunks": [
            "경상북도 상인 및 소상공인을 대상으로 AI 활용 역량 강화를 위한 코칭을 "
            "지원합니다. 블로그 포스트 작성, 상세페이지 제작, 사진 편집 등 AI 도구 "
            "활용 교육과 API 비용을 지원합니다.",
            "참여 대상은 경상북도 내 경주시, 안동시, 울진군, 예천군, 청송군 5개 시군에 "
            "소재한 상인 및 소상공인입니다. 신청은 이메일로 접수하며 접수 확인 전화가 "
            "필수입니다.",
        ],
    },
    {
        "pblanc_id": "PBLN_000000000123334",
        "title": "2026년 소상공인 무료 법률ㆍ세무ㆍ노무 간편상담 지원사업 모집 공고",
        "jrsdinstt": "중소벤처기업부", "excinstt": "소상공인연합회",
        "type": "기타", "end_date": "2026-11-30",
        "cond": {"nationwide": True, "region_sido": None, "target_scale": "소상공인",
                 "std_exclusion": False, "max_revenue": None,
                 "min_biz_months": None, "max_biz_months": None},
        "llm": [],
        "chunks": [
            "중소벤처기업부와 소상공인연합회가 소상공인의 경영 현장 애로사항 해결을 위해 "
            "소상공인 간편상담센터를 운영합니다. 법률, 세무, 노무 분야 전문가가 1:1 "
            "맞춤형 무료 상담을 전화 및 서면으로 제공합니다.",
            "소상공인이라면 누구나 신청할 수 있습니다. 임대차 문제, 상권 분쟁 해결, "
            "세무신고와 절세 전략, 근로계약과 퇴직금, 4대보험, 상표 등 지식재산권, "
            "가업승계 등을 상담합니다. 온라인 네이버폼으로 접수합니다.",
        ],
    },
    # --- 아래 2건은 SQL 필터를 통과하지만 LLM이 걸러야 하는 케이스 ---
    {
        "pblanc_id": "PBLN_000000000126215",
        "title": "[경북] 봉화군 2026년 소상공인 카드수수료 지원사업 참여점포 모집 변경 공고",
        "jrsdinstt": "경상북도", "excinstt": "경상북도경제진흥원",
        "type": "지원금", "end_date": "2026-11-30",
        "cond": {"nationwide": False, "region_sido": "경북", "target_scale": "소상공인",
                 "std_exclusion": True, "max_revenue": 300_000_000,
                 "min_biz_months": None, "max_biz_months": None},
        "llm": [{"category": "region", "text": "사업자등록증상 소재지가 봉화군인 소상공인", "mode": "필수"}],
        "chunks": [
            "경상북도경제진흥원에서 소상공인 카드수수료 지원사업 참여점포를 모집합니다. "
            "전년도 카드매출액의 0.4%를 업체당 최저 5만원 최대 40만원 이내로 지원합니다.",
            "지원대상은 전년도(2025년) 연매출액 3억원 이하이면서 사업자등록증상 소재지가 "
            "봉화군인 소상공인입니다. 온라인 행복카드 홈페이지 또는 읍면동 행정복지센터, "
            "봉화군 소상공인연합회에서 접수합니다.",
        ],
    },
    {
        "pblanc_id": "PBLN_000000000126261",
        "title": "[경북] 김천시 2026년 하반기 소상공인 새바람 체인지업(점포개선) 사업 모집 공고",
        "jrsdinstt": "경상북도", "excinstt": "경상북도경제진흥원",
        "type": "지원금", "end_date": "2026-09-23",
        "cond": {"nationwide": False, "region_sido": "경북", "target_scale": "소상공인",
                 "std_exclusion": False, "max_revenue": None,
                 "min_biz_months": 36, "max_biz_months": None},
        "llm": [{"category": "region", "text": "김천시 관내 소상공인", "mode": "필수"}],
        "chunks": [
            "경상북도경제진흥원에서 도내 소상공인의 활력 제고를 위해 분야별 컨설팅을 "
            "제공하고 경영환경개선을 지원합니다. 컨설팅은 필수이며 옥외 간판교체, "
            "점포환경 개선, 시스템 개선을 지원합니다.",
            "지원대상은 김천시 관내 창업 3년 이상인 소상공인으로, 업력은 공고일 기준 "
            "사업자등록증에 기재된 개업일로 산정합니다. 온라인 모이소 앱 또는 방문·우편으로 "
            "접수합니다.",
        ],
    },
]

UPSERT_PROGRAM = """
INSERT INTO support_program
    (pblanc_id, pblanc_nm, jrsdinstt_nm, excinstt_nm, type, end_date, bsns_sumry_cn)
VALUES (%(pblanc_id)s, %(title)s, %(jrsdinstt)s, %(excinstt)s, %(type)s, %(end_date)s, %(sumry)s)
ON CONFLICT (pblanc_id) DO UPDATE SET
    pblanc_nm = EXCLUDED.pblanc_nm,
    type = EXCLUDED.type,
    end_date = EXCLUDED.end_date,
    bsns_sumry_cn = EXCLUDED.bsns_sumry_cn
RETURNING id
"""

UPSERT_CONDITION = """
INSERT INTO program_condition
    (support_program_id, nationwide, region_sido, target_scale, std_exclusion,
     max_revenue, min_biz_months, max_biz_months, llm_conditions, source, extracted_at)
VALUES (%(pid)s, %(nationwide)s, %(region_sido)s, %(target_scale)s, %(std_exclusion)s,
        %(max_revenue)s, %(min_biz_months)s, %(max_biz_months)s, %(llm)s, 'llm', NOW())
ON CONFLICT (support_program_id) DO UPDATE SET
    nationwide = EXCLUDED.nationwide,
    region_sido = EXCLUDED.region_sido,
    target_scale = EXCLUDED.target_scale,
    std_exclusion = EXCLUDED.std_exclusion,
    max_revenue = EXCLUDED.max_revenue,
    min_biz_months = EXCLUDED.min_biz_months,
    max_biz_months = EXCLUDED.max_biz_months,
    llm_conditions = EXCLUDED.llm_conditions,
    source = 'llm',
    extracted_at = NOW()
"""

INSERT_CHUNK = """
INSERT INTO program_chunk
    (support_program_id, chunk_index, content, embedding, token_count, metadata)
VALUES (%s, %s, %s, %s, %s, %s)
"""


def main() -> None:
    import json

    tokenizer = koe5.get_model().tokenizer

    with psycopg.connect(config.DATABASE_URL) as conn:
        register_vector(conn)
        for item in SEED:
            # 청크마다 제목을 헤더로 붙인다. 청크 단독으로는 어느 공고인지 알 수 없다.
            texts = [f"{item['title']}\n{c}" for c in item["chunks"]]
            vectors = koe5.embed_passages(texts)

            with conn.cursor() as cur:
                cur.execute(UPSERT_PROGRAM, {**item, "sumry": item["chunks"][0]})
                pid = cur.fetchone()[0]

                cur.execute(UPSERT_CONDITION, {
                    "pid": pid, **item["cond"],
                    "llm": json.dumps({"conditions": item["llm"]}, ensure_ascii=False),
                })

                cur.execute("DELETE FROM program_chunk WHERE support_program_id = %s", (pid,))
                for i, (text, vec) in enumerate(zip(texts, vectors)):
                    cur.execute(INSERT_CHUNK, (
                        pid, i, text, vec,
                        len(tokenizer.encode(text)),
                        json.dumps({"pblanc_id": item["pblanc_id"], "title": item["title"]},
                                   ensure_ascii=False),
                    ))
            conn.commit()
            print(f"OK  {item['pblanc_id']}  청크 {len(texts)}개  {item['title'][:40]}")

    print(f"\n{len(SEED)}건 적재 완료")


if __name__ == "__main__":
    main()