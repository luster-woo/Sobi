"""어휘 검색(BM25). 벡터가 놓치는 고유명사·전문용어를 줍는다.

**왜 필요한가.** 측정된 실패:

    "백년소상공인 지원 받고 싶어요"
      → 제목에 "백년소상공인" 이 그대로 있는 공고를 30위 안에 못 넣는다

임베딩은 자주 안 나오는 고유명사를 잘 못 다룬다. 반대로 어휘 검색은 글자가
겹쳐야 점수를 주므로 이런 질의에 강하고, 뜻이 같지만 표현이 다른 질의에는
약하다. 같은 평가셋에서 둘의 강약이 갈린 예:

    "소담스퀘어 참여하려면"  → 제목에 그 글자가 없는 부산 건까지 벡터가 찾았다
    "백년소상공인 지원"      → 글자가 있는데 벡터가 놓쳤다

그래서 둘을 합친다. 근거는 docs/06_search_quality.md.

**혼자서는 손해다.** 후보를 넓히는 만큼 잡음이 들어와 Precision 이 떨어지고
무관 질의 차단이 무너진다. 뒤의 재정렬 필터(app/rag/rerank.py)가 그 잡음을
버릴 때만 이득이 된다. **둘은 한 쌍이라 하나만 켜면 안 된다.**

    어휘만        키워드 R 0.944 / 광의 P 0.729 / 무관 차단 0.000
    어휘+재정렬   키워드 R 0.972 / 광의 P 0.857 / 무관 차단 1.000

**구성은 둘 다 재서 골랐다**(아래 TOKENIZER·ENGINE 주석).
토큰화는 `bigram`, 점수 계산은 `rank_bm25`.

**규모.** 청크 5,417개 기준 색인이 수십 MB 안쪽이고 기동에 몇 초다. 기본이
켜져 있어도 기동 시에는 만들지 않고 첫 요청에서 한 번 짓는다. 공고가 수만
건이 되면 Postgres 확장(pg_bigm 등)으로 옮겨야 한다.
"""

import asyncio
import logging
import math
import re
from collections import defaultdict

from app.core import db

logger = logging.getLogger(__name__)

K1 = 1.2      # BM25 표준값. 용어 빈도의 포화 속도
B = 0.75      # 문서 길이 정규화 강도

# 흔한 용어는 아예 안 쓴다. 이 비율보다 많은 청크에 나오면 버린다.
#
# 이것이 없으면 "어제 야구 경기 결과" 가 공고 10건을 끌어온다. "경기"(야구
# 경기 = 경기도), "결과", "지원" 같은 말이 점수를 받기 때문이다. IDF 가
# 낮아도 0 은 아니라서 조금씩 쌓인다. 실측에서 무관 질의 차단이 0.500 에서
# 0.000 으로 무너졌다.
#
# 어휘 검색의 일은 벡터가 못 잡는 **고유명사**를 줍는 것이다("백년소상공인",
# "희망리턴패키지", "비즈플러스카드"). 그 단어들은 드물다. 흔한 말을 버리면
# 할 일만 남고 잡음이 사라진다. 근거는 docs/06_search_quality.md.
MAX_DF_RATIO = 0.05

_HANGUL = re.compile(r"[가-힣]+")
_WORD = re.compile(r"[a-zA-Z0-9]+")

# 내용어만 남긴다. 조사(J*)·어미(E*)·기호(S*)는 검색에 쓸모가 없다.
#   NN* 명사  VV 동사  VA 형용사  SL 외국어  SN 숫자  XR 어근
_KEEP = ("NNG", "NNP", "NNB", "VV", "VA", "SL", "SN", "XR")

# 재서 bigram 을 골랐다. 최종 파이프라인(어휘+재정렬, 질의 86개)에서:
#
#            협의 R (제목/본문/키워드)   광의 P (제목/본문/키워드)
#   bigram   1.000 / 0.719 / 0.972      0.852 / 0.711 / 0.857
#   kiwi     1.000 / 0.688 / 0.917      0.880 / 0.680 / 0.833
#
# 다섯 중 넷을 bigram 이 이긴다. **다만 격차가 0.03 안팎으로 재정렬의 실행 간
# 변동과 비슷한 크기라, 사실상 동률로 보는 것이 정직하다.** 그래서 결정적인
# 것은 의존성이다 — bigram 은 아무것도 설치하지 않는다.
#
# 원리상으로도 2-gram 이 유리한 자리가 있다. Kiwi 는 문서에서 "백년소상공인" 을
# 한 덩어리 고유명사로 잡는데, 질의 쪽에서는 "소상공인" 이 흔해서 버려지고
# "백년" 만 남아 안 맞는다. **분석이 정확할수록 경계가 어긋나면 못 찾는다.**
#
# kiwi 경로는 남겨 뒀다. 지우면 다음 사람이 다시 제안하고 같은 측정을 반복한다.
TOKENIZER = "bigram"    # "bigram" 또는 "kiwi"

# 점수 계산 구현. 재보니 동률이라 라이브러리를 쓴다.
#
#              협의 R (제목/본문/키워드)   광의 P (제목/본문/키워드)
#   builtin    1.000 / 0.719 / 0.972      0.852 / 0.711 / 0.857
#   rank_bm25  1.000 / 0.719 / 0.972      0.855 / 0.691 / 0.852
#
# Recall 은 세 자리까지 같고 Precision 차이는 재정렬 변동 범위 안이다.
# 품질이 같으면 직접 유지보수할 코드가 없는 쪽이 낫다.
#
# rank_bm25 경로에서는 아래 MAX_DF_RATIO 전처리를 걸지 않는다. 그런데도 점수가
# 같았다 — **그 전처리는 필요 없었다.** 그것이 막으려던 무관 질의는 지금
# 재정렬 필터가 막는다.
#
# builtin 을 남긴 이유: 의존성 없이 돌려야 할 때와, 위 비교를 다시 할 때 쓴다.
ENGINE = "rank_bm25"    # "rank_bm25" 또는 "builtin"
_bm25 = None            # rank_bm25 모델
_kiwi = None


def _get_kiwi():
    global _kiwi, TOKENIZER
    if _kiwi is None:
        try:
            from kiwipiepy import Kiwi
            _kiwi = Kiwi()
            logger.info("형태소 분석기 kiwipiepy 사용")
        except Exception:
            logger.warning("kiwipiepy 를 불러오지 못해 문자 2-gram 으로 내려간다")
            TOKENIZER = "bigram"
    return _kiwi


def _bigrams(text: str) -> list[str]:
    out: list[str] = []
    for m in _HANGUL.finditer(text):
        s = m.group()
        if len(s) == 1:
            out.append(s)
        else:
            out.extend(s[i:i + 2] for i in range(len(s) - 1))
    out.extend(m.group().lower() for m in _WORD.finditer(text))
    return out

_index: dict[str, list[tuple[int, int]]] | None = None   # 용어 → [(청크idx, 빈도)]
_lengths: list[int] = []
_chunk_program: list[int] = []
_avg_len = 0.0


def tokenize(text: str) -> list[str]:
    if TOKENIZER == "kiwi":
        k = _get_kiwi()
        if k is not None:
            return [t.form.lower() for t in k.tokenize(text)
                    if t.tag in _KEEP and len(t.form) > 1]
    return _bigrams(text)


async def build(advisory: tuple[str, ...] = ()) -> None:
    """DB에서 청크를 읽어 색인을 만든다. 기동 시 한 번.

    advisory 는 색인에서 뺄 공고(pblanc_id). search.ADVISORY 를 넘긴다.
    여기서 import 하면 search -> lexical -> search 로 순환한다.
    """
    global _index, _avg_len
    async with db.acquire() as conn:
        cur = await conn.execute("""
            SELECT c.support_program_id, c.content
            FROM program_chunk c
            JOIN support_program sp ON sp.id = c.support_program_id
            WHERE (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
              AND NOT (sp.pblanc_id = ANY(%(advisory)s))
            ORDER BY c.id
        """, {"advisory": list(advisory)})
        rows = await cur.fetchall()

    index: dict[str, list[tuple[int, int]]] = defaultdict(list)
    _lengths.clear()
    _chunk_program.clear()
    tokenized = [tokenize(r["content"]) for r in rows]

    global _bm25
    if ENGINE == "rank_bm25":
        from rank_bm25 import BM25Okapi
        _bm25 = BM25Okapi(tokenized, k1=K1, b=B)
        _chunk_program.extend(r["support_program_id"] for r in rows)
        _index = {"_lib": []}     # ready() 용 표식
        logger.info("어휘 색인(%s/%s): 청크 %d개", ENGINE, TOKENIZER, len(rows))
        return

    for i, (r, toks) in enumerate(zip(rows, tokenized)):
        tf: dict[str, int] = defaultdict(int)
        for t in toks:
            tf[t] += 1
        for t, n in tf.items():
            index[t].append((i, n))
        _lengths.append(len(toks))
        _chunk_program.append(r["support_program_id"])

    # 흔한 용어를 버린다. 색인도 작아지고 잡음도 사라진다.
    cap = max(1, int(len(rows) * MAX_DF_RATIO))
    dropped = {t for t, p in index.items() if len(p) > cap}
    _index = {t: p for t, p in index.items() if len(p) <= cap}
    _avg_len = sum(_lengths) / len(_lengths) if _lengths else 0.0
    logger.info("어휘 색인(%s): 청크 %d개 / 용어 %d개 (흔해서 버림 %d개) / 평균 길이 %.0f",
                TOKENIZER, len(rows), len(_index), len(dropped), _avg_len)


def ready() -> bool:
    return _index is not None


def search(query: str, top_n: int = 20) -> dict[int, float]:
    """program_id → BM25 점수. 공고 점수는 청크 최댓값으로 본다.

    벡터가 MIN(거리) 를 쓰는 것과 같은 규칙이다. 한 공고의 어느 한 대목이
    질의와 맞으면 그 공고가 답일 수 있다.
    """
    if ENGINE == "rank_bm25":
        if _bm25 is None:
            return {}
        best: dict[int, float] = {}
        for ci, sc in enumerate(_bm25.get_scores(tokenize(query))):
            if sc <= 0:
                continue
            pid = _chunk_program[ci]
            if sc > best.get(pid, 0.0):
                best[pid] = float(sc)
        return dict(sorted(best.items(), key=lambda kv: -kv[1])[:top_n])

    if not _index or not _lengths:
        return {}
    n = len(_lengths)
    scores: dict[int, float] = defaultdict(float)
    for term in set(tokenize(query)):
        posting = _index.get(term)
        if not posting:
            continue
        # 흔한 조각은 IDF 가 0 이하로 떨어져 저절로 걸러진다.
        idf = math.log(1 + (n - len(posting) + 0.5) / (len(posting) + 0.5))
        if idf <= 0:
            continue
        for ci, tf in posting:
            norm = 1 - B + B * (_lengths[ci] / _avg_len if _avg_len else 1)
            scores[ci] += idf * (tf * (K1 + 1)) / (tf + K1 * norm)

    best: dict[int, float] = {}
    for ci, s in scores.items():
        pid = _chunk_program[ci]
        if s > best.get(pid, 0.0):
            best[pid] = s
    return dict(sorted(best.items(), key=lambda kv: -kv[1])[:top_n])
