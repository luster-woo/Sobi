"""Jev(System One) 판정.

질문 정의와 게이트를 여기 한 곳에 둔다. 평가 하네스(scripts/jev_run.py)도
이 모듈을 import 해서 쓴다. 갈라지면 측정값이 운영을 대변하지 못한다.

임계값 근거는 docs/07_jev_judgement.md. 골든셋 85쌍 × 10회 반복에서 골랐다.
"""

import asyncio
import logging

from typesafe_sdk import Choice, Noul, TypeSafeClient

logger = logging.getLogger(__name__)


class JevUnavailable(RuntimeError):
    """Jev 호출이 전부 실패했다. 호출자는 폴백으로 넘어가야 한다."""


MODEL = "jev-latest"
CONCURRENCY = 8          # 공고당 1콜. 후보 50건이면 동시 8개로 약 2초

# 운영과 같은 입력(상위 12청크)으로 5회 × 85쌍에서 고른 값이다.
# 전문을 넣고 고른 예전 값 0.56/0.40 은 이 입력에서 심각 오판을 3건 낸다.
FACT = 0.52      # 0.54 부터 절벽. 한 칸 물러선 값이다
TAU = 0.35       # 0.25 부터 절벽. 낮출수록 기권이 줄어 심각 오판이 샌다
CERTAIN = 0.99   # 이 이상이면 게이트를 건너뛴다. 0.98 로 내리면 심각 오판이 샌다

QUESTIONS = {
    "status": Choice(
        instructions="이 사업자가 이 공고에 신청할 자격이 있는가?",
        criteria={
            "eligible": "충족해야 하는 요건을 모두 충족한다",
            "ineligible": "충족해야 하는 요건 중 하나 이상을 명백히 충족하지 못한다",
        }),
    # 아래는 전부 사실 질문이다. 사업자가 누구든 답이 같다.
    # 판정과 메타판정을 한 문장에 섞으면 신호가 죽는다(docs/07 참고).
    "needs_status": Noul(
        instructions="이 공고는 특정 지위나 자격을 이미 보유한 사업자만 신청할 수 있는가? "
                     "(예: 백년소상공인 지정, 특정 보험 가입, 신용평점 기준, "
                     "특정 상권 소속, 기존 대출 보유, 특정 교육 수료)"),
    "needs_person": Noul(
        instructions="이 공고는 대표자 개인의 신상을 요건으로 요구하는가? "
                     "(예: 자녀 유무, 출산, 육아휴직, 성별, 장애 여부)"),
    "needs_registered": Noul(
        instructions="이 공고는 이미 사업자등록을 마치고 영업 중인 사업자만 "
                     "신청할 수 있는가? 예비창업자(사업자등록 전)도 신청할 수 "
                     "있는 갈래가 있으면 거짓."),
    "either": Noul(
        instructions="이 공고의 지원대상은 여러 유형 중 어느 하나만 충족하면 되는 "
                     "택일 구조인가?"),
}

_client: TypeSafeClient | None = None


def get_client() -> TypeSafeClient:
    """TYPESAFE_API_KEY 환경변수를 SDK가 직접 읽는다."""
    global _client
    if _client is None:
        _client = TypeSafeClient()
    return _client


async def close() -> None:
    global _client
    if _client is not None:
        await asyncio.to_thread(_client.close)
        _client = None


def gate(signals: dict, *, prestartup: bool = False, tau: float = TAU) -> str:
    """최종 status 는 코드가 정한다. 모델에게 묻지 않는다."""
    if prestartup and signals["needs_registered"] > FACT:
        return "ineligible"

    # 확신을 갖고 부적격이면 대조 가능한 요건에서 이미 탈락했다는 뜻이다.
    # unknown 은 "탈락은 없으나 확인 불가한 요건이 있음"이므로 탈락이 우선한다.
    if signals["choice"] == "ineligible" and signals["conf"] >= CERTAIN:
        return "ineligible"

    if signals["needs_status"] > FACT or signals["needs_person"] > FACT:
        return "unknown"
    if signals["conf"] < tau:
        return "unknown"
    return signals["choice"]


def _ask(state: str) -> dict:
    r = get_client().system_one(state=state, questions=QUESTIONS, model=MODEL)
    st = r.choices["status"]
    return {
        "choice": st.choice,
        "conf": round(st.confidence, 3),
        "probabilities": {k: round(v, 3) for k, v in st.probabilities.items()},
        "needs_status": round(r.nouls["needs_status"].noul, 3),
        "needs_person": round(r.nouls["needs_person"].noul, 3),
        "needs_registered": round(r.nouls["needs_registered"].noul, 3),
        "either": round(r.nouls["either"].noul, 3),
        "model": r.model,
    }


async def judge(states: dict[int, str], *, prestartup: bool = False) -> dict[int, dict]:
    """program_id → 판정. 공고당 1콜이며 동시에 CONCURRENCY 개씩 돈다."""
    sem = asyncio.Semaphore(CONCURRENCY)

    async def one(pid: int, state: str) -> tuple[int, dict]:
        async with sem:
            try:
                sig = await asyncio.to_thread(_ask, state)
            except Exception:
                logger.exception("Jev 판정 실패 program_id=%s", pid)
                return pid, {"status": "unknown", "failed": True}
        sig["status"] = gate(sig, prestartup=prestartup)
        return pid, sig

    pairs = await asyncio.gather(*(one(p, s) for p, s in states.items()))
    out = dict(pairs)

    # 일부 실패는 그 건만 unknown 으로 둔다. 전부 실패면 서비스 장애다.
    failed = sum(1 for v in out.values() if v.get("failed"))
    if out and failed == len(out):
        raise JevUnavailable(f"Jev 호출 {failed}건 전부 실패")
    return out