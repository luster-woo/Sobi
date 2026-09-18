# FieldCandidateExtractor

현재 버전은 v2.1이다. 아래 v1/v2 정책 중 unit target 및 unit hints 규칙은
v2.1 보완 절의 정책으로 대체한다.

`ParsedDocument -> list[FieldCandidate]`를 처리하는 읽기 전용 규칙 계층이다.
표 셀의 배치와 표시 문자열만 사용한다. 필드 의미, SourceKey, LLM, DB,
Writer, 업무 대상 검증은 이 모듈의 책임이 아니다.

## 파일과 모델

- `enums.py`: CandidateRelation, FieldInputShape.
- `models.py`: FieldCandidate Pydantic 모델.
- `normalizer.py`: label 공백 정규화.
- `rules.py`: label/target 조건, 좌표 관계, context 한도, confidence 상수.
- `extractor.py`: 후보 탐색, 위치 보존, context, dedup, ID 부여.
- `__init__.py`: 공개 모델과 Extractor export.
- `__main__.py`: HWPX 또는 ParsedDocument JSON을 읽는 디버그 CLI.

FieldCandidate는 `candidate_id`, `label`, `normalized_label`, `relation`,
`label_location`, `target_location`, `current_text`, `input_shape`, `context`,
`confidence`, `hints`로 구성한다. location은 Parser 모델을 그대로 깊은 복사한다.
native_ref의 section_file/element_path/element_name/row_order/cell_order 등도 유지한다.
ParsedDocument 및 원본 파일을 변경하지 않는다.

## 탐지 정책

label은 영숫자/한글 등의 작성 내용이 있는 짧은 셀이다. 정규화 후 60자,
원문 120자, 3줄을 초과하면 제외한다. 단위, helper, placeholder, 비텍스트 객체,
중첩 표를 담은 컨테이너 셀은 label로 사용하지 않는다.

target은 빈 셀, 명시적인 helper 또는 빈칸 placeholder만 허용한다.
기존 작성 내용이 있는 셀, 단위만 있는 셀, 이미지 등 비텍스트 객체,
중첩 표 컨테이너는 제외한다. 중첩 표 자체는 재귀적으로 별도 탐색한다.

- RIGHT: `label.column_index + label.column_span == target.column_index`이며
  두 셀의 행 범위가 겹쳐야 한다. 리스트의 다음 원소를 오른쪽으로 가정하지 않는다.
- RIGHT 직접 인접 후보가 없으면 제한 탐색을 적용한다(아래 v2 정책).
- BELOW: 해당 label에 직접/제한 탐색 RIGHT 후보가 없을 때만 검사한다.
  `label.row_index + label.row_span == target.row_index`이며 열 범위가 겹쳐야 한다.
- 좌표는 Parser의 실제 row/column 및 span을 사용한다. 음수 좌표/0 이하 span은 제외한다.
- SAME_CELL은 Enum만 제공하며 추출하지 않는다.

helper는 전체 문자열이 다음 규칙에 맞을 때만 허용한다:
`(사업자등록증 상)`, `(해당자만 작성)`, `(해당 시 작성)`, `(YYYY년)`,
`숫자/OO자 이내`, `짧은 문자열 기준`. helper는 current_text에 원문을 보존하고
hints.helper_text에도 제공한다. 작성 내용과 helper가 섞인 문장은 제외한다.

label 원문은 유지한다. normalized_label은 모든 공백(띄어쓰기/탭/줄바꿈)을 제거한다.
동의어 변환, 구두점 제거, 의미 추론은 하지 않는다.

## Context와 confidence

target 문자열과 label/target에 바로 인접한 셀만 수집한다. 같은 표 전체를 복사하지 않는다.
label과 중복되는 문자열, 긴 문장, 객체/중첩 표 컨테이너는 제외한다.
항목당 80자 이하, 최대 6개, 최종 300자 이내로 제한한다.
단위(원/천원/만원/백만원/명/%/개월/년/월/일/건/회)는 독립 후보가 아니며,
target 인접 단위는 context와 hints.unit(여럿이면 hints.units)에 제공한다.

| 관계 | 빈 target | helper | placeholder |
|---|---:|---:|---:|
| RIGHT | 0.95 | 0.80 | 0.78 |
| BELOW | 0.70 (넓은 빈 셀 0.75) | 0.65 | 0.60 |

confidence는 통계적 확률이 아닌 규칙 우선순위 점수이다. 값은 rules.py에서 관리한다.
모델은 유한한 0~1 값만 허용한다.

input_shape는 명시적 날짜 빈칸이면 DATE, 빈 체크박스 문자면 CHECKBOX,
그 외 인접 단위가 없고 row_span >= 2 또는 (BELOW이며 column_span >= 4)이면 LONG_TEXT,
공백 셀이면 SHORT_TEXT, 나머지는 UNKNOWN이다. 실제 너비를 알 수 없어 span은 근사치다.
NUMBER는 Enum만 제공하며 label 의미로 숫자 입력을 추측하지 않는다.

## 중복과 ID

동일 target을 하나로 축약한다. native element_path가 있으면 section/table/section_file/path,
없으면 공통 section/table/row/column/block 좌표로 식별한다.
confidence가 높은 후보를 선택하고 동률이면 RIGHT > BELOW > SAME_CELL 순서이다.
동일 점수·관계는 입력 탐색 순서를 유지한다.
최종 section/table/row/column/native_ref 순서로 정렬하고 candidate_001부터 부여한다.
같은 입력에는 같은 결과를 반환한다. ID는 문서 수정 후에도 유지되는 영구 식별자가 아니다.

## 사용 및 검증

`ai` 디렉터리에서:

```python
from app.agent.documents.parser import HwpxParser
from app.agent.documents.candidates import FieldCandidateExtractor

parsed = HwpxParser().parse("normalized/document.hwpx")
candidates = FieldCandidateExtractor().extract(parsed)
for candidate in candidates:
    print(candidate.model_dump_json(indent=2))
```

```bash
python -B -m app.agent.documents.candidates "normalized/document.hwpx"
python -B -m app.agent.documents.candidates "normalized/document.hwpx" --json
python -B -m app.agent.documents.candidates "parsed-document.json" --parsed-json --json
python -B -m unittest discover -s tests -p "test_field_candidate_extractor.py" -v
```

Extractor 자체는 Parser나 Normalizer를 호출하지 않는다. HWPX 입력 편의를 위한
CLI만 기존 Parser를 호출한다. JSON은 외부 전송 없이 표준 출력에 출력한다.

## 현재 한계 / TODO

- 의미 판별 전 후보이므로 짧은 일반 셀을 label로 오인할 수 있다.
- RIGHT가 있으면 해당 label의 BELOW를 생략하므로 복합 서식은 추가 검증이 필요하다.
- SAME_CELL, 본문 문단 후보, 객체 기반 체크박스, NUMBER 판별은 미구현이다.
- helper/단위 사전 밖 안내 문구, 비표준 placeholder는 누락될 수 있다.
- 병합 셀은 Parser 좌표 품질에 의존하며 실제 물리적 셀 너비를 추론하지 않는다.
- 실제 지원사업 문서 5개의 후보 정확도·누락·context 유용성 검증은 후속 통합 작업이다.
- GMS 의미 분류, SourceKey 매핑, schema/source 저장, Writer는 후속 단계이다.

v1은 단위 테스트 36개/전체 130개 통과. v2는 Candidate 61개/전체 155개 통과(2026-09-16).
실제 외부 변환 프로그램은 테스트에 필요하지 않다.


## v2 보완 (2026-09-16)

- unit-aware: LABEL/VALUE/UNIT 실제 경계를 사용한다. 기존 단위 사전과 hints.unit을
  유지하며 단위 셀은 label/target/scan 통과 대상으로 삼지 않는다. 인접 단위가 있으면
  일반 입력을 LONG_TEXT로 추정하지 않는다. NUMBER는 여전히 추론하지 않는다.
- 날짜 placeholder: 년/월/일 빈칸, 고정 4자리 연도 + 빈 월/일을 허용한다.
  실제 월/일 숫자가 기입된 날짜는 제외한다. DATE_PLACEHOLDER_PATTERNS로 관리한다.
- 일반 placeholder: 공백, 밑줄, 빈 소괄호/대괄호를 허용한다. 작성 내용이 들어간
  괄호는 제외한다. 기존 체크박스 판정도 유지한다.
- 복합 target: 모든 비어 있지 않은 줄이 helper 또는 placeholder여야 하며
  적어도 하나의 placeholder가 필요하다. 설명/실제 값이 섞이면 제외한다.
  current_text 원문을 보존하고 hints.placeholder_text/helper_text/target_kind에 기록한다.
- same-row scan: 직접 RIGHT 후보가 없을 때 오른쪽으로 연속 인접한 좌표를 탐색한다.
  MAX_FORWARD_SCAN_CELLS=3이며 target도 개수에 포함한다(최대 보조 셀 2개).
  `:`, `：`, `|`, `│`만 건너뛴다. 빈칸/helper/placeholder는 첫 target으로 선택하며
  빈 셀을 임의로 레이아웃 셀로 가정하지 않는다. 좌표 공백, 분기한 병합 셀,
  비텍스트 객체, 단위, 새로운 label, 알 수 없는 내용에서 중단한다.
  다른 label이 직접 인접한 target은 가져오지 않는다. hints.scan_cells를 기록하고
  confidence를 0.10 낮춘다. RIGHT/BELOW 우선순위와 dedup은 유지한다.
- LONG_TEXT: RIGHT는 column_span만으로 장문이 되지 않는다. row_span >= 2를 보거나,
  BELOW + column_span >= 4인 큰 서술형 영역을 유지한다. 인접 단위가 있으면 제외한다.
- FORM_MARKER_PATTERNS: 전체 문자열이 서식+숫자, 붙임+숫자,
  [별지 제N호서식] 형식인 label만 제외한다. `서식명`, `붙임자료명` 등은 유지한다.
- instruction: `※`로 시작하거나 40자 이상이고 마침표로 끝나는 기존 허용 label은
  삭제하지 않고 hints.likely_instruction=True와 confidence -0.15를 적용한다.
  기존 label 최대 길이 제한은 유지한다. 점수는 최소 0으로 제한한다.

실제 5개 문서의 v2 재검증은 사용자 manual/integration 단계로 남긴다.
특히 표시상 같은 행이어도 Parser 구조가 다르면 탐지가 달라질 수 있다.
현재 정보로 확정할 수 없는 빈 레이아웃 셀 건너뛰기, 한 셀 안 연락처 sub-field,
SAME_CELL/fragment location 및 Writer 연계는 TODO이다. 가짜 location을 만들지 않는다.


## v2.1 최소 보완 (2026-09-16)

### Unit-only target

`LABEL | UNIT`의 UNIT 셀 자체가 숫자+suffix 작성 영역일 수 있으므로 RIGHT target으로 허용한다.
지원 단위: 원, 천원, 만원, 백만원, 명, %, 개월, 건, 회.
공백을 제거하고 소괄호 한 쌍을 벗긴 후 단위 사전과 정확히 일치해야 한다.
`(원)`, `( 명 )`도 허용하지만 `500원`, `5명 이상`, `최대 500만원`, 설명 문장은 제외한다.
독립된 년/월/일은 unit-only target에서 제외하며 기존 DATE placeholder 규칙을 유지한다.

결과는 NUMBER, target_kind=unit_suffix, insertion_mode=BEFORE_SUFFIX,
정규화된 hints.unit을 갖는다. current_text와 target location/native_ref는 원문 그대로 보존한다.
RIGHT confidence는 rules.py에서 0.85로 관리한다. 기존 scan에서는 첫 unit suffix에서 멈추며
기존 scan 감점이 적용된다. BELOW unit-only 탐지는 확장하지 않는다.
Writer는 미구현이며 BEFORE_SUFFIX는 향후 작성 방식을 위한 힌트다.
괄호 안/밖 실제 삽입 위치 등 Writer 동작은 후속 설계에서 결정한다.

### Unit hint 관계와 context 분리

_context는 context 문자열만 반환한다. 별도 rules.linked_unit이 다음 경우만 unit을 제공한다.

1. target 자체가 unit-only: 정규화된 target 단위.
2. target 바로 오른쪽에 단위 셀이 하나 존재:
   `target.column_index + target.column_span == suffix.column_index`이며 행 범위가 겹침.

상하/왼쪽/좌표가 떨어진 셀이나 context 문자열에서 단위를 추정하지 않는다.
병합 경계에 여러 suffix가 닿으면 임의 선택하지 않고 hint를 생략한다.
객체/중첩 표/잘못된 좌표 셀도 suffix에서 제외한다.
`LABEL | EMPTY | UNIT`에서는 EMPTY가 target이고 UNIT은 metadata이며,
BEFORE_SUFFIX는 unit-only target에만 기록한다. 여러 unit을 모으던 hints.units는 생성하지 않는다.
주변 원/명은 context에 남을 수 있지만 hints.unit으로 자동 승격되지 않는다.

모델/Enum, DATE/helper, form marker/instruction, checkbox, 기존 LONG_TEXT heuristic,
SAME_CELL은 변경하지 않았다. 실제 필드명 전용 규칙을 추가하지 않았다.

검증: 기존 61개 중 unit target 금지 정책 테스트 2개의 기대값만 변경하고 23개 추가.
Candidate 84개 / 전체 178개 통과. 실제 카드수수료·물류비·출산급여 신청서 재검증은 별도 실행한다.
RFP는 사용자 원본 분석에 따라 negative/reference sample로 기록하며 제목별 규칙을 추가하지 않는다.

## 2026-09-18 — 문단 내부 inline blank

기존 16개 TABLE_CELL 후보를 유지하면서 paragraph의 실제 입력 공백영역을 독립 Candidate로 탐지한다.
`inline.py`의 구조 규칙만 사용하며 특정 label/SourceKey/semantic field_key 사전은 없다.

실제 card_blank.hwpx 조사:

- 신청서 하단: hp:p 하나, run 2개. 첫 run은 앞 공백 2개, 두 번째 run/t에 나머지 label·공백·suffix가 있다.
  paragraph 경로는 [0,1,1,13,0,0,4]. table_index=1,row=9,column=0 안의 paragraph_index=4.
- 동의서 하단: hp:p 하나, run 3개. 첫 업체명 공백은 첫 t 끝의 space 21개와 두 번째 run의 space 5개에 걸친다.
  세 번째 run/t에 성명 label·공백·(서명/인)이 있다. 경로는 [20], top-level paragraph_index=20.
- tab/control이 아닌 실제 ASCII space다. 경로/run style 값은 코드에 하드코딩하지 않는다.

탐지 조건: 문단 전체가 앞 여백 + 두 개 이상의 `label : 최소 4 spaces` 그룹 + 고정 괄호 suffix 형태여야 한다.
한글/영문으로 시작하는 짧은 label의 내부 공백은 보존한다. ':'와 '：'를 허용한다.
일반 문장의 여러 spaces, 이미 작성된 값, 짧은 공백, separator 없는 문장, suffix 없는 문장은 제외한다.
객체/Parser warning이 포함된 문단 및 fragment_index!=0은 후보에서 제외한다.
단일 inline field, 임의 NLP 문장, tab/control 공백, 여러 줄 입력 양식은 이번 탐지 범위 밖이다.

새 target은 `LocationType.PARAGRAPH_INLINE`, hints.target_kind=`inline_blank`, input_shape=SHORT_TEXT다.
기존 relation enum의 SAME_CELL은 동일 본문 컨테이너 내부 관계 표현으로 재사용한다.
label_location은 원문 PARAGRAPH 위치이며 target_location은 그 문단 경로와 아래 range를 가진다.

```json
{
  "type": "PARAGRAPH_INLINE",
  "native_ref": {
    "section_file": "Contents/section0.xml",
    "element_path": [20],
    "element_name": "p",
    "fragment_index": 0,
    "text_element_paths": [[20,0,0],[20,1,0],[20,2,0]],
    "inline_range": {
      "start": 5,
      "end": 31,
      "paragraph_text": "업체명 :                          성  명 :                 (서명/인)"
    }
  }
}
```

공통 section/block/table/row/column/paragraph index와 xml_id도 기존 paragraph에서 복사한다.
start/end는 Python Unicode codepoint 기준 [start,end)이며 byte/UTF-16 offset이 아니다.
current_text는 해당 range의 **정확한 원래 공백 문자열**이다. strip/collapse하지 않는다.
paragraph_text 전체로 prefix/suffix도 검증할 수 있다. 이 structural 정보는 native_ref에만 저장하며 hints에 섞지 않는다.
같은 paragraph의 range들을 독립 target으로 보존하고 start 순으로 정렬한다. candidate_id는 기존 방식으로 unique하게 부여한다.
새 후보 추가로 candidate_id가 달라질 수 있으므로 기존 schema를 재사용하지 말고 새 전처리 template을 사용한다.

기존 Parser 텍스트/경로만으로 충분하여 HwpxParser 구현/ParsedDocument 모델은 수정하지 않았다.
parser/enums.py에 location type 값 하나만 추가했다. Persistence의 StoredLocationInfo JSONB는 그대로 수용하고
Runtime도 opaque location_info를 유지하므로 두 구현 모두 수정하지 않았다.
Analyzer는 location을 생성하지 않는다. 기존 _join의 중복 field_key suffix 처리를 유지한다.
동일 BUSINESS_NAME/USER_NAME을 여러 schema field가 참조하는 것도 기존 계약에서 허용된다.

실제 fixture는 16 → 20 Candidate(기존 table 16 + inline 4). 추가 label은
`업 체 명`, `대표자`, `업체명`, `성  명`이다. 서명 suffix 자체는 후보가 아니다.
신규 탐지 테스트 14개, Writer 테스트 13개, 실제 fixture E2E 1개를 추가했다.
전체 588개 중 587개 통과, PostgreSQL 선택 통합 1개 skip.
