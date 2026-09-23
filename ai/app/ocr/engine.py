"""PP-OCRv5 엔진. 앱 시작 시 한 번 로드하고, 추론은 라우터의 세마포어 안에서 한 장씩 돈다.

설정 근거는 document/ocr/서류 업로드·OCR 설계.md 4장 (실측).
"""

import logging
import threading

logger = logging.getLogger(__name__)

# lang="korean" 은 검출(det)에 무거운 server 모델을 써서 5배 느리다 → det 를 mobile 로 지정한다.
# ⚠ 모델 이름을 하나라도 지정하면 lang 이 통째로 무시된다 (경고만 나고 에러는 없음).
#    rec 를 같이 지정하지 않으면 한국어가 아닌 기본 인식 모델이 붙어 신뢰도가 0.918 → 0.550 으로 무너진다.
#    → det · rec 모델명은 반드시 쌍으로 고정한다
DET_MODEL = "PP-OCRv5_mobile_det"
REC_MODEL = "korean_PP-OCRv5_mobile_rec"

_ocr = None
_lock = threading.Lock()


def load():
    """모델 파일은 PADDLE_PDX_CACHE_HOME(/models/paddlex 볼륨)에 받는다. 첫 기동만 다운로드로 약 13초."""
    global _ocr
    with _lock:
        if _ocr is not None:
            return _ocr
        from paddleocr import PaddleOCR

        _ocr = PaddleOCR(
            text_detection_model_name=DET_MODEL,
            text_recognition_model_name=REC_MODEL,
            # oneDNN 가속. 인식 시간이 4~5배 줄고(13.3s → 2.6s) 신뢰도·추출 결과는 같다. 추론 메모리는 +0.6GB.
            # ⚠ paddlepaddle 3.3.x 에서는 PIR 회귀로 켜면 NotImplementedError (Paddle #77340) →
            #   requirements.txt 가 3.2.0 으로 고정돼 있다. paddle 을 올릴 때 이 옵션을 함께 확인할 것
            enable_mkldnn=True,
            # 증명서는 바로 찍힌 스캔·PDF 라 방향 보정·왜곡 보정이 필요 없고, 켜면 느려진다
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
        logger.info("OCR 모델 로드 완료 (det=%s, rec=%s)", DET_MODEL, REC_MODEL)
        return _ocr


def is_loaded() -> bool:
    return _ocr is not None


def predict(image):
    """BGR ndarray 한 장 → PaddleOCR 결과 목록 (rec_texts · rec_scores · rec_polys)"""
    return load().predict(image)
