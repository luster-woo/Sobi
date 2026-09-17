# OCR 서류 검증 API 계약

AI 서버가 제공하는 제출 서류 검증 API. 담당: OCR 파트.

기준일 2026-09-17. **초안** — 백엔드와 합의되면 초안 표시를 뗍니다.
변경 시 이 문서를 먼저 고치고 알립니다. 설계 배경은 `document/ocr/서류 업로드·OCR 설계.md`.

> **구현 상태 (2026-09-17): 구현 완료.** `ai/app/ocr/` (engine · extract · prompt · rules · service).
> 샘플 서류 4종 6장으로 판정 평가 8개 시나리오 통과 (`python scripts/eval_ocr_verify.py`),
> 백엔드와 연결해 업로드 → 검증 → 결과 저장까지 확인했습니다.

## POST /ocr/verify

업로드된 서류 한 장을 인식해 **이 사용자의 유효한 그 서류가 맞는지** 판정합니다.
**신청 자격(업종·나이·매출 등)은 판정하지 않습니다.** 그건 대출 `LoanEligibilityChecker`와 RAG 판정의 몫입니다.

호출 주체는 백엔드의 비동기 작업 하나입니다. 프론트는 이 API를 직접 부르지 않습니다.

### 요청

`multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `file` | file | O | PDF · JPG · PNG. **10MB 이하**. PDF는 **앞 3페이지까지만** 봅니다 |
| `document_name` | string | O | 서류명. `loan_document.doc_name` 또는 `program_document.doc_name` **값 그대로** |
| `expected` | string(JSON) | O | 대조용 정답값. 아래 형식의 JSON 문자열 |

**AI 서버는 DB를 보지 않습니다.** 대조할 값은 백엔드가 꺼내 `expected`로 보내주세요.

```json
{
  "brn": "3456789012",
  "owner_name": "권병수",
  "business_name": "카페 하루",
  "address": "서울특별시 성동구 성수이로 78",
  "region": "서울",
  "open_date": "2023-01-10"
}
```

| 필드 | 타입 | 가져올 곳 | 설명 |
|---|---|---|---|
| `brn` | string \| null | `business_info.brn` | 하이픈 있어도 없어도 됩니다. 숫자만 비교합니다 |
| `owner_name` | string \| null | `users.name` | 대표자명 |
| `business_name` | string \| null | `business_info.business_name` | 상호 |
| `address` | string \| null | `business_info.address` | 사업장 주소 |
| `region` | string \| null | `business_info.region` | 시도 표준 표기(`서울`, `경기` …). 주소 대조에 씁니다 |
| `open_date` | date \| null | `business_info.open_date` | `YYYY-MM-DD` |

- **모든 필드는 `null`을 허용합니다.** `null`인 항목은 대조를 건너뜁니다(`SKIP`)
- 예비창업자처럼 `business_info`가 없으면 `brn`·`business_name`·`address`·`region`·`open_date`를 전부 `null`로 보내면 됩니다
- 키 자체를 빼도 `null`과 같게 처리합니다

### 응답

HTTP 200. **검증에 실패해도 200입니다.** 실패 여부는 `status`로 봅니다.

```json
{
  "status": "FAILED",
  "message": "서류의 사업자등록번호가 등록된 사업자 정보와 다릅니다.",
  "checks": [
    { "field": "readable",      "result": "VALID",    "level": "OK",   "detail": "신뢰도 0.900" },
    { "field": "doc_title",     "result": "MATCH",    "level": "OK",   "detail": "중소기업 확인서" },
    { "field": "brn",           "result": "MISMATCH", "level": "FAIL", "detail": "서류 2060843262 / 등록 3456789012" },
    { "field": "owner_name",    "result": "MISMATCH", "level": "FAIL", "detail": "서류 이재훈 / 등록 권병수" },
    { "field": "validity",      "result": "EXPIRED",  "level": "FAIL", "detail": "유효기간 2022-03-31 경과" },
    { "field": "business_name", "result": "MISMATCH", "level": "WARN", "detail": "서류 해광레이저 / 등록 카페 하루" },
    { "field": "address",       "result": "MISMATCH", "level": "WARN", "detail": "서류 서울 마포구 / 등록 서울 성동구" },
    { "field": "open_date",     "result": "SKIP",     "level": "SKIP", "detail": "이 서류에 없는 항목" }
  ],
  "extracted": {
    "doc_title": "중소기업 확인서",
    "issuer": "중소벤처기업부",
    "issue_date": "2021-07-09",
    "valid_until": "2022-03-31",
    "brn": "2060843262",
    "owner_name": "이재훈",
    "business_name": "해광레이저",
    "address": "서울마포구 홍의로5안길55, 지층(서교동)",
    "open_date": null
  },
  "confidence": 0.900,
  "elapsed_ms": 10712
}
```

| 필드 | 설명 |
|---|---|
| `status` | `PASSED` · `FAILED`. **`application_document.validation_status`에 그대로 저장** |
| `message` | 사용자에게 보여줄 한 문장. `PASSED`면 `null`. **`validation_message`(255자)에 그대로 저장** |
| `checks` | 항목별 판정 근거. 디버깅·시연 설명용이라 **저장하지 않아도 됩니다** |
| `extracted` | 서류에서 읽은 값. 못 읽은 값은 `null`. 저장은 선택 |
| `confidence` | OCR 평균 신뢰도(0~1) |
| `elapsed_ms` | AI 서버 처리 시간 |

`extracted` 값 형식:

- `brn`은 **숫자 10자리**(하이픈 제거)
- 날짜는 전부 `YYYY-MM-DD`
- 이름·상호·주소는 **서류에 적힌 그대로**입니다. OCR 특성상 공백이 빠지거나 오타가 있을 수 있습니다(`홍익로`→`홍의로`)

### checks

| `field` | 무엇을 보나 | 가능한 `result` |
|---|---|---|
| `readable` | 판독 가능한가 | `VALID` · `UNREADABLE` |
| `doc_title` | 요청한 서류가 맞나 | `MATCH` · `MISMATCH` · `NOT_FOUND` · `SKIP` |
| `brn` | 사업자등록번호 | `MATCH` · `MISMATCH` · `NOT_FOUND` · `SKIP` |
| `owner_name` | 대표자명 | `MATCH` · `MISMATCH` · `NOT_FOUND` · `SKIP` |
| `validity` | 유효기간·발급일 | `VALID` · `EXPIRED` · `NOT_FOUND` |
| `business_name` | 상호 | `MATCH` · `MISMATCH` · `NOT_FOUND` · `SKIP` |
| `address` | 사업장 시도·시군구 | `MATCH` · `MISMATCH` · `NOT_FOUND` · `SKIP` |
| `open_date` | 개업일 | `MATCH` · `MISMATCH` · `NOT_FOUND` · `SKIP` |

`level`은 그 항목이 판정에 준 영향입니다.

| `level` | 의미 |
|---|---|
| `FAIL` | 이 항목 때문에 `FAILED` |
| `WARN` | 어긋나거나 못 읽었지만 통과시킴 |
| `OK` | 통과 |
| `SKIP` | 대조하지 않음 (정답값 `null`, 또는 그 서류에 해당 항목 없음) |

`FAIL`이 하나라도 있으면 `status`는 `FAILED`입니다. `checks` 순서는 위 표 순서로 고정합니다.

## 판정 규칙

### FAILED가 되는 경우 (이것만)

확실한 경우만 실패시킵니다. **애매하면 통과 + `WARN`** 입니다.
예상 못 한 서류 하나로 사용자가 막히는 편이 더 나쁘기 때문입니다.

| 순서 | 조건 | `message` |
|---|---|---|
| 1 | 판독 불가: 평균 신뢰도 < 0.6 **또는** 인식 줄 수 < 15 | 서류를 읽을 수 없습니다. 흐리거나 잘리지 않은 파일로 다시 올려주세요. |
| 2 | 문서 종류 불일치: 제목을 읽었는데 그 서류가 아님 | 요청한 서류({document_name})가 아닌 것 같습니다. 서류를 확인해 주세요. |
| 3 | 사업자등록번호 불일치 | 서류의 사업자등록번호가 등록된 사업자 정보와 다릅니다. |
| 4 | 대표자명 불일치 (해당 서류만, 아래 표) | 서류의 대표자명이 회원 정보와 다릅니다. |
| 5 | 유효기간 경과 | 유효기간이 지난 서류입니다 ({날짜}). 새로 발급받아 올려주세요. |

- 판독 불가(1)면 **나머지 항목은 보지 않습니다.** 못 읽은 서류로 불일치를 판단하면 오판이 나기 때문입니다
- 여러 개가 동시에 걸리면 **순서가 빠른 하나만** `message`에 씁니다. 전체는 `checks`에 있습니다
- 날짜 비교 기준은 **서버 시각 KST 오늘**입니다

### 통과로 두는 경우

| 상황 | `level` | 이유 |
|---|---|---|
| 사업자등록번호·대표자명·발급일을 **못 읽음** (`NOT_FOUND`) | `WARN` | 인식 실패를 사용자 탓으로 돌리지 않음 |
| 제목을 못 읽음 | `WARN` | 위와 같음 |
| 상호·주소·개업일 불일치 | `WARN` | `(주)`·띄어쓰기·도로명/지번·시도 약칭 차이가 흔함 |
| 대표자명이 마스킹됨(`홍*동`) | `SKIP` | 비교 불가 |
| 규칙 표에 없는 서류명 | — | 기본 규칙만 적용 (아래 `(그 외)`) |

### 비교 방법

| 항목 | 방법 |
|---|---|
| 사업자등록번호 | 숫자만 남겨 완전 일치 |
| 대표자명·상호 | 공백 제거 후 완전 일치 |
| 주소 | 공백 제거 → 시도 약칭 통일(`서울특별시`→`서울`, `경기도`→`경기`) → **시도는 `expected.region`, 시군구는 `expected.address`** 와 같은지 |
| 날짜 | `YYYY-MM-DD`로 맞춘 뒤 비교 |
| 문서 제목 | 공백 제거 후 서류별 별칭 중 하나를 포함하는지 |

## 서류별 기준

`document_name`으로 고릅니다. **값이 DB의 `doc_name`과 글자까지 같아야 합니다.**

| `document_name` | 제목 별칭 | 대조(FAIL) | 유효성 기준 |
|---|---|---|---|
| `사업자등록증명원` | `사업자등록증명` | 사업자번호, 대표자명 | 발급일로부터 90일 |
| `부가가치세 과세표준증명원` | `부가가치세과세표준증명` | 사업자번호, 대표자명 | 발급일로부터 90일 |
| `국세 납세증명서` | `납세증명서` | 사업자번호 | 서류의 유효기간 |
| `소상공인확인서` | `중소기업확인서`, `소상공인확인서` | 사업자번호, 대표자명 | 서류의 유효기간 |
| (그 외) | 대조 안 함 | 사업자번호 | 발급일로부터 90일 |

- **납세증명서는 대표자명을 대조하지 않습니다.** 법인이면 `성명(상호)` 칸에 회사명만 있습니다
- **소상공인확인서의 실제 제목은 `중소기업 확인서 [소기업(소상공인)]`** 입니다. 그래서 별칭이 필요합니다
- 유효성 기준이 "서류의 유효기간"인데 유효기간을 못 읽으면 발급일로부터 90일로 대신 봅니다. 둘 다 못 읽으면 `NOT_FOUND`(`WARN`)
- `소상공인확인서`는 `V26`에서 표준재무상태표·손익계산서를 바꾼 이름입니다
- **지원사업 제출 서류는 아직 정해지지 않았습니다.** 정해지기 전까지 모든 지원사업 서류는 `(그 외)` 규칙으로 동작합니다.
  대출 서류와 같은 서류라면 `doc_name`을 이 표의 이름과 똑같이 맞춰야 서류별 기준을 탑니다

## 에러

판정까지 가지 못한 경우입니다. **이때는 응답에 `status`가 없습니다.**

| 상황 | HTTP | 본문 |
|---|---|---|
| 파일 형식이 PDF·JPG·PNG가 아님 | 400 | `{"detail": "지원하지 않는 파일 형식입니다"}` |
| 파일이 깨져 이미지로 못 바꿈 | 400 | `{"detail": "파일을 열 수 없습니다"}` |
| `expected`가 JSON이 아님 | 400 | `{"detail": "expected 형식이 올바르지 않습니다"}` |
| 파일이 10MB 초과 | 413 | `{"detail": "파일이 10MB를 넘습니다"}` |
| 필수 필드 누락 | 422 | FastAPI 기본 형식 |
| OCR 엔진 오류 | 500 | `{"detail": "..."}` |
| **GMS 호출 실패** | **200** | 판정은 계속합니다. 제목·기관·대표자·상호·주소를 `null`로 두고 해당 항목은 `NOT_FOUND`(`WARN`) |

GMS가 실패해도 사업자등록번호·날짜는 규칙으로 뽑으므로 **핵심 검증은 계속됩니다.**

### 백엔드 처리

| AI 결과 | `validation_status` | `validation_message` |
|---|---|---|
| 200 + `PASSED` | `PASSED` | `null` |
| 200 + `FAILED` | `FAILED` | 응답의 `message` |
| 400 · 413 | `FAILED` | 파일을 확인할 수 없습니다. 다른 파일로 다시 올려주세요. |
| 422 · 500 · 연결 실패 · 타임아웃 | `FAILED` | 검증 중 오류가 발생했습니다. 다시 업로드해 주세요. |

- 파일 형식·크기는 백엔드 업로드 단계에서 **먼저 막는 것**을 권장합니다. AI 쪽 검사는 방어용입니다
- 결과를 저장하기 전에 **검증 시작 시점의 `stored_path`가 지금도 같은지** 확인하고, 다르면 결과를 버립니다(그 사이 재업로드)
- 응답이 아예 오지 않는 경우에 대비해 `VALIDATING` 10분 초과 건은 `FAILED`로 정리합니다(설계 문서 2장)

## 성능·운영

| 항목 | 값 (CPU, `ai/Dockerfile` 컨테이너 실측) |
|---|---|
| 처리 시간 | 서류 1장 **약 10~25초** (OCR 8~20초 + GMS 1~3초). 고해상도 스캔일수록 김 |
| GMS | 서류당 호출 1회, 640~990 토큰 |
| 메모리 | 컨테이너 프로세스 약 1.3GB (torch·paddle 포함, RAG 임베딩 모델 제외) |
| 기동 | 모델 로드 0.3초 (`/models` 볼륨 캐시가 있을 때). 첫 기동만 다운로드로 약 13초 |

**AI 서버는 OCR을 한 번에 한 장씩 처리합니다** (내부 세마포어 1).
동시에 돌리면 CPU를 나눠 쓰느라 전부 느려지고 메모리 사용량도 겹칩니다.

그래서 **백엔드의 OCR 호출 타임아웃은 넉넉히** 잡아주세요.

- 서류 4장을 연달아 올리면 4번째는 앞의 3장을 기다립니다 → 최악 약 1~2분
- 같은 AI 서버에서 RAG 추천(15~40초)이 돌고 있으면 그만큼 더 밀립니다
- 현재 `ai.read-timeout: 120s`는 RAG 기준이라 **OCR에는 짧습니다.** OCR 호출은 **300초**를 권장합니다
- 그동안 프론트는 폴링하며 "검증 중"을 보여줍니다. 업로드 API 응답 자체는 즉시 나갑니다

### 개인정보

- GMS로는 **OCR 텍스트만** 보냅니다. 원본 이미지는 외부로 나가지 않습니다
- 보내기 전에 주민·법인등록번호(6-7자리)를 `******-*******`로 가립니다
- AI 서버는 받은 파일을 디스크에 남기지 않습니다. PDF 변환 이미지도 처리 후 지웁니다

## 알려진 한계

- **OCR 오타는 고치지 않습니다.** `홍익로`를 `홍의로`로 읽는 식이며, 주소를 `WARN`으로만 두는 이유입니다
- 검증한 샘플은 **서류 4종 6장**입니다. 처음 보는 양식(특히 지원사업 서류)은 `NOT_FOUND`가 늘 수 있고, 규칙상 통과 쪽으로 기웁니다
- **위·변조는 판정하지 않습니다.** 발급번호로 홈택스·정부24 진위확인을 하는 기능은 범위 밖입니다
