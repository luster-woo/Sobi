"""KoE5 임베딩 래퍼.

query:/passage: 프리픽스는 이 모듈에서만 붙인다. 호출부는 원문만 넘길 것.
모델은 프로세스당 1회 로드(약 2.6GB 상주), uvicorn worker 1개 전제.
"""

import logging
import threading

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "nlpai-lab/KoE5"
EMBEDDING_DIM = 1024
MAX_SEQ_LENGTH = 512
DEFAULT_BATCH_SIZE = 8

_model: SentenceTransformer | None = None
_lock = threading.Lock()


def get_model() -> SentenceTransformer:
    """모델 싱글톤. 최초 호출 시 로드된다."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                logger.info("KoE5 로드 시작: %s", MODEL_NAME)
                model = SentenceTransformer(MODEL_NAME, device="cpu")
                model.max_seq_length = MAX_SEQ_LENGTH
                _model = model
                logger.info("KoE5 로드 완료 (dim=%d)", EMBEDDING_DIM)
    return _model


def _encode(texts: list[str], batch_size: int) -> list[list[float]]:
    vectors = get_model().encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,  # 코사인 = 내적. pgvector <=> 와 맞춤
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return vectors.tolist()


def embed_query(text: str) -> list[float]:
    """검색 질의 1건 임베딩."""
    if not text or not text.strip():
        raise ValueError("embed_query: 빈 질의")
    return _encode([f"query: {text.strip()}"], batch_size=1)[0]


def embed_passages(
    texts: list[str], batch_size: int = DEFAULT_BATCH_SIZE
) -> list[list[float]]:
    """문서 청크 다건 임베딩. 입력 순서를 유지한다."""
    if not texts:
        return []
    cleaned = [t.strip() for t in texts]
    if any(not t for t in cleaned):
        raise ValueError("embed_passages: 빈 청크 포함")
    return _encode([f"passage: {t}" for t in cleaned], batch_size=batch_size)

def is_loaded() -> bool:
    return _model is not None