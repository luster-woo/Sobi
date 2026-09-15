"""공고 본문에서 자격 조건·필요 서류를 LLM으로 추출해 DB에 적재한다.

공고당 GMS 1회 호출. 실패 시 hashtags 폴백(source='tag').

    python scripts/extract_conditions.py
    python scripts/extract_conditions.py --limit 5 --force
"""

import argparse
import asyncio
import json
import re
import sys
import httpx
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core import config, gms

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
TAG = re.compile(r"<[^>]+>")
MAX_BODY_CHARS = 40000
CONCURRENCY = 4

SIDO = ["서울", "부산", "대구", "인천", "대전", "울산", "세종", "경기", "강원",
        "충북", "충남", "전북", "전남광주", "경북", "경남", "제주"]

SIDO_ALIAS = {
    "전남": "전남광주", "광주": "전남광주",
    "전라남도": "전남광주", "광주광역시": "전남광주",
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
    "인천광역시": "인천", "대전광역시": "대전", "울산광역시": "울산",
    "세종특별자치시": "세종", "세종시": "세종",
    "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원",
    "충청북도": "충북", "충청남도": "충남", "전라북도": "전북",
    "전북특별자치도": "전북", "경상북도": "경북", "경상남도": "경남",
    "제주특별자치도": "제주", "제주도": "제주",
}

TITLE_TAG = re.compile(r"^\s*\[([^\]]+)\]")

SYSTEM_PROMPT = f"""\
너는 소상공인 정부지원사업 공고문에서 신청 자격과 필요 서류를 추출한다.

## 절대 규칙
확실하지 않으면 null을 쓴다. 틀린 값보다 null이 낫다.
검색 시스템이 "값이 null이면 통과"로 처리하므로, 잘못 채우면 자격 있는
사업자가 탈락한다.

## 정형 필드

nationwide: 전국 대상이면 true, 특정 지역 한정이면 false
region_sido: 다음 16개 중 하나 또는 null
  서울 부산 대구 인천 대전 울산 세종 경기 강원 충북 충남 전북 전남광주 경북 경남 제주
  - 전라남도·광주광역시는 둘 다 "전남광주"로 쓴다. "전남"이나 "광주"라고만 쓰지 않는다
  - **신청 자격에 "~에 소재한 사업자"처럼 지역 제한이 명시된 경우에만 채운다**
  - **수행기관 소재지, 지원 시설·센터의 위치, 행사 장소, 사업명에 들어간
    지명은 지역 제한이 아니다.** 예) "소담스퀘어 in 부산"은 시설 위치일 뿐
    전국 소상공인이 신청할 수 있으므로 nationwide=true, region_sido=null
  - 공고문에 "관내"·"도내"로만 쓰여 있으면 주관기관으로 판단한다
  - 판단이 서지 않으면 nationwide=true, region_sido=null 로 둔다
    - **"우대"·"가점"·"우선 선정" 대상 지역은 제한이 아니다.** 전국 사업으로 보고
    nationwide=true, region_sido=null 로 둔 뒤, llm_conditions에
    category "region", mode "우대"로 기록한다
    예) "경상북도 소재 소상공인 우대" → nationwide=true, region_sido=null
  - region_sido를 채우는 것은 "~에 소재한 사업자만 신청 가능"처럼
    해당 지역이 아니면 신청 자체가 불가능한 경우뿐이다
std_exclusion: 표준 융자제외업종 조항이 있으면 true
  - true: 유흥·도박·사행성 업종을 배제하거나, 표준산업분류 코드로 된
    제외업종 목록(붙임·별표 포함)이 있는 경우
  - false: 체납·폐업·중복수혜처럼 업종과 무관한 제외 사유만 있는 경우.
    "제외"라는 단어가 나온다고 true가 아니다
  - 이 값이 true이면 llm_conditions에도 category "industry"로 조항을 남긴다.
    조건부 허용·예외가 있으면 그 내용까지 적는다.
    예) "부동산중개업은 전체의 20% 이내로 제한하여 허용"
target_scale: "소상공인" | "소공인" | "중소기업" | "무관" | null
  - 소공인은 제조업 기반 소상공인이다. 공고가 소공인 한정이면 "소공인"
max_revenue: 연매출 상한(원 단위 정수). 없으면 null. 예) 3억원 → 300000000
min_biz_months / max_biz_months: 업력 하한·상한(개월). 없으면 null
  - "창업 3년 이상" → min 36, "창업 7년 이내" → max 84

type: 지원 방식으로 정한다
  - "지원금": 현금·비용 보전·물품·시설개선 등을 무상 지원 (보조금, 수수료 지원, 임차료 지원)
  - "대출": 융자, 이차보전, 보증. 돌려줘야 하거나 이자를 지원하는 것
  - "기타": 교육, 컨설팅, 상담, 판로·마케팅 지원 등 금전 지급이 아닌 것
min_balance / max_balance: 지원·융자 금액 하한·상한(원). 없으면 null
interest_rate: 이차보전·융자 금리(%). 없으면 null

## llm_conditions
정형 필드로 표현할 수 없는 조건만 적는다.
지역(시도)·규모·매출 상한·업력처럼 위 정형 필드에 이미 담은 조건은
여기에 다시 쓰지 않는다. 시군구·읍면동은 정형 필드가 없으므로 여기에 쓴다.
업력("창업 N년 이상/이내")은 min_biz_months·max_biz_months로만 표현하고
llm_conditions에는 쓰지 않는다.
category: "region" | "owner" | "industry" | "self_report" | "other" | "track"
  - region: 시군구·읍면동 한정 (시도는 정형 필드로 갔으므로 여기엔 세부 지역만)
  - owner: 대표자 연령·성별·자녀 등
  - industry: 필수 업종·취급 품목
  - self_report: 휴폐업·체납·중복수혜·프랜차이즈 등 본인 신고 사항
  - track: 공고 내 트랙·유형 구분
mode: "필수" | "우대"
  - 충족하지 않아도 신청할 수 있으면 "우대"다. 가점·우선선정·우대금리가 여기 해당한다

## documents
doc_name: 서류 이름
type: "제출용" | "작성용"
  - 제출용: 이미 존재하는 서류를 발급받아 낸다 (사업자등록증, 통장사본, 증명원)
  - 작성용: 빈 양식에 신청인이 채운다 (신청서, 동의서, 확약서, 사업계획서)
  - 공고에 서식·양식 번호가 붙어 있으면 작성용이다
attachment_index: 그 서류의 양식이 첨부파일 목록에 있으면 번호, 없으면 null

## 출력
아래 JSON만 출력한다. 설명을 덧붙이지 않는다.
{{"nationwide": false, "region_sido": null, "target_scale": null,
  "std_exclusion": false, "max_revenue": null,
  "min_biz_months": null, "max_biz_months": null,
  "type": "기타", "min_balance": null, "max_balance": null, "interest_rate": null,
  "llm_conditions": {{"conditions": [{{"category": "region", "text": "", "mode": "필수"}}]}},
  "documents": [{{"doc_name": "", "type": "제출용", "attachment_index": null}}]}}
"""

UPSERT_CONDITION = """
INSERT INTO program_condition
    (support_program_id, nationwide, region_sido, target_scale, std_exclusion,
     max_revenue, min_biz_months, max_biz_months, llm_conditions, source, extracted_at)
VALUES (%(pid)s, %(nationwide)s, %(region_sido)s, %(target_scale)s, %(std_exclusion)s,
        %(max_revenue)s, %(min_biz_months)s, %(max_biz_months)s, %(llm)s, %(source)s, NOW())
ON CONFLICT (support_program_id) DO UPDATE SET
    nationwide = EXCLUDED.nationwide,
    region_sido = EXCLUDED.region_sido,
    target_scale = EXCLUDED.target_scale,
    std_exclusion = EXCLUDED.std_exclusion,
    max_revenue = EXCLUDED.max_revenue,
    min_biz_months = EXCLUDED.min_biz_months,
    max_biz_months = EXCLUDED.max_biz_months,
    llm_conditions = EXCLUDED.llm_conditions,
    source = EXCLUDED.source,
    extracted_at = NOW()
"""

UPDATE_PROGRAM = """
UPDATE support_program
SET type = %(type)s, min_balance = %(min_balance)s,
    max_balance = %(max_balance)s, interest_rate = %(interest_rate)s
WHERE id = %(pid)s
"""

INSERT_DOC = """
INSERT INTO program_document (support_program_id, doc_name, type, url)
VALUES (%s, %s, %s, %s)
"""


def strip_html(html: str) -> str:
    return re.sub(r"\s+", " ", TAG.sub(" ", html or "").replace("&nbsp;", " ")).strip()


def find_body(pblanc_id: str) -> str | None:
    for path in (
        ROOT / "data/parsed" / pblanc_id / "ocr" / f"{pblanc_id}.md",
        ROOT / "data/parsed_hwp" / f"{pblanc_id}.md",
        ROOT / "data/parsed_hwpx" / f"{pblanc_id}.md",
    ):
        if path.exists():
            text = path.read_text(encoding="utf-8", errors="replace")
            if len(text) >= 200:
                return text
    return None


def attachments(item: dict) -> list[tuple[str, str]]:
    names = [n for n in (item.get("fileNm") or "").split("@") if n]
    urls = [u for u in (item.get("flpthNm") or "").split("@") if u]
    return list(zip(names, urls))


def build_prompt(item: dict, body: str) -> str:
    files = attachments(item)
    lines = [
        f"# 공고 제목\n{item.get('pblancNm', '')}",
        f"\n# 주관기관\n{item.get('jrsdInsttNm', '')} / 수행 {item.get('excInsttNm', '')}",
        f"\n# 해시태그\n{item.get('hashtags', '')}",
    ]
    if files:
        lines.append("\n# 첨부파일")
        lines += [f"{i}: {name}" for i, (name, _) in enumerate(files)]
    lines.append(f"\n# 공고 본문\n{body[:MAX_BODY_CHARS]}")
    return "\n".join(lines)

def region_override(item: dict) -> tuple[bool, str] | None:
    """제목 태그로 시도를 결정한다. 태그가 없으면 None(=LLM 값 유지).

    기업마당은 지역 사업 제목 앞에 [경북] 같은 태그를 붙인다. 이 표기가
    LLM 추출보다 정확해서 시도 판정은 여기서 덮어쓴다.
    주관기관은 쓰지 않는다 — 소담스퀘어처럼 지자체가 주관하는 전국 사업이 있다.

    드물게 기업마당 데이터 자체가 틀린 경우가 있다(124890은 [대구] 태그에
    주관기관도 대구광역시지만 실제로는 대전 유성구 사업). 1/222 빈도라
    별도 처리하지 않는다.
    """
    m = TITLE_TAG.match(item.get("pblancNm", ""))
    if not m:
        return None
    tag = m.group(1).strip()
    sido = SIDO_ALIAS.get(tag, tag)
    return (False, sido) if sido in SIDO else None


def from_hashtags(item: dict) -> dict:
    """LLM 실패 시 폴백. 해시태그에서 시도만 건진다."""
    tags = {t.strip() for t in (item.get("hashtags") or "").split(",")}
    sido = None
    for name in SIDO:
        if name in tags:
            sido = name
            break
    if not sido and ({"광주", "전남"} & tags):
        sido = "전남광주"
    return {
        "nationwide": sido is None, "region_sido": sido,
        "target_scale": None, "std_exclusion": False, "max_revenue": None,
        "min_biz_months": None, "max_biz_months": None,
        "type": "기타", "min_balance": None, "max_balance": None, "interest_rate": None,
        "llm_conditions": {"conditions": []}, "documents": [],
    }

async def key_info() -> dict | None:
    """GMS 크레딧 조회. httpx 기본 UA로는 500이 나서 curl UA를 쓴다."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{config.GMS_BASE_URL.split('/gmsapi/')[0]}/gmsapi/key-info",
                headers={
                    "Authorization": f"Bearer {config.GMS_API_KEY}",
                    "User-Agent": "curl/8.0",
                },
            )
            r.raise_for_status()
            return r.json()
    except Exception as e:
        print(f"크레딧 조회 실패: {type(e).__name__}: {e}")
        return None


async def extract(item: dict, body: str, sem: asyncio.Semaphore,
                  model: str) -> tuple[dict, str, int]:
    """(추출 결과, source, 소모 토큰)."""
    async with sem:
        try:
            kwargs = {}
            if not model.startswith("gpt-5-"):  # gpt-5 계열은 추론 모델이라 미지원
                kwargs["temperature"] = 0

            completion = await gms.get_client().chat.completions.create(
                model=model,
                response_format={"type": "json_object"},
                max_completion_tokens=4000,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_prompt(item, body)},
                ],
                **kwargs,
            )

            if completion.choices[0].finish_reason == "length":
                print("      경고: 응답 잘림 — 조건·서류가 누락됐을 수 있음")
            tokens = completion.usage.total_tokens if completion.usage else 0

            data = json.loads(completion.choices[0].message.content)

            override = region_override(item)
            if override:
                data["nationwide"], data["region_sido"] = override
            else:
                sido = SIDO_ALIAS.get(data.get("region_sido"), data.get("region_sido"))
                data["region_sido"] = sido if sido in SIDO else None

            if data.get("type") not in ("지원금", "대출", "기타"):
                data["type"] = "기타"

            # 모델에 따라 배열로 주는 경우가 있다.
            lc = data.get("llm_conditions")
            if isinstance(lc, list):
                lc = {"conditions": lc}
            if not isinstance(lc, dict):
                lc = {"conditions": []}
            data["llm_conditions"] = lc

            return data, "llm", tokens

        except Exception as e:
            print(f"      LLM 실패 → 태그 폴백: {type(e).__name__}: {e}")
            data = from_hashtags(item)
            override = region_override(item)
            if override:
                data["nationwide"], data["region_sido"] = override
            return data, "tag", 0


def save(conn, program_id: int, item: dict, data: dict, source: str) -> None:
    files = attachments(item)
    with conn.cursor() as cur:
        cur.execute(UPSERT_CONDITION, {
            "pid": program_id,
            "nationwide": bool(data.get("nationwide")),
            "region_sido": data.get("region_sido"),
            "target_scale": data.get("target_scale"),
            "std_exclusion": bool(data.get("std_exclusion")),
            "max_revenue": data.get("max_revenue"),
            "min_biz_months": data.get("min_biz_months"),
            "max_biz_months": data.get("max_biz_months"),
            "llm": json.dumps(data.get("llm_conditions") or {"conditions": []},
                              ensure_ascii=False),
            "source": source,
        })
        cur.execute(UPDATE_PROGRAM, {
            "pid": program_id,
            "type": (data.get("type") or "기타")[:10],
            "min_balance": data.get("min_balance"),
            "max_balance": data.get("max_balance"),
            "interest_rate": data.get("interest_rate"),
        })

        cur.execute("DELETE FROM program_document WHERE support_program_id = %s",
                    (program_id,))
        for doc in data.get("documents") or []:
            idx = doc.get("attachment_index")
            url = files[idx][1][:500] if isinstance(idx, int) and 0 <= idx < len(files) else None
            doc_type = doc.get("type") if doc.get("type") in ("제출용", "작성용") else "제출용"
            cur.execute(INSERT_DOC, (
                program_id, (doc.get("doc_name") or "")[:200], doc_type, url))


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--force", action="store_true", help="이미 추출된 공고도 다시")
    ap.add_argument("--model", default=gms.DEFAULT_MODEL)
    args = ap.parse_args()

    items = {it["pblancId"]: it
             for it in json.loads((RAW / "bizinfo_all.json").read_text(encoding="utf-8"))}

    sem = asyncio.Semaphore(CONCURRENCY)
    stats = {"llm": 0, "tag": 0, "skip": 0}
    totals = {"tokens": 0}
    before = await key_info()
    if before:
        print(f"잔여 크레딧 {before['remainCredit']:,} / 전체 {before['totalCredit']:,}")

    with psycopg.connect(config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT sp.id, sp.pblanc_id
                FROM support_program sp
                LEFT JOIN program_condition pc ON pc.support_program_id = sp.id
                WHERE %s OR pc.id IS NULL
                ORDER BY sp.id
            """, (args.force,))
            targets = cur.fetchall()
        if args.limit:
            targets = targets[: args.limit]
        print(f"대상 {len(targets)}건 / 모델 {args.model}\n")

        async def run(program_id: int, pblanc_id: str, i: int):
            item = items.get(pblanc_id)
            if item is None:
                stats["skip"] += 1
                return
            body = find_body(pblanc_id) or strip_html(item.get("bsnsSumryCn", ""))
            data, source, tokens = await extract(item, body, sem, args.model)
            totals["tokens"] += tokens
            save(conn, program_id, item, data, source)
            conn.commit()
            stats[source] += 1
            cond = (data.get("llm_conditions") or {}).get("conditions", [])
            print(f"[{i:>3}/{len(targets)}] {pblanc_id[-6:]} {source:>3} "
                  f"{str(data.get('region_sido')):>6} "
                  f"{str(data.get('target_scale')):>5} "
                  f"조건 {len(cond):>2} 서류 {len(data.get('documents') or []):>2} "
                  f"{tokens:>6}토큰  "
                  f"{item.get('pblancNm', '')[:28]}")

        await asyncio.gather(*(run(pid, pbid, i)
                               for i, (pid, pbid) in enumerate(targets, 1)))

    print(f"\n완료: {stats}")
    print(f"토큰 {totals['tokens']:,}")

    after = await key_info()
    if before and after:
        used = before["remainCredit"] - after["remainCredit"]
        print(f"크레딧 소모 {used:,} / 잔여 {after['remainCredit']:,}")
        if stats["llm"]:
            print(f"건당 {used / stats['llm']:.0f}크레딧 "
                  f"→ 222건 전량 환산 약 {used / stats['llm'] * 222:,.0f}")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())