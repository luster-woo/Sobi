"""파싱 결과를 청킹·임베딩해서 DB에 적재한다.

support_program 업서트 + program_chunk 재적재. 조건 추출(program_condition)은
별도 단계다.

    python scripts/ingest_chunks.py
    python scripts/ingest_chunks.py --strategy fixed --limit 5
"""

import argparse
import json
import re
import sys
from pathlib import Path

import psycopg
from pgvector.psycopg import register_vector

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pipeline.chunking as chunking
from app.core import config
from app.rag.embedding import koe5

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
TAG = re.compile(r"<[^>]+>")
DATE_PAIR = re.compile(r"(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})")
EMBED_BATCH = 32

UPSERT_PROGRAM = """
INSERT INTO support_program
    (pblanc_id, pblanc_nm, jrsdinstt_nm, excinstt_nm, type,
     start_date, end_date, bsns_sumry_cn, reqst_mth_papers_cn,
     refrnc_nm, rcept_engn_hmpg_url, print_flpth_nm)
VALUES (%(pblanc_id)s, %(pblanc_nm)s, %(jrsdinstt_nm)s, %(excinstt_nm)s, %(type)s,
        %(start_date)s, %(end_date)s, %(bsns_sumry_cn)s, %(reqst_mth_papers_cn)s,
        %(refrnc_nm)s, %(rcept_engn_hmpg_url)s, %(print_flpth_nm)s)
ON CONFLICT (pblanc_id) DO UPDATE SET
    pblanc_nm = EXCLUDED.pblanc_nm,
    jrsdinstt_nm = EXCLUDED.jrsdinstt_nm,
    excinstt_nm = EXCLUDED.excinstt_nm,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    bsns_sumry_cn = EXCLUDED.bsns_sumry_cn,
    reqst_mth_papers_cn = EXCLUDED.reqst_mth_papers_cn,
    refrnc_nm = EXCLUDED.refrnc_nm,
    rcept_engn_hmpg_url = EXCLUDED.rcept_engn_hmpg_url,
    print_flpth_nm = EXCLUDED.print_flpth_nm
RETURNING id
"""

INSERT_CHUNK = """
INSERT INTO program_chunk
    (support_program_id, chunk_index, content, embedding, token_count, metadata)
VALUES (%s, %s, %s, %s, %s, %s)
"""


def strip_html(html: str) -> str:
    text = TAG.sub(" ", html or "").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", text).strip()


def is_target(it: dict) -> bool:
    title = it.get("pblancNm", "")
    return (it.get("trgetNm") == "소상공인" or "소상공인" in title or "소공인" in title) \
        and bool(it.get("printFlpthNm") or it.get("flpthNm"))


def parse_dates(period: str) -> tuple[str | None, str | None]:
    """'2026-09-07 ~ 2026-10-02' → (시작, 종료). '예산 소진시까지'는 (None, None)."""
    m = DATE_PAIR.search(period or "")
    return (m.group(1), m.group(2)) if m else (None, None)


def find_body(pblanc_id: str) -> tuple[str, str] | None:
    """파싱된 본문을 찾는다. (본문, 출처) 또는 None."""
    candidates = [
        (ROOT / "data/parsed" / pblanc_id / "ocr" / f"{pblanc_id}.md", "pdf"),
        (ROOT / "data/parsed_hwp" / f"{pblanc_id}.md", "hwp"),
        (ROOT / "data/parsed_hwpx" / f"{pblanc_id}.md", "hwpx"),
    ]
    for path, source in candidates:
        if path.exists():
            text = path.read_text(encoding="utf-8", errors="replace")
            if len(text) >= 200:
                return text, source
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strategy", default=chunking.DEFAULT)
    ap.add_argument("--limit", type=int, default=0, help="앞 N건만 (디버그용)")
    args = ap.parse_args()

    strategy = chunking.get(args.strategy)
    print(f"전략: {strategy.NAME} — {strategy.DESCRIPTION}")

    items = json.loads((RAW / "bizinfo_all.json").read_text(encoding="utf-8"))
    programs = list({it["pblancId"]: it for it in items if is_target(it)}.values())
    if args.limit:
        programs = programs[: args.limit]
    print(f"대상 공고 {len(programs)}건\n")

    stats = {"pdf": 0, "hwp": 0, "hwpx": 0, "summary": 0}
    total_chunks = 0

    with psycopg.connect(config.DATABASE_URL) as conn:
        register_vector(conn)

        for i, item in enumerate(programs, 1):
            pblanc_id = item["pblancId"]
            title = item.get("pblancNm", "")
            start, end = parse_dates(item.get("reqstBeginEndDe", ""))

            found = find_body(pblanc_id)
            if found:
                body, source = found
            else:
                # 본문 파싱 불가(이미지·docx·손상 파일) — API 사업개요로 대체
                body, source = strip_html(item.get("bsnsSumryCn", "")), "summary"
            stats[source] += 1

            chunks = strategy.chunk(body, title)
            if not chunks:
                print(f"[{i:>3}/{len(programs)}] SKIP {pblanc_id} 청크 0개")
                continue

            vectors: list[list[float]] = []
            for s in range(0, len(chunks), EMBED_BATCH):
                batch = [c.content for c in chunks[s : s + EMBED_BATCH]]
                vectors.extend(koe5.embed_passages(batch, batch_size=8))

            with conn.cursor() as cur:
                cur.execute(UPSERT_PROGRAM, {
                    "pblanc_id": pblanc_id,
                    "pblanc_nm": title[:300],
                    "jrsdinstt_nm": item.get("jrsdInsttNm", "")[:50],
                    "excinstt_nm": item.get("excInsttNm", "")[:50],
                    "type": "기타",  # 조건 추출 단계에서 LLM이 갱신
                    "start_date": start,
                    "end_date": end,
                    "bsns_sumry_cn": strip_html(item.get("bsnsSumryCn", "")),
                    "reqst_mth_papers_cn": item.get("reqstMthPapersCn", ""),
                    "refrnc_nm": item.get("refrncNm", "")[:100],
                    "rcept_engn_hmpg_url": item.get("rceptEngnHmpgUrl", "")[:1000] or None,
                    "print_flpth_nm": item.get("printFlpthNm", "")[:1000] or None,
                })
                program_id = cur.fetchone()[0]

                cur.execute("DELETE FROM program_chunk WHERE support_program_id = %s",
                            (program_id,))
                for idx, (c, vec) in enumerate(zip(chunks, vectors)):
                    cur.execute(INSERT_CHUNK, (
                        program_id, idx, c.content, vec, c.token_count,
                        json.dumps({"pblanc_id": pblanc_id, "title": title,
                                    "source": source, "strategy": strategy.NAME},
                                   ensure_ascii=False),
                    ))
            conn.commit()

            total_chunks += len(chunks)
            print(f"[{i:>3}/{len(programs)}] {pblanc_id} {source:>7} "
                  f"청크 {len(chunks):>3}  {title[:35]}")

    print(f"\n적재 완료: 공고 {len(programs)}건 / 청크 {total_chunks}개")
    print(f"본문 출처: {stats}")


if __name__ == "__main__":
    main()