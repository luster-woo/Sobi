"""Jev 와 GMS 폴백의 속도를 **같은 입력**으로 한 번 잰다.

부하 테스트에서 얻은 수치는 조건이 달랐다. 폴백은 원문을 빼고(with_doc=False)
돌기 때문에 GMS 쪽 입력이 훨씬 짧았다. 그래도 GMS 가 느렸으므로 결론의
방향은 바뀌지 않지만, 배수는 알 수 없었다.

이 스크립트는 states 를 한 번만 만들고 두 경로에 그대로 넣는다.

**비용이 든다.** GMS 입력은 공고당 약 4천 토큰이라 후보 전체를 넣으면
11만 토큰이 나간다. 그래서 LIMIT 으로 잘라 GMS 호출이 딱 1건만 나가게 했다.
알고 싶은 것은 "같은 원문을 줬을 때 호출 하나가 얼마나 걸리는가"이고,
그건 몇 건으로도 나온다. 요청 전체 시간은 거기서 곱하면 된다.

실행 전후로 GMS 크레딧 잔량을 적어두면 **2만 토큰짜리 호출 1건의 실제 값**을
알 수 있다. 지금까지 이 값을 몰라 매번 추측으로 판단해 왔다.

    python -m scripts.speed_compare

결과는 docs/07_jev_judgement.md 「Jev vs GMS 속도」에 적는다.
"""

import asyncio
import sys
import time

if sys.platform == "win32":
    # psycopg 는 ProactorEventLoop 에서 동작하지 않는다. run_dev.py 와 같은 조치.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

from app.core import db
from app.rag import jev, llm_judge, recommend, search

# GMS 호출이 1건만 나가도록 자른다. BATCH_SIZE 를 넘기면 호출이 늘고
# 크레딧이 그만큼 더 나간다.
LIMIT = llm_judge.BATCH_SIZE

# 부하 테스트와 같은 프로필을 쓴다. 비교 가능해야 한다.
PROFILE = {
    "region": "서울",
    "address": "서울특별시 중랑구 면목로 100",
    "business_code": "CS300001",
    "employee_count": 3,
    "open_date": __import__("datetime").date(2022, 5, 1),
    "annual_revenue": 200_000_000,
}


def _agree(a: dict, b: dict) -> str:
    keys = [k for k in a if not a[k].get("failed") and not b.get(k, {}).get("failed")]
    same = sum(1 for k in keys if a[k]["status"] == b[k]["status"])
    return f"{same}/{len(keys)}"


async def main() -> None:
    await db.open_pool()
    try:
        result = await search.search(**PROFILE, with_rejected=False)
        block = recommend.format_profile(
            address=PROFILE["address"],
            industry_name=result.industry_name,
            std_excluded=result.std_excluded,
            employee_count=PROFILE["employee_count"],
            open_date=PROFILE["open_date"],
            annual_revenue=PROFILE["annual_revenue"],
            birth_date=None,
            is_prestartup=False,
        )
        # 원문 포함. 두 경로가 글자 하나까지 같은 입력을 받는다.
        hits = result.hits[:LIMIT]
        states = {h.program_id: recommend.build_state(h, block) for h in hits}
        chars = sum(len(s) for s in states.values())
        # 한국어는 글자당 토큰이 많다. 1.4자/토큰 정도로 잡는다.
        print(f"후보 {len(result.hits)}공고 중 {len(states)}건 사용 / "
              f"입력 {chars:,}자 (약 {int(chars / 1.4):,} 토큰)")

        t = time.perf_counter()
        jev_out = await jev.judge(states)
        jev_sec = time.perf_counter() - t
        print(f"Jev  {jev_sec:6.2f}초  호출 {len(states)}건")

        t = time.perf_counter()
        gms_out = await llm_judge.judge(states)
        gms_sec = time.perf_counter() - t
        calls = -(-len(states) // llm_judge.BATCH_SIZE)
        print(f"GMS  {gms_sec:6.2f}초  호출 {calls}건")

        print(f"\n배수 {gms_sec / jev_sec:.2f}x")
        print(f"판정 일치 {_agree(jev_out, gms_out)}")
        failed = sum(1 for v in gms_out.values() if v.get("failed"))
        if failed:
            print(f"GMS 실패 {failed}건 — 배치가 터졌을 수 있다")
    finally:
        await jev.close()
        await db.close_pool()


if __name__ == "__main__":
    asyncio.run(main())
