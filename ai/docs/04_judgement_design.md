# 자격 판정 설계

2026-09-16 결정. 티켓 306 측정 결과(`03_baseline.md`)에서 판정 정확도가
0.478로 낮게 나온 뒤, 판정 범위 자체를 재정의했다.

## 원칙

**우리가 가진 정보로 대조할 수 있는 조건만 판정한다.**

유저 정보는 일곱 개뿐이다.

```
region  address  business_code  employee_count  open_date  annual_revenue  birth_date
```

이걸로 확인할 수 없는 조건(체납, 중복 수혜, 신용점수, 보험 가입)을 LLM에게
판단시키면 `unknown`과 오탈락이 쏟아진다. 실제로 오판 12건 중 9건이 이 원인이었다.

## 담당 분리

숫자·코드로 딱 떨어지면 SQL, 문장을 읽어야 하면 LLM.

| 유저 필드 | 조건 | 담당 |
|---|---|---|
| `region` | 시도 일치 / 전국 | SQL |
| `address` | 시군구·읍면동 | LLM |
| `employee_count` | 소상공인 5인 미만 | SQL |
| `employee_count` | 1인 사업장 | LLM |
| `annual_revenue` | 매출 상한 | SQL |
| `open_date` | 업력 하한·상한 | SQL |
| `open_date` | 예비창업자 여부 | LLM |
| `business_code` | 업종 일치 | LLM |
| `business_code` | 표준 융자제외업종 | LLM |
| `birth_date` | 대표자 연령 | LLM |
| — | 마감일 | SQL |

`std_exclusion`은 원래 SQL이었으나 옮겼다. "제외 목록에 있어도 20% 이내
허용"(125890) 같은 예외가 있어 문장 해석이 필요하다.

`birth_date`는 정형 컬럼(`min_owner_age`)을 만들 수도 있으나, "만 39세 이하",
"1986년 이후 출생", "청년" 등 표현이 제각각이라 LLM에 둔다.

## 판정 범위

`llm_conditions`의 `category`로 가른다.

| category | 판정 |
|---|---|
| `region` | 사용 — `address` 대조 |
| `industry` | 사용 — `business_code` 대조 |
| `owner` | 사용 — 연령, 예비창업자 여부 |
| `track` | 사용 — 1인 사업장 등 규모 |
| `self_report` | **판정 안 함** → `check_items` |
| `other` | **판정 안 함** → `check_items` |

## status 정의

| 값 | 조건 |
|---|---|
| `ineligible` | 판정 범위 안의 조건이 명확히 어긋남 |
| `unknown` | 확인 불가한 필수 조건이 **적극요건형**일 때 |
| `eligible` | 그 외 |

**결격사유형과 적극요건형을 구분한다.**

- 결격사유형 — 체납, 휴·폐업, 중복 수혜, 위반건축물. "해당 없으면 통과"이며
  대부분의 사업자가 충족한다 → `eligible` + `check_items`
- 적극요건형 — 성별(여성기업), 신용점수, 특정 지위(새출발기금 약정,
  백년소상공인), 보험·대출 가입, 매출 감소율. "해당해야만 통과"이며
  해당자가 소수다 → `unknown`

확인 불가를 이유로 `ineligible`을 주지 않는다.

## 응답 필드

```json
{
  "program_id": 2,
  "status": "eligible",
  "reason": "안동시 소재 사업장이며 제과점은 지원제외 업종이 아닙니다",
  "check_items": ["국세·지방세 체납 여부", "최근 3년간 유사과제 수혜 이력"],
  "benefits": ["경상북도 소재 소상공인 우대"]
}
```

- `reason` — 판정 사유. 판정 범위 안의 조건 대조 결과
- `check_items` — 신청 전 본인이 확인할 사항. 미충족이라는 뜻이 아니다
- `benefits` — 우대 조건. 판정에 쓰지 않는다

## 저장

`suggest_support_program`에 **222건 전부** 저장한다. SQL 탈락 건도 사용자에게
"해당 없음" 사유와 함께 보여주기 때문이다. SQL 탈락은 사유가 결정론적이라
템플릿 문자열로 만들며 LLM을 부르지 않는다(비용 0).

```sql
status       VARCHAR(10)  -- eligible | unknown | ineligible
reason       VARCHAR(500)
check_items  JSONB
benefits     JSONB
distance     DOUBLE PRECISION  -- 코사인 거리. 0에 가까울수록 유사. SQL 탈락 건은 NULL
judged_by    VARCHAR(3)   -- sql | llm
```

`judged_by`는 오판 보고 시 어느 쪽을 고칠지 가르는 데 쓴다.
값은 `jev`(자격 판정) / `llm`(Jev 장애 시 GMS 폴백) / `sql`(정형 필터 탈락)
세 가지다. DB 쪽 CHECK 제약은 백엔드 `V28` 에 있다.

계산 시점은 마이데이터 연동 완료 직후(화면 12 "자격 판정 로딩")이며,
재계산은 마이데이터 갱신 API가 담당한다. 로딩 화면이 있어 수십 초를
쓸 수 있으므로 후보 전량 검증이 가능하다.

## 남은 과제

- **`confidence` 가 저장되지 않는다.** AI 는 `eligible` 안에서 확신도 내림차순
  으로 정렬해 돌려주는데, 백엔드 `RagResult` 에 해당 필드가 없어 버려진다.
  DB 에서 다시 꺼낼 때는 `distance` 로만 정렬하므로 확신도 0.99 인 공고와
  0.36 인 공고가 같은 취급을 받는다. 정렬 근거가 한 단계에서 사라지는 셈이다.
  `suggest_support_program.confidence DOUBLE PRECISION` 추가 + `RagResult`
  필드 추가 + 조회 정렬에 반영이 필요하다 (SQL 탈락 건은 null).
- 신규 공고가 적재돼도 기존 사용자는 갱신 전까지 보지 못한다. 데모에선
  무관하나, 운영에선 "새 공고 N건" 배지로 갱신을 유도해야 한다
- 점포 형태(무점포·비접객)는 CS 업종 코드로 알 수 없어 판정 불가.
  프로필 필드 추가가 필요하다

## 배포 시 확인 (실제로 터진 것들)

AI 응답 스키마를 바꾸면 백엔드 저장 경로가 같이 깨진다. 실제로
`judged_by` 에 `jev` 를 추가했을 때 `/mydata/link` 가 500 으로 터졌다.
V25 의 CHECK 이 `('llm','sql')` 뿐이었는데 AI 쪽만 보고 배포했기 때문이다.

다음에 응답 필드를 바꿀 때 볼 곳.

| | 위치 |
|---|---|
| DTO | `global/external/ai/clientDto/RagResult.java` |
| 엔티티 | `support/entity/SuggestSupportProgram.java` |
| DB 제약 | `db/migration/` 의 CHECK (`chk_suggest_support_program_*`) |
| 컬럼 길이 | `judged_by VARCHAR(3)` — 세 글자를 넘는 값은 못 넣는다 |

모르는 필드가 늘어나는 것 자체는 안전하다. Jackson 기본 설정이
`FAIL_ON_UNKNOWN_PROPERTIES=false` 라 조용히 무시된다. **조용히 무시되는
것이 위 `confidence` 문제의 원인이기도 하다.**