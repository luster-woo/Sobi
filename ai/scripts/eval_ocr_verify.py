"""/ocr/verify 판정 평가: 샘플 서류를 실제 엔진 + GMS 로 돌려 기대 판정과 비교한다.

사용법 (컨테이너 권장 — Windows 로컬은 인식이 수 배 느리다):
    python scripts/eval_ocr_verify.py

준비:
    data/raw/ocr/ 에 샘플, data/raw/ocr/expected.json 에 정답값 (gitignore 대상, 실명 포함)
      { "_today": "2026-09-17",
        "<파일명(확장자 제외)>": { "document_name": "사업자등록증명원", "verdict": "PASSED",
                                 "brn": ..., "owner_name": ..., "business_name": ..., "address": ..., "open_date": ... } }
    .env 의 GMS_API_KEY

시나리오
    본인 서류   각 샘플을 자기 정답값으로 → verdict 와 같은지
    남의 서류   다른 사업자의 샘플을 기준 사용자 정답값으로 → 사업자번호 불일치로 FAILED
    종류 불일치 다른 서류를 기준 서류명으로 → 문서 종류 불일치로 FAILED
"""

import asyncio
import io
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from app.ocr import rules, service  # noqa: E402
from app.ocr.schemas import Expected  # noqa: E402

SAMPLE_DIR = ROOT / "data" / "raw" / "ocr"
EXTS = (".pdf", ".jpg", ".jpeg", ".png")

_recognized = {}
_original_recognize = service.recognize


def _cached_recognize(data, ext):
    """시나리오마다 같은 파일을 다시 인식하지 않도록 (판정·GMS 는 매번 새로)"""
    key = (hash(data), ext)
    if key not in _recognized:
        _recognized[key] = _original_recognize(data, ext)
    return _recognized[key]


service.recognize = _cached_recognize


def expected_of(entry: dict) -> Expected:
    region, _ = rules.split_sido(entry.get("address") or "")
    return Expected(
        brn=entry.get("brn"),
        owner_name=entry.get("owner_name"),
        business_name=entry.get("business_name"),
        address=entry.get("address"),
        region=region,
        open_date=entry.get("open_date"),
    )


def sample_path(stem: str) -> Path | None:
    for ext in EXTS:
        p = SAMPLE_DIR / f"{stem}{ext}"
        if p.exists():
            return p
    return None


async def run_case(title, path, document_name, expected, today, want_status, want_fail_field=None):
    result = await service.verify(path.read_bytes(), path.suffix.lower(), document_name, expected, today=today)
    fails = [c.field for c in result.checks if c.level == "FAIL"]
    ok = result.status == want_status and (want_fail_field is None or (fails and fails[0] == want_fail_field))
    print(f"\n{'PASS' if ok else 'FAIL'}  [{title}] {path.name} → {document_name}")
    print(f"      기대 {want_status}{' (' + want_fail_field + ')' if want_fail_field else ''} / 결과 {result.status}"
          f"  신뢰도 {result.confidence}")
    if result.message:
        print(f"      메시지: {result.message}")
    for c in result.checks:
        if c.level != "OK":
            print(f"      {c.level:<4} {c.field:<13} {c.result:<10} {c.detail or ''}")
    return ok


async def main():
    data = json.loads((SAMPLE_DIR / "expected.json").read_text(encoding="utf-8"))
    today = date.fromisoformat(data.get("_today") or date.today().isoformat())
    entries = {k: v for k, v in data.items() if not k.startswith("_") and "document_name" in v}

    results = []
    for stem, entry in entries.items():
        path = sample_path(stem)
        if not path:
            print(f"\n(건너뜀) 파일 없음: {stem}")
            continue
        results.append(await run_case("본인 서류", path, entry["document_name"], expected_of(entry),
                                      today, entry["verdict"]))

    # 기준 사용자: PASSED 가 기대되는 첫 샘플의 정답값
    base_stem, base = next((k, v) for k, v in entries.items() if v["verdict"] == "PASSED")
    for stem, entry in entries.items():
        path = sample_path(stem)
        if path and entry.get("brn") and entry["brn"] != base.get("brn"):
            results.append(await run_case("남의 서류", path, entry["document_name"], expected_of(base),
                                          today, "FAILED", "brn"))
            break

    other = next(((k, v) for k, v in entries.items()
                  if v["document_name"] != base["document_name"] and v["verdict"] == "PASSED"), None)
    if other and sample_path(other[0]):
        results.append(await run_case("종류 불일치", sample_path(other[0]), base["document_name"],
                                      expected_of(base), today, "FAILED", "doc_title"))

    print(f"\n=== {sum(results)}/{len(results)} 통과  (기준 사용자: {base_stem}, 오늘 {today})")


if __name__ == "__main__":
    asyncio.run(main())
