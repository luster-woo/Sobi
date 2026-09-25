"""PP-OCRv5 엔진. 앱 시작 시 한 번 로드하고, 추론은 라우터의 세마포어 안에서 한 장씩 돈다.

설정 근거는 document/ocr/서류 업로드·OCR 설계.md 4장 (실측), 장애 기록은 9장.
"""

import logging
import os
import threading
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# 엔진 생성과 추론을 모두 이 스레드 하나에서 한다.
# oneDNN 을 켜면 Paddle 이 커널 캐시를 스레드별로 둔다. 기동 때 메인 스레드에서 만들고 요청마다
# 스레드 풀의 다른 스레드에서 추론하던 구조에서, 오래 켜진 서버가 간헐적으로 std::exception 을 냈다 (9장).
# 세마포어로 이미 한 장씩 처리하므로 스레드를 하나로 묶어도 느려지지 않는다.
EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ocr")

# oneDNN 이 고르는 커널 상한. 배포 서버(Xeon Platinum 8175M, AVX-512)의 추론 오류 원인으로 보고 넣었으나
# 이것만으로는 해결되지 않았다 (9장). 로컬 개발 PC(AVX2)와 같은 커널을 쓰게 하는 효과는 있어 유지한다.
os.environ.setdefault("ONEDNN_MAX_CPU_ISA", "AVX2")

# oneDNN 가속. 인식이 4~5배 빨라지지만 CPU·paddle 조합에 따라 추론이 깨질 수 있어 끌 수 있게 둔다
#   (OCR_MKLDNN=0 → 끔. 재빌드 없이 컨테이너 환경변수만 바꾸면 된다)
MKLDNN = os.getenv("OCR_MKLDNN", "1") == "1"

# lang="korean" 은 검출(det)에 무거운 server 모델을 써서 5배 느리다 → det 를 mobile 로 지정한다.
# ⚠ 모델 이름을 하나라도 지정하면 lang 이 통째로 무시된다 (경고만 나고 에러는 없음).
#    rec 를 같이 지정하지 않으면 한국어가 아닌 기본 인식 모델이 붙어 신뢰도가 0.918 → 0.550 으로 무너진다.
#    → det · rec 모델명은 반드시 쌍으로 고정한다
DET_MODEL = "PP-OCRv5_mobile_det"
REC_MODEL = "korean_PP-OCRv5_mobile_rec"

_ocr = None
_fallback = None   # 가속 추론이 깨졌을 때만 쓰는 oneDNN 끈 엔진. 처음 필요할 때 만든다
_lock = threading.Lock()


def _create(mkldnn: bool):
    """모델 파일은 PADDLE_PDX_CACHE_HOME(/models/paddlex 볼륨)에 받는다. 첫 기동만 다운로드로 약 13초."""
    from paddleocr import PaddleOCR

    return PaddleOCR(
        text_detection_model_name=DET_MODEL,
        text_recognition_model_name=REC_MODEL,
        # 인식 시간이 4~5배 줄고(13.3s → 2.6s) 신뢰도·추출 결과는 같다. 추론 메모리는 +0.6GB.
        # ⚠ paddlepaddle 3.3.x 에서는 PIR 회귀로 켜면 NotImplementedError (Paddle #77340) →
        #   requirements.txt 가 3.2.0 으로 고정돼 있다. paddle 을 올릴 때 이 옵션을 함께 확인할 것
        enable_mkldnn=mkldnn,
        # 증명서는 바로 찍힌 스캔·PDF 라 방향 보정·왜곡 보정이 필요 없고, 켜면 느려진다
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


def _get():
    global _ocr
    with _lock:
        if _ocr is None:
            _ocr = _create(MKLDNN)
            logger.info("OCR 모델 로드 완료 (det=%s, rec=%s, mkldnn=%s)", DET_MODEL, REC_MODEL, MKLDNN)
        return _ocr


def _get_fallback():
    global _fallback
    with _lock:
        if _fallback is None:
            _fallback = _create(False)
            logger.warning("oneDNN 을 끈 예비 OCR 엔진을 올렸다 (메모리 약 +0.8GB)")
        return _fallback


def load():
    """앱 기동 시 한 번 부른다. 추론과 같은 OCR 전용 스레드에서 만든다."""
    return EXECUTOR.submit(_get).result()


def is_loaded() -> bool:
    # 폴백 직후에는 가속 엔진을 버려 _ocr 가 비어 있지만, 예비 엔진으로 처리할 수 있다
    return _ocr is not None or _fallback is not None


def predict(image):
    """BGR ndarray 한 장 → PaddleOCR 결과 목록 (rec_texts · rec_scores · rec_polys).

    EXECUTOR 스레드 안에서 부른다 (service.recognize). 가속 추론이 깨지면 oneDNN 을 끈 엔진으로
    한 번 더 돌려 검증이 멈추지 않게 한다 — 그 장만 10~25초가 걸린다.
    """
    global _ocr
    try:
        return _get().predict(image)
    except RuntimeError:
        if not MKLDNN:
            raise
        logger.exception("oneDNN 추론 실패 → 가속 없는 엔진으로 재시도 (shape=%s)", getattr(image, "shape", None))
        # 깨진 상태가 엔진 안에 남아 있을 수 있어 버린다. 다음 요청이 가속 엔진을 새로 만든다
        # (재시작하면 풀리던 증상, 9장)
        with _lock:
            _ocr = None
        return _get_fallback().predict(image)
