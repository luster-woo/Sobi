"""공고 본문에서 자격 조건을 LLM으로 추출해 DB에 적재한다.

공고당 GMS 1회 호출. 실패 시 hashtags 폴백(source='tag').
필요 서류는 추출하지 않는다 — 정확도가 낮아 수기로 채우기로 했다.

    python scripts/extract_conditions.py
    python scripts/extract_conditions.py --limit 5 --force --model gpt-4.1-mini
"""

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

import httpx
import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core import config, gms
from pipeline.text import shrink

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
HTML_TAG = re.compile(r"<[^>]+>")
TITLE_TAG = re.compile(r"^\s*\[([^\]]+)\]")
MAX_BODY_CHARS = 20000
CONCURRENCY = 4

SIDO = ["서울", "부산", "대구", "인천", "대전", "울산", "세종", "경기", "강원",
        "충북", "충남", "전북", "전남광주", "경북", "경남", "제주"]

# 정형 필드에 이미 담긴 내용. LLM이 지시를 어기고 넣는 경우가 잦다.
REDUNDANT = re.compile(
    r"상시\s*(종업원|근로자)|소상공인\s*(보호|기본)법|"
    r"창업\s*\d+\s*년\s*(이상|이내|미만)|연매출액?\s*\d+\s*억"
)

# 서류 제출은 자격이 아니라 절차다. 다만 지역·업종·대표자처럼 실질 내용이
# 함께 있으면 자격 조건이므로 남긴다.
#   버림: "소상공인확인서 제출", "중소기업확인서 보유 업체"
#   남김: "사업자등록증상 소재지가 제주인 소상공인"
DOC_WORD = re.compile(r"증명서|증명원|확인서|수료증|납세증명")
DOC_ACTION = re.compile(r"제출|발급|보유|소지|구비")
SUBSTANTIVE = re.compile(r"소재|주소|관할|대표자|업종|휴·?폐업|체납|연령|나이")


def is_noise(text: str) -> bool:
    """자격 조건이 아닌 항목인지."""
    if REDUNDANT.search(text):
        return True
    return bool(DOC_WORD.search(text) and DOC_ACTION.search(text)
                and not SUBSTANTIVE.search(text))

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

SYSTEM_PROMPT = f"""\
너는 소상공인 정부지원사업 공고문에서 신청 자격을 추출한다.

## 절대 규칙
확실하지 않으면 null을 쓴다. 틀린 값보다 null이 낫다.
검색 시스템이 "값이 null이면 통과"로 처리하므로, 잘못 채우면 자격 있는
사업자가 탈락한다.

## 정형 필드

nationwide: 전국 대상이면 true, 특정 지역 한정이면 false
region_sido: 다음 16개 중 하나 또는 null
  {' '.join(SIDO)}
  - 전라남도·광주광역시는 둘 다 "전남광주"로 쓴다
  - 신청 자격에 "~에 소재한 사업자"처럼 지역 제한이 명시된 경우에만 채운다
  - 수행기관 소재지, 지원 시설·센터의 위치, 사업명에 들어간 지명은
    지역 제한이 아니다. 예) "소담스퀘어 in 부산"은 시설 위치일 뿐이다
  - "우대"·"가점" 대상 지역은 제한이 아니다. nationwide=true로 두고
    llm_conditions에 mode "우대"로 기록한다
  - 판단이 서지 않으면 nationwide=true, region_sido=null

target_scale: "소상공인" | "소공인" | "중소기업" | "무관" | null
  - 소공인은 제조업 기반 소상공인이다. 공고가 소공인 한정이면 "소공인"

std_exclusion: 표준 융자제외업종 조항이 있으면 true
  - true: 유흥·도박·사행성 업종을 배제하거나, 표준산업분류 코드로 된
    제외업종 목록(붙임·별표 포함)이 있는 경우
  - false: 체납·폐업·중복수혜처럼 업종과 무관한 제외 사유만 있는 경우.
    "제외"라는 단어가 나온다고 true가 아니다

max_revenue: 연매출 상한(원 단위 정수). 없으면 null. 예) 3억원 → 300000000
min_biz_months / max_biz_months: 업력 하한·상한(개월). 없으면 null
  - "창업 3년 이상" → min 36, "창업 7년 이내" → max 84

type: 지원 방식으로 정한다
  - "지원금": 현금·비용 보전·물품·시설개선 등 무상 지원
  - "대출": 융자, 이차보전, 보증
  - "기타": 교육, 컨설팅, 상담, 판로·마케팅 지원
min_balance / max_balance: 지원·융자 금액 하한·상한(원). 없으면 null
interest_rate: 이차보전·융자 금리(%). 없으면 null

## llm_conditions

정형 필드에 담은 내용은 여기에 쓰지 마라.
  쓰지 않음: "상시근로자 5인 미만", "소상공인기본법 제2조에 따른 소상공인",
            "연매출 N억원 이하", "창업 N년 이상/이내", 시도 수준의 지역
  쓰는 것: 시군구·읍면동, 대표자 연령·성별, 업종·품목,
          보유·가입·지위 요건, 본인 신고 사항

조건 하나에 한 가지 내용만 담는다. 예외·할당·단서가 있으면 항목을 나눈다.
  틀림: "별표1 제외업종은 지원 제외. 다만 부동산중개업(68221)은 신청 가능하며
        전체의 20% 이내로 선착순 지원"
  옳음: {{"direction": "결격", "text": "별표1 제외업종(도박·사행성·유흥 등)"}}
        {{"direction": "요건", "text": "부동산 중개·대리업(68221)은 6개월 이상 동일장소 영업 시 신청 가능"}}
        {{"direction": "결격", "text": "부동산중개업은 전체 지원규모의 20% 이내 선착순"}}

조건은 12개를 넘기지 마라. 절차·심사 관련 항목은 버리고 자격에 직결되는 것만 남긴다.

category: "region" | "owner" | "industry" | "self_report" | "other" | "track"
  - region: 시군구·읍면동 한정
  - owner: 대표자 연령·성별·자녀 등
  - industry: 필수 업종·취급 품목
  - self_report: 휴폐업·체납·중복수혜 등 본인 신고 사항
  - track: 공고 내 트랙·유형 구분

mode: "필수" | "우대"
  다음 표현이 나오면 반드시 "우대"다.
    우대, 우선지원, 우선 선정, 가점, 가산점, 배점, 인센티브,
    우대금리, 지원비율 상향, 자부담 경감, 국비 지원 비율 우대
  "~인 경우 우선지원 가능"은 우대다. 충족하지 않아도 신청할 수 있다.
    예) "만 50세 이상 대표자 우선지원" → 우대
    예) "인구감소지역 소재 시 우선지원" → 우대
  "우선지원"·"우선 선정" 항목 아래 나열된 조건은 그 블록 전체가 우대다.
  하위 항목에 "자격요건"이라는 표현이 있어도 우대다.
  공고에 "일반지원"처럼 다른 신청 경로가 있으면, 우선지원 조건은 필수가 아니다.
  "필수"는 충족하지 않으면 신청 자체가 불가능한 조건만이다.
    예) "안동시에 사업장을 둔 소상공인" → 필수
  mode에는 "필수" 또는 "우대"만 쓴다. "요건"·"결격"을 쓰지 마라.

direction: "요건" | "결격"
  - 요건: 해당해야만 통과. 상품·설비 보유, 지위 지정(백년소상공인 등),
    보험·대출 가입, 약정 체결, 대표자 연령·성별, 자녀 보유
  - 결격: 해당하면 탈락. 체납, 휴·폐업, 중복 수혜, 제외업종, 위반건축물,
    브로커 개입
  지원 제외 대상으로 나열된 항목은 전부 "결격"이다. 요건으로 뒤집지 마라.
  text와 direction은 일치해야 한다. text가 "~여야 함"이면 요건,
  "~인 경우 신청 불가"면 결격이다. 원문에서의 위치보다 문장의 의미를 따른다.

conditions에 넣지 않는 것
  - 신청 절차·제출 방법·유형 선택 ("구입형·렌탈형 중 선택", "온라인 접수")
  - 심사 방식, 선정 기준, 선착순 마감
  - 제출 서류와 증빙 요구
      예) "소상공인확인서 제출", "중소기업확인서 보유 업체",
          "국세·지방세 완납증명서 제출 필수", "수료증 제출"
      서류를 내라는 요구는 자격이 아니다.
      다만 서류의 내용이 자격을 규정하면 그건 조건이다.
      예) "사업자등록증상 소재지가 제주인 소상공인" → 지역 조건이므로 넣는다
  - 공고에 없는 내용
  
## 출력
아래 JSON 형식으로만 답한다. 설명을 덧붙이지 않는다.
{{"nationwide": false, "region_sido": null, "target_scale": null,
  "std_exclusion": false, "max_revenue": null,
  "min_biz_months": null, "max_biz_months": null,
  "type": "기타", "min_balance": null, "max_balance": null, "interest_rate": null,
  "llm_conditions": {{"conditions": [
    {{"category": "region", "mode": "필수", "direction": "요건", "text": ""}}]}}}}
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


def strip_html(html: str) -> str:
    return re.sub(r"\s+", " ", HTML_TAG.sub(" ", html or "").replace("&nbsp;", " ")).strip()


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


def build_prompt(item: dict, body: str) -> str:
    return "\n".join([
        f"# 공고 제목\n{item.get('pblancNm', '')}",
        f"\n# 주관기관\n{item.get('jrsdInsttNm', '')} / 수행 {item.get('excInsttNm', '')}",
        f"\n# 해시태그\n{item.get('hashtags', '')}",
        f"\n# 공고 본문\n{shrink(body)[:MAX_BODY_CHARS]}",
    ])


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
    sido = next((name for name in SIDO if name in tags), None)
    if not sido and ({"광주", "전남"} & tags):
        sido = "전남광주"
    return {
        "nationwide": sido is None, "region_sido": sido,
        "target_scale": None, "std_exclusion": False, "max_revenue": None,
        "min_biz_months": None, "max_biz_months": None,
        "type": "기타", "min_balance": None, "max_balance": None, "interest_rate": None,
        "llm_conditions": {"conditions": []},
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


def normalize(data: dict, item: dict) -> dict:
    """LLM 출력의 값 오염을 바로잡는다."""
    override = region_override(item)
    if override:
        data["nationwide"], data["region_sido"] = override
    else:
        sido = SIDO_ALIAS.get(data.get("region_sido"), data.get("region_sido"))
        data["region_sido"] = sido if sido in SIDO else None

    if data.get("type") not in ("지원금", "대출", "기타"):
        data["type"] = "기타"

    lc = data.get("llm_conditions")
    if isinstance(lc, list):
        lc = {"conditions": lc}
    if not isinstance(lc, dict):
        lc = {"conditions": []}

    conditions = []
    for c in lc.get("conditions", []):
        if is_noise(c.get("text", "")):
            continue  # 정형 필드와 중복이거나 서류 제출 요구
        if c.get("mode") not in ("필수", "우대"):
            c["mode"] = "필수"
        if c.get("direction") not in ("요건", "결격"):
            c["direction"] = "결격"
        conditions.append(c)

    lc["conditions"] = conditions
    data["llm_conditions"] = lc
    return data


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
                print("      경고: 응답 잘림 — 조건이 누락됐을 수 있음")
            usage = completion.usage
            tokens = usage.total_tokens if usage else 0
            if usage:
                print(f"      입력 {usage.prompt_tokens:,} / 출력 {usage.completion_tokens:,}")

            data = json.loads(completion.choices[0].message.content)
            return normalize(data, item), "llm", tokens

        except Exception as e:
            print(f"      LLM 실패 → 태그 폴백: {type(e).__name__}: {e}")
            return normalize(from_hashtags(item), item), "tag", 0


def save(conn, program_id: int, data: dict, source: str) -> None:
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
            save(conn, program_id, data, source)
            conn.commit()
            stats[source] += 1
            conds = (data.get("llm_conditions") or {}).get("conditions", [])
            우대 = sum(1 for c in conds if c.get("mode") == "우대")
            print(f"[{i:>3}/{len(targets)}] {pblanc_id[-6:]} {source:>3} "
                  f"{str(data.get('region_sido')):>6} "
                  f"{str(data.get('target_scale')):>5} "
                  f"조건 {len(conds):>2}(우대 {우대}) {tokens:>6}토큰  "
                  f"{item.get('pblancNm', '')[:26]}")

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