# RAG 추천 API 계약

AI 서버가 제공하는 맞춤 지원사업 추천 API. 담당: RAG 파트.

기준일 2026-09-16. 변경 시 이 문서를 먼저 고치고 알립니다.

## POST /rag/recommend

사업자 프로필로 지원사업 전체를 판정해 돌려줍니다.
**외부에서 쓸 엔드포인트는 이것 하나입니다.**

### 요청

```json
{
  "region": "경북",
  "address": "경상북도 안동시 경동로 456",
  "business_code": "CS100005",
  "employee_count": 2,
  "open_date": "2024-06-03",
  "annual_revenue": 180000000,
  "birth_date": "1994-03-11"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `region` | string | O | 시도. 아래 16개 표준 표기 중 하나 |
| `address` | string | O | 전체 주소. 시군구·읍면동 조건 대조에 씁니다 |
| `business_code` | string | O | CS 업종 소분류 코드. `minor_code.code` |
| `employee_count` | int | O | 상시근로자 수 |
| `open_date` | date | O | 개업일 `YYYY-MM-DD` |
| `annual_revenue` | int | X | 연매출(원). 없으면 매출 조건을 통과 처리 |
| `birth_date` | date | X | 대표자 생년월일. 없으면 연령 조건이 `unknown`으로 남습니다 |

**시도 표준 표기 16개** — 전남과 광주는 `전남광주` 하나로 통합합니다.

```
서울 부산 대구 인천 대전 울산 세종 경기 강원
충북 충남 전북 전남광주 경북 경남 제주
```

`address`가 필요한 이유: 공고에는 "안동시 관내", "봉화군 소재" 같은
시군구·읍면동 조건이 흔한데 `region`(시도)만으로는 판정할 수 없습니다.

`birth_date`가 있으면 "만 40세 이상", "청년(만 39세 이하)" 같은 조건이
확정 판정됩니다. 없으면 그 공고들이 `unknown`으로 나옵니다.

### 응답

```json
{
  "query": "경상북도 안동시에서 제과점을 운영하는 소상공인. 업력 2년 3개월, ...",
  "results": [
    {
      "program_id": 2,
      "pblanc_id": "PBLN_000000000121646",
      "title": "[경북] 안동시 2026년 소상공인 카드수수료 지원사업 참여점포 모집 공고",
      "distance": 0.5243,
      "status": "eligible",
      "reason": "안동시 소재 사업장이며 제과점은 지원제외 업종이 아닙니다",
      "check_items": ["2025년도 카드매출 여부", "국세청 세무 신고 여부"],
      "benefits": ["온라인 등록 선착순 우선순위"],
      "judged_by": "llm"
    },
    {
      "program_id": 5,
      "pblanc_id": "PBLN_000000000126215",
      "title": "[경북] 봉화군 2026년 소상공인 카드수수료 지원사업...",
      "distance": 0.6438,
      "status": "ineligible",
      "reason": "봉화군 소재 사업자만 신청할 수 있으나 사업장은 안동시입니다",
      "check_items": [],
      "benefits": [],
      "judged_by": "llm"
    },
    {
      "program_id": 88,
      "pblanc_id": "PBLN_000000000126232",
      "title": "[서울] 2026년 2차 소상공인 온라인 홍보관...",
      "distance": null,
      "status": "ineligible",
      "reason": "서울 소재 사업자만 신청할 수 있습니다 (현재 경북)",
      "check_items": [],
      "benefits": [],
      "judged_by": "sql"
    }
  ]
}
```

| 필드 | 설명 |
|---|---|
| `query` | 프로필로 만든 검색 질의문. 디버깅용 |
| `program_id` | `support_program.id` |
| `pblanc_id` | 기업마당 공고 ID |
| `distance` | 코사인 거리. **0에 가까울수록 유사**. SQL 탈락 건은 `null` |
| `status` | `eligible` · `unknown` · `ineligible` |
| `reason` | 판정 사유 한 문장 |
| `check_items` | 신청 전 사업자가 직접 확인해야 할 항목 |
| `benefits` | 우대 조건. 판정에는 쓰지 않습니다 |
| `judged_by` | `llm`(조건 판정) 또는 `sql`(정형 필터 탈락) |

**응답에는 공고 222건이 전부 담깁니다.** 정형 필터를 통과한 것은 LLM이
판정하고(`judged_by: "llm"`), 탈락한 것은 사유를 붙여 그대로 돌려줍니다
(`judged_by: "sql"`).

`results`는 `status`(eligible → unknown → ineligible) 다음 `distance` 순입니다.

### status 세 값

| 값 | 의미 | 화면 처리 |
|---|---|---|
| `eligible` | 확인 가능한 조건을 모두 충족 | 신청 가능 |
| `unknown` | "해당해야만 통과"하는 조건을 확인할 수 없음 | 조건 확인 필요 |
| `ineligible` | 확인 가능한 조건이 명확히 어긋남 | 해당 없음 (접어두기) |

`unknown`이 나오는 경우는 좁습니다 — 성별(여성기업), 신용점수, 특정
지위(새출발기금 약정·백년소상공인), 보험·대출 가입, 자녀 유무처럼
**해당하는 사람이 소수인** 조건을 확인할 수 없을 때입니다.

체납·휴폐업·중복수혜처럼 **대부분이 충족하는** 조건은 `eligible`로 두고
`check_items`에 넣습니다.

### check_items

사업자 정보로 확인할 수 없는 조건입니다. 체납 여부, 중복 수혜 이력,
위반건축물 해당 여부 같은 항목이며 공고당 2~5개가 들어갑니다.

**미충족이라는 뜻이 아니라 신청 전 본인이 확인해야 한다는 뜻입니다.**
화면에 함께 노출해주세요.

### benefits

우대·가점 조건입니다. 판정에 쓰지 않으며 "이런 우대가 있습니다"로
안내하는 용도입니다.

## POST /rag/search-text (예정)

질의 문장으로 공고를 찾습니다. 티켓 S15P21D101-311.

### 설계 의도

`/rag/recommend`와 성격이 다릅니다. **자격 판정은 마이데이터 연동 때 이미
계산해 `suggest_support_program`에 저장했으므로, 자연어 검색은 그중에서
고르기만 하면 됩니다.** LLM을 다시 부르지 않습니다.

| | `/rag/recommend` | `/rag/search-text` |
|---|---|---|
| 입력 | 사업자 프로필 | 질의 문장 |
| 하는 일 | 전량 판정 | 질의와 유사한 공고 찾기 |
| LLM | 호출 (약 100크레딧) | **호출 안 함** |
| 응답 시간 | 15~40초 | 1초 미만 |
| 호출 빈도 | 가입·갱신 시 1회 | 검색할 때마다 |

### 요청·응답

```json
// 요청
{ "query": "키오스크 사려는데 관련된 지원금좀 찾아줘", "top_k": 20 }

// 응답
{ "programs": [ { "program_id": 49, "distance": 0.4123 }, ... ] }
```

**AI 서버는 공고 목록만 돌려줍니다.** 사업자 정보를 받지 않고, 정형 필터도
걸지 않습니다. 검색은 순수하게 "질의 ↔ 공고" 문제이기 때문입니다.

### 백엔드에서 판정을 붙입니다

저장된 판정과 조인해 화면에 필요한 값을 만듭니다.

```sql
SELECT sp.*, s.status, s.reason, s.check_items
FROM suggest_support_program s
JOIN support_program sp ON sp.id = s.support_program_id
WHERE s.business_id = %(business_id)s
  AND s.support_program_id = ANY(%(program_ids)s)
ORDER BY array_position(%(program_ids)s, s.support_program_id)
```

`ORDER BY array_position`으로 AI가 준 유사도 순서를 유지합니다.

마감된 공고를 빼려면 `AND (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)`를
덧붙이세요.

### 알려진 한계

**고유명사 검색이 약합니다.** "키오스크", "간판", "냉장고" 같은 단어는
임베딩이 흐릿하게 다뤄서, 해당 단어가 없는 공고가 섞여 나올 수 있습니다.
BM25를 얹는 하이브리드 검색을 검토 중입니다(`docs/03_baseline.md` 참고).
한국어 형태소 분석이 필요해 인프라 협의가 선행됩니다.

## POST /rag/search

검색 단계만 수행합니다(LLM 검증 없음). 요청 형식은 같습니다.
**내부 디버깅·평가 전용입니다.**

## 에러

| 상황 | 현재 동작 | 예정 |
|---|---|---|
| 없는 `business_code` | 500 | 400 + 메시지 |
| `region` 표기 오류 | 조건에 안 걸려 결과 부실 | 400 |
| GMS 호출 실패 | 해당 배치가 `status: "unknown"` | 유지 |

## 성능·비용

- 응답 시간 15~40초 (후보 4~54건, 10건씩 병렬 판정)
- 추천 1회에 GMS 크레딧 약 100
- 결과를 `suggest_support_program`에 저장해 재조회 시 LLM을 부르지 않는 것을
  전제로 합니다