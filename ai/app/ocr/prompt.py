"""GMS 텍스트 파서. 양식마다 라벨·배치가 달라 규칙으로 뽑기 어려운 값을 LLM 에게 옮겨 적게 한다.

GMS 비전은 원본 이미지가 외부로 나가고 마스킹을 통제할 수 없어 쓰지 않는다.
OCR 텍스트만 보내고, 주민·법인등록번호는 보내기 전에 가린다.
판정은 하지 않는다. 판정은 rules.py 에서 한다 (LLM 에 판정을 맡기면 결과가 흔들린다).
"""

import json
import logging

from app.core import gms
from app.ocr.extract import ID_NUMBER_RE

logger = logging.getLogger(__name__)

FIELDS = ("doc_title", "issuer", "owner_name", "business_name", "address")

SYSTEM_PROMPT = """너는 한국 증명서류의 OCR 결과에서 값을 옮겨 적는 도구다.
입력은 OCR 이 인식한 줄들이다. 표의 한 행이 한 줄로 합쳐져 라벨·값·영문 번역이 섞여 있을 수 있고,
글자 사이 공백이 사라지거나 오타가 있을 수 있다.

규칙
- 문서에 적힌 값만 옮겨 적는다. 추측하거나 오타를 고치거나 요약하지 않는다.
- 라벨 글자(예: "상호(법인명)", "Name of company", "대표자명:")는 값에 넣지 않는다.
- 해당 값이 문서에 없으면 null.
- JSON 객체 하나만 출력한다.

필드
- doc_title: 문서 제목 (예: "사업자등록증명", "납세증명서")
- issuer: 문서 끝의 발급자 명의(직인 옆 "OO세무서장", "OO부 장관")에서 직함(장, 장관)을 뺀 기관 이름 (예: "영등포세무서", "중소벤처기업부"). 머리글·로고·안내문에 나오는 "국세청", "정부24" 는 발급 기관이 아니다
- owner_name: 대표자 개인 이름. 법인 서류처럼 성명 칸에 회사명만 있으면 null
- business_name: 상호·법인명·기업명
- address: 사업장 주소"""


def mask_id_numbers(text: str) -> str:
    return ID_NUMBER_RE.sub("******-*******", text)


async def parse_fields(cell_texts: list) -> dict:
    """칸 텍스트 → {doc_title, issuer, owner_name, business_name, address}.

    GMS 가 실패하면 전부 None 을 돌려준다. 사업자번호·날짜는 규칙으로 뽑으므로 핵심 검증은 계속된다 (계약서 '에러').
    """
    empty = {k: None for k in FIELDS}
    payload = "\n".join(mask_id_numbers(t) for t in cell_texts)
    try:
        client = gms.get_client().with_options(timeout=30.0, max_retries=1)
        completion = await client.chat.completions.create(
            model=gms.DEFAULT_MODEL,
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": payload},
            ],
        )
        data = json.loads(completion.choices[0].message.content or "{}")
    except Exception:
        logger.warning("GMS 필드 추출 실패 — 이름·상호·주소·제목 없이 판정을 계속한다", exc_info=True)
        return empty

    if not isinstance(data, dict):
        return empty
    return {k: _clean(data.get(k)) for k in FIELDS}


def _clean(value):
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None
