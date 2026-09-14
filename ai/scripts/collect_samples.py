"""기업마당 API로 전체 공고 수집 → 소상공인 공고 본문출력파일 다운로드 → survey.csv 초안 생성"""
import os, csv, json
from pathlib import Path
import httpx
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
KEY = os.environ["BIZINFO_API_KEY"]
ROOT = Path(__file__).resolve().parents[1] / "data"
RAW = ROOT / "raw"
RAW.mkdir(parents=True, exist_ok=True)

# 1) 전체 목록 수집
r = httpx.get("https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do",
              params={"crtfcKey": KEY, "dataType": "json", "searchCnt": 0}, timeout=300)
r.raise_for_status()
body = r.json()
items = body["jsonArray"]["item"] if isinstance(body.get("jsonArray"), dict) else body["jsonArray"]
(RAW / "bizinfo_all.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"전체 {len(items)}건 저장")

# 2) 소상공인 공고만 (중복 제거)
def is_target(it):
    title = it.get("pblancNm", "")
    return (it.get("trgetNm") == "소상공인" or "소상공인" in title or "소공인" in title) \
        and (it.get("printFlpthNm") or it.get("flpthNm"))

cands = list({it["pblancId"]: it for it in items if is_target(it)}.values())
print(f"소상공인 공고: {len(cands)}건")

# 3) 본문출력파일 다운로드 (없으면 첨부로 폴백)
rows = []
for it in cands:
    url = it.get("printFlpthNm") or it.get("flpthNm")
    name = it.get("printFileNm") or it.get("fileNm") or ""
    ext = Path(name).suffix.lower() or ".bin"
    pid = it["pblancId"]
    dest = RAW / f"{pid}{ext}"
    try:
        if not dest.exists():
            resp = httpx.get(url, timeout=120, follow_redirects=True)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
        status = "ok"
    except Exception as e:
        status = f"fail:{type(e).__name__}"
    rows.append({
        "file": dest.name, "pblancId": pid, "org": it.get("jrsdInsttNm", ""),
        "format": ext.lstrip("."), "hashTags": it.get("hashTags", ""),
        "trgetNm": it.get("trgetNm", ""), "period": it.get("reqstBeginEndDe", ""),
        "title": it.get("pblancNm", ""), "download": status,
        "has_attach": "Y" if it.get("flpthNm") else "N",
        "attach_name": it.get("fileNm", ""),
        # 수동 조사 컬럼
        "surveyed": "", "has_table": "", "region": "", "region_match": "",
        "biz_age": "", "size": "", "industry": "", "owner": "", "other": "", "note": "",
    })
    print(f"{status:12s} {dest.name}  {it.get('pblancNm', '')[:40]}")

# 4) survey.csv
with open(ROOT / "survey.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys())
    w.writeheader()
    w.writerows(rows)

fmt = {}
for row in rows:
    fmt[row["format"]] = fmt.get(row["format"], 0) + 1
print(f"\nsurvey.csv {len(rows)}행 / 포맷 {fmt} / 실패 {sum(1 for r in rows if r['download'] != 'ok')}건")