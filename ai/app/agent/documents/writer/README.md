# HWPX Writer v1.1

Runtime의 RESOLVED value와 저장된 location_info만 사용해 별도 HWPX를 만든다.
의미 판단, DB/Source/GMS/RAG 호출, Runtime 재실행, 원본 문서 변경을 하지 않는다.
Runtime → Writer 연결은 개발 CLI에서만 수행한다.

## 파일과 public interface

- `hwpx.py`: 경로/ZIP 검증, 전체 preflight, DOM 최소 수정, 검증, atomic 게시.
- `models.py`: HwpxWriteResult(source_path, output_path, total_fields, written_count, skipped_count).
- `errors.py`: DocumentWriteError(code), 안전한 공통 메시지와 as_dict().
- `__init__.py`: 위 public API export.
- `__main__.py`: 개발용 Runtime → Writer orchestration.

```python
from pathlib import Path
from app.agent.documents.writer import HwpxWriter

# result는 이미 실행을 완료한 DocumentRuntimeResult이다. write는 동기 파일 작업이다.
written = HwpxWriter().write(
    source_path=Path(result.normalized_path),
    runtime_result=result,
    output_path=Path('/data/test/generated/draft-unique.hwpx'),
)
```

output parent 디렉터리는 미리 준비해야 한다. 경로 정책/생성 root를 하드코딩하지 않는다.
호출자는 신뢰된 내부 경로와 접근 권한을 보장해야 한다. CLI 인자를 그대로 외부 API에 노출하면 안 된다.
결과 모델에는 값/위치를 중복 저장하지 않는다. 경로는 application 반환값에만 포함하고 CLI 기본 출력에서는 숨긴다.

## 조사한 Parser / 저장 contract

기존 `HwpxParser`는 표 안의 `subList/p/run/t`를 읽고 문단 텍스트를 LF로 결합한다.
`hp:t`의 문자열과 표시 control(lineBreak/tab/nbSpace/fwSpace/hyphen), tail을 순서대로 읽는다.
문단 밖 control/객체는 본문 문자열에 섞지 않는다. Writer는 안전하게 수정할 수 있는 일반 셀만 지원한다.

- `StoredLocationInfo`: version=1, target_location, current_text, input_shape, hints.
- `native_ref.section_file`: `Contents/sectionN.xml`, N은 section_index. section은 숫자 순서다.
- `element_path`: section XML 루트([])에서 각 요소의 요소 자식을 enumerate하여 만든 0-based index 목록.
  XML whitespace text/comment/PI는 index에 포함하지 않는다. 경로는 XPath 문자열로 변환하지 않는다.
- `element_name`: local-name. TABLE_CELL target은 실제 node의 local-name=tc 및 HWP paragraph URI도 확인한다.
- `xml_id`: 실제 id가 있으면 저장되지만 문서 전체 고유성을 가정하지 않는다. 경로가 기본 식별자다.
- table_index는 문서 전체 순차 index. row/column은 cellAddr 및 병합 span을 고려한 Parser 좌표다.
- row_order/cell_order는 해당 tbl의 tr 순서, tr의 tc 순서다. 모든 XML child index와 다르다.
- paragraph_index는 셀 문단 위치이며 TABLE_CELL 자체에서는 null이다.

Writer는 저장 경로로 DOM을 resolve하고 Parser public API가 같은 경로에 반환한 cell을 연결한다.
저장된 section/table/row/column/block/paragraph index 및 row_order/cell_order/xml_id가 있으면 대조한다.
label 검색, field_order 기반 추정, 빈 셀 순차 매칭은 없다.
Parser가 구한 현재 logical cell text와 current_text를 **trim 없이 정확히 비교**한다.
current_text=null/부재도 오류다. input_shape는 위치 envelope로 보존되지만 Writer가 의미 판단에 쓰지 않는다.
동일한 경로와 텍스트인 다른 문서를 구분하는 파일 fingerprint 계약은 아직 없다.

Extractor에는 empty/helper/unit_suffix 외에 placeholder도 있다. v1.1은 확인된 DATE placeholder만 지원한다.
Python date 또는 엄격한 YYYY-MM-DD 문자열을 지원한다. DATE+empty는 TABLE_CELL에 한해 ISO로 작성한다.
BOOLEAN checkbox 및 JSON 구조 표기 계약도 없다. 기존 모듈 변경 없이 지원 범위를 제한했다.

## 전체 preflight와 strict mode

1. ready_for_write=true 검사. USER_INPUT을 제외한 required field 상태도 재확인한다.
   USER_INPUT은 LEFT_BLANK이며 required=true여도 차단하지 않는다. 제출 가능 여부를 뜻하지 않는다.
2. HWPX 존재/일반 파일/확장자/출력 충돌 및 parent 검사.
3. source를 읽기 전용으로 읽어 고정된 snapshot 생성. Parser와 Writer가 같은 bytes를 사용한다.
4. ZIP CRC, 중복 entry, 크기 제한, section XML/DTD/depth 검사.
5. 모든 RESOLVED field의 위치/version/type/kind/current_text/value/수정 가능 구조 검사.
6. 동일 셀에 두 field가 쓰는 경우 DUPLICATE_TARGET으로 거부.
7. 모든 검증 후에만 DOM mutation. 하나라도 실패하면 전체 실패다.

LEFT_BLANK는 location/value/target kind preflight 없이 skip한다. USER_INPUT BOOLEAN/DATE도 수정하지 않는다.
나머지 optional 미해결 필드(INPUT_REQUIRED/VALUE_MISSING/NEEDS_REVIEW/UNSUPPORTED/NOT_IMPLEMENTED/ERROR)는
수정하지 않고 skipped_count에 포함한다. optional이라도 RESOLVED인데 안전하게 쓸 수 없으면 전체 실패한다.
partial draft는 제공하지 않는다. mapping_status/Source/계산/생성 판단은 Runtime 책임이다.

## 지원하는 수정 방식

기존 셀 target은 TABLE_CELL이며 문단 일부 영역은 아래 PARAGRAPH_INLINE 계약을 따른다.
target cell을 새로 만들거나 표 구조를 재생성하지 않는다.
각 셀은 한 subList, 기존 p와 run을 가져야 한다. 첫 문단의 첫 run이 insertion anchor다.
기존 run에 t가 없으면 동일 namespace의 t 하나를 추가한다. 문단/run/style을 발명하지 않는다.
객체/ctrl/범위 marker/중첩 표 및 복잡한 문단 구조는 TARGET_STRUCTURE_UNSUPPORTED다.

| target_kind | 수정 | logical result 예 |
| --- | --- | --- |
| empty | 단일 문단의 기존 t 내용(공백 포함)만 비우고 첫 run에 값 삽입 | `성현상사` |
| helper | 첫 문단 첫 t 앞에 값 삽입. helper 텍스트/기존 노드는 유지 | `도소매업\n(사업자등록증 상)` |
| unit_suffix | BEFORE_SUFFIX만 지원. 기존 suffix 전체 앞에 값 삽입 | `4000000 원` |

empty의 여러 whitespace 문단은 문단을 삭제하지 않고는 정확한 목표 텍스트를 만들 수 없어 거부한다.
helper는 hints.helper_text=current_text도 확인한다. 기존 helper 텍스트와 후속 run/style은 그대로 남긴다.
새 값은 anchor run의 기존 글자 스타일을 사용한다. helper 앞에 별도 문단/스타일을 만들지 않는다.
unit을 새로 붙이거나 중복시키지 않는다. 기존 공백과 suffix를 모두 보존한다.

## Value와 multiline

- TEXT: 문자열 그대로. XML 특수문자는 DOM이 escape한다. 줄바꿈 LF는 기존 namespace의 `hp:lineBreak`로 표현한다.
- NUMBER: int/유한 float/유한 Decimal. 쉼표/통화 기호를 추가하지 않는다.
- Decimal은 float 변환 없이 `format(value, 'f')`로 일반 십진 문자열을 만든다.
- float는 현재 float의 `str` 표현을 Decimal로 바꿔 지수 표기만 제거한다. 부동소수점 정밀도를 복구하지는 않는다.
- DATE는 한국어 placeholder와 TABLE_CELL empty를 지원한다. BOOLEAN/JSON은 계속 VALUE_TYPE_UNSUPPORTED다.
  숫자 문자열/bool을 NUMBER로 임의 해석하지 않는다.
- 빈 값, 비유한 수, XML 금지 문자, CR/tab 삽입은 거부한다. tab의 width/leader 계약은 후속 지원 대상이다.
- 값은 최대 100,000자, ZIP 압축 파일/전체 entry 비압축 합계는 각 128 MiB 제한이다.
  Parser의 기존 section/total/depth 제한도 적용한다.

한컴 공식 설명에 따라 LF는 `hp:t` 안의 `hp:lineBreak`로 표현한다:
[줄 나눔 안내](https://forum.developer.hancom.com/t/owpml-hp-t/1685).
텍스트가 바뀐 문단의 optional `linesegarray`만 제거해 기존 레이아웃 캐시를 무효화한다:
[텍스트 수정 시 레이아웃 캐시 안내](https://forum.developer.hancom.com/t/hwpx-section0-xml/2414/2).
paraPrIDRef/styleIDRef/charPrIDRef, cell geometry, 표 속성은 유지한다. 폰트/폭/페이지 재배치는 편집기 책임이다.
셀의 높이나 페이지 수를 계산하지 않으므로 긴 GENERATED 내용의 실제 표시/넘침은 한글에서 확인해야 한다.

## namespace / archive / atomic output

신규 dependency 없이 표준 xml.dom.minidom 사용. 원래 namespace prefix와 선언, 주석/PI를 유지한다.
ElementTree serialize로 ns0/ns1을 새로 만들지 않는다. 변경 section만 UTF-8 XML로 serialize한다.
속성 따옴표/빈 태그/선언 등 lexical 표현은 달라질 수 있지만 요소/style 의미는 유지한다.

ZipInfo 복사로 entry 순서/date_time/compression type/comment/extra/external attributes를 가능한 한 유지한다.
archive comment도 복사한다. mimetype의 존재/순서/압축 방식은 원본대로 둔다. 임의 entry 추가는 없다.
변경하지 않은 모든 entry는 압축 해제한 payload bytes가 동일하다. 재압축 bytes/CRC/size/offset은 변경될 수 있다.
미리보기 이미지/텍스트 entry는 재생성하지 않으므로 preview가 이전 내용을 보여줄 수 있다.

output parent 아래 TemporaryDirectory에서 snapshot과 draft를 생성한다. source에는 쓰기 핸들을 열지 않는다.
완성 draft의 CRC + 기존 HwpxParser 재파싱 + 작성 셀 expected logical text를 모두 검사한다.
fsync 후 같은 파일시스템의 os.link로 최종 경로를 **atomic create-if-absent** 한다.
os.replace처럼 경합 중 생긴 기존 결과를 덮어쓰지 않는다. hard link 미지원 파일시스템은
OUTPUT_PUBLISH_FAILED로 실패하고 임의 overwrite fallback은 하지 않는다. EC2의 일반 ext4 및 NTFS 대상이다.
실패 시 임시 폴더를 정리하며 preflight/mutation/검증 실패 파일을 완성본으로 남기지 않는다.
이 보장은 프로세스 정상 예외 처리 기준이며 전원 중단 후 디렉터리 durability 보장까지 제공하지 않는다.

## 오류 / 로그

DocumentWriteError는 HTTPException이 아닌 application 오류다. code만 구분하고 안전한 공통 문구를 반환한다.
XML/value/서버 경로/원본 exception/stack trace는 Writer 로그나 오류에 담지 않는다.

주요 code:
WRITER_NOT_READY, SOURCE_FILE_NOT_FOUND, SOURCE_NOT_FILE, UNSUPPORTED_SOURCE_FORMAT,
INVALID_HWPX_ARCHIVE, DOCUMENT_LIMIT_EXCEEDED, LOCATION_INFO_MISSING, LOCATION_VERSION_UNSUPPORTED,
TARGET_TYPE_UNSUPPORTED, TARGET_KIND_UNSUPPORTED, SECTION_FILE_NOT_FOUND, TARGET_PATH_NOT_FOUND,
TARGET_ELEMENT_MISMATCH, TARGET_METADATA_MISMATCH, TARGET_CONTENT_MISMATCH, TARGET_STRUCTURE_UNSUPPORTED,
INSERTION_MODE_UNSUPPORTED, DUPLICATE_TARGET, VALUE_TYPE_UNSUPPORTED, INVALID_VALUE,
TEXT_CHARACTER_UNSUPPORTED, VALUE_LIMIT_EXCEEDED, SOURCE_OUTPUT_CONFLICT, OUTPUT_ALREADY_EXISTS,
UNSUPPORTED_OUTPUT_FORMAT, OUTPUT_DIRECTORY_NOT_FOUND, OUTPUT_VALIDATION_FAILED, OUTPUT_PUBLISH_FAILED,
WRITER_FAILED. CLI의 Runtime/input 오류는 WRITER_CLI_FAILED로 숨긴다.

## 실제 검증 CLI

ai 또는 Docker /app에서 기존 DB/GMS 환경을 사용한다. 이 작업에서는 실제 외부 호출을 하지 않았다.
output parent는 개발자가 미리 준비하고 매 실행 새 파일명을 사용한다.

```sh
python -B -m app.agent.documents.writer 123 456 \
  --output /data/test/generated/draft-001.hwpx

# GENERATED 실행이 필요할 때만 실제 GMS 허용:
python -B -m app.agent.documents.writer 123 456 \
  --generate \
  --output /data/test/generated/draft-002.hwpx
```

CLI는 기존 Runtime CLI의 run wrapper/--generate 의미를 재사용한다. Core Writer는 Runtime을 호출하지 않는다.
--generate가 없으면 GMS는 비활성이다. required GENERATED가 해결되지 않으면 strict Writer는 거부한다.
경로는 Runtime.normalized_path를 사용한다. 입력 template은 COMPLETED/작성용 제한을 기존 Runtime이 검사한다.
CLI 출력은 total/written/skipped만 포함하며 values와 내부 경로는 숨긴다.

실제 5개 지원사업 문서 검증 순서:

1. 원본 normalized HWPX 해시를 기록하고 해당 template의 Runtime 결과를 준비한다.
2. 새로운 output 경로로 실행한다. stale/미지원 target은 코드를 우회하지 말고 schema/XML을 조사한다.
3. output을 HwpxParser로 읽어 기대 셀의 text 확인. 원본 해시 동일 여부도 확인한다.
4. 한글에서 열어 빈 셀, helper/단위 간격, 글자 스타일, 줄바꿈, 긴 문장의 셀 넘침/페이지 배치 확인.
5. 저장/재열기와 사용자 A/B 별도 결과 생성도 확인한다. output을 template으로 다시 사용하지 않는다.

## 검증 결과 / 제한

v1 당시 저장소에 실제 .hwpx fixture가 없어 최소 XML 구성 함수를 사용했다.
v1.1에서는 사용자가 지정한 실제 빈 서식의 비식별 fixture를 추가했다.
Parser → CandidateExtractor → StoredLocationInfo → Writer → Parser round-trip을 테스트했다.
실제 카드수수료 서식 round-trip은 v1.1 테스트로 수행했다. 한글 렌더링/나머지 실문서 검증은 별도다.

신규 Writer/CLI 56개 통과. 전체 539개 중 538개 통과, PostgreSQL 선택 통합 1개 skip.
Runtime 83(Generated 25/Computed 19 포함), Source 29, Analyzer 93, Persistence 24(+PG skip 1),
Preprocessing 17, Batch 36, Normalizer 30, Parser 35, Candidate 84, OCR 51 포함.
로컬 Python 3.12 + 임시 API/OCR 의존성 환경 결과이며 배포 Python 3.11/Docker 검증은 별도다.

```sh
python -B -m unittest discover -s tests -p test_document_writer.py
python -B -m unittest discover -s tests
```

Normalizer/Parser/Extractor/Analyzer/Prompt/Persistence/Preprocessing/Batch/Source/Runtime/RAG/core/
공용 설정/requirements/migration은 수정하지 않았다. DB 저장/API/DOCX Writer도 추가하지 않았다.
지원하지 않는 구조는 오류로 남기며 location 생성 계약을 변경하거나 추정해서 쓰지 않는다.


## v1.1 — DATE placeholder / LEFT_BLANK (2026-09-18)

### 실제 XML 조사와 최소 mutation

사용자가 지정한 manual/normalized/normalized-u4uw8zks.hwpx는 빈 카드수수료 서식이다.
개업일 target은 section0.xml의 element_path=[0,1,1,9,1], table_index=1,row=5,column=3이다.
첫 p는 charPrIDRef=12인 run/t의 `년    월    일`이다. 두 번째 p에는
charPrIDRef=13의 `(`와 charPrIDRef=14의 `사업자등록증 상)`이 분리되어 있다.
두 문단은 기존 linesegarray를 각각 갖는다. 코드에는 이 경로나 style ID를 하드코딩하지 않는다.

지원 조건은 target_kind=placeholder, value_type=DATE, placeholder_text가 공백으로 구분된 `년 월 일` 패턴이다.
첫 문단의 text-only t 노드들을 합쳤을 때 placeholder_text와 정확히 일치해야 한다.
helper가 있으면 current_text는 placeholder_text + LF + helper_text와 일치해야 한다.
따라서 동일 문단에 helper가 섞인 레이아웃/inline controls/다른 날짜 패턴은 안전하게 거부한다.

- date(2022,3,15) 또는 유효한 ISO `2022-03-15` → `2022년 03월 15일`.
- compact date/datetime 문자열/잘못된 달력 날짜는 INVALID_DATE_VALUE.
- 날짜 첫 text node만 렌더링 값으로 바꾸고 나머지 placeholder text 조각은 비운다. run/t/style은 유지한다.
- 변경한 첫 문단의 layout cache만 제거한다. helper 문단의 node/run/style/cache는 수정하지 않는다.
- 원래 current_text 전체의 정확 비교와 output Parser logical text 검증은 계속 수행한다.
- missing/unknown placeholder 정의 또는 다른 XML 배치는 DATE_PLACEHOLDER_UNSUPPORTED.
- 다른 value_type의 placeholder, DATE+empty, BOOLEAN checkbox rendering은 지원하지 않는다.

### USER_INPUT 보존

USER_INPUT은 Runtime이 LEFT_BLANK/null로 확정한다. Writer는 status 기준으로 skip하며
consent 등의 key나 동의/서명 label을 검사하는 business semantic hardcode는 없다.
LEFT_BLANK BOOLEAN/DATE는 value validation 및 location preflight도 하지 않는다.
ready_for_write는 자동작성 required field 해결 여부이며 완성 신청서/제출 가능 여부가 아니다.
동의/미동의/서명/직접 기재/자동 Source가 없는 신청일자 등은 원본 상태가 그대로 남는다.

### 실제 fixture 검증

`tests/fixtures/writer/card_blank.hwpx`는 확인한 빈 서식에서 creator/lastsaveby metadata만 제거한 fixture다.
사용자 작성 결과는 저장하지 않았다. 테스트 작성값도 임시 폴더에만 생성한다.
Parser → CandidateExtractor → StoredLocationInfo → 실제 Runtime+SourceService(fake provider)
→ Writer → Parser를 실행했다. 저장된 mapping은 사용자 제공 16개 필드 분류를 fixture 테스트에 명시한다.

9 RESOLVED / 5 LEFT_BLANK / 2 UNSUPPORTED, ready_for_write=true, written=9/skipped=7을 검증했다.
두 동의 표/생년월일/optional 매출/연락처/서명 등을 포함해 **작성 대상 밖 모든 셀의 XML 동일성**을 검사한다.
개업일 helper 문단의 XML과 normalized 원본 bytes도 동일함을 확인했다.
운영 DB/GMS/RAG는 호출하지 않았다. 신규 Writer 정책 14개(실제 fixture 1개 포함), 기존 Writer 1개 수정.
Writer 전체 70개 통과. 전체 560개 중 559개 통과, PostgreSQL 선택 통합 1개 skip.

### 수동 E2E 재실행

카드수수료 신청서에 GENERATED가 없으면 --generate가 필요 없다. --user-inputs는 두 CLI에서 제거했다.
Docker /app에서 아래를 실행한다. template/user ID는 실제 DB에 맞춰 확인한다.

```sh
python -B -m app.agent.documents.runtime 1 1 --show-values
mkdir -p /data/test/manual/generated
# 실제 normalized_path의 실행 전 해시를 별도로 기록:
sha256sum /data/test/manual/normalized/normalized-u4uw8zks.hwpx
python -B -m app.agent.documents.writer 1 1 \
  --output /data/test/manual/generated/draft-001.hwpx
sha256sum /data/test/manual/normalized/normalized-u4uw8zks.hwpx
python -B -m zipfile -t /data/test/manual/generated/draft-001.hwpx
```

원본 경로는 Runtime.normalized_path를 기준으로 치환한다. 기존 output을 덮어쓰지 않으므로 재실행마다 새 이름을 쓴다.
Windows 한글에서 개업일/업종 helper, 값의 위치/style, 상시근로자 단위, 동의/미동의 선택 상태,
생년월일/매출/서명/연락처 원본 유지 및 줄넘침을 확인한다. 위 hash/ZIP 검사는 화면 렌더링 검증을 대체하지 않는다.

## Inline blank 확장 (2026-09-18, 최신 지원 범위)

TABLE_CELL의 기존 empty/helper/unit_suffix/DATE placeholder 동작에
PARAGRAPH_INLINE + inline_blank + 단일 줄 TEXT를 추가한다. 날짜/숫자/BOOLEAN/JSON이나 multiline은
inline에 추가하지 않는다. Source/Analyzer semantic/key를 Writer가 판단하지 않는다.

### 위치와 stale guard

native_ref.section_file/element_path는 paragraph hp:p를 가리킨다. 공통 좌표와 xml_id/fragment_index/
text_element_paths도 Parser 결과와 대조한다. native_ref.inline_range는 다음을 보존한다:

- start, end: 원본 paragraph logical text의 codepoint [start,end).
- paragraph_text: 전처리 당시 원문 전체. prefix/suffix/label/fixed text를 포함한 stale guard.
- location_info.current_text: 해당 range의 원래 spaces. trim/공백 collapse 없이 정확 비교.

새 location type 이외 Parser 구현/모델은 변경하지 않았다. StoredLocationInfo version=1의 기존 JSONB로 저장한다.
Analyzer prompt에는 location/native_ref/inline_range/XML을 전달하지 않는다. context에는 사람이 읽는 문단만 제공한다.
실제 Writer에서는 p/run/t text-only 구조를 다시 확인한다. control/객체/범위 marker가 섞이면 거부한다.
잘못된 범위는 INLINE_RANGE_INVALID, 원문 변화는 TARGET_CONTENT_MISMATCH로 실패한다.

### 다중 target과 mutation

모든 field를 원본 snapshot에서 preflight한 후 같은 문단의 edits를 묶어 start 내림차순으로 적용한다.
따라서 앞쪽 값의 길이가 달라져도 뒤쪽 target을 밀지 않는다. range가 겹치거나 cell 전체와 그 내부 paragraph가
동시에 작성 대상으로 지정되면 DUPLICATE_TARGET으로 실패한다. 겹치지 않는 두 inline range는 정상이다.

paragraph codepoint를 기존 text node별 offset으로 연결한다. range가 여러 run/t를 통과하면
첫 겹친 text node에 값을 삽입하고 나머지 node에서는 해당 공백 substring만 제거한다.
label/다음 label/(인)/(서명/인) 및 text range 밖의 문자열은 그대로다. run/t/paragraph와 style 참조는 유지한다.
추가 run이나 단일 새 paragraph 문자열로 재생성하지 않는다. 변경 문단의 linesegarray만 기존 정책대로 무효화한다.

**공백 전체를 값으로 치환**한다. padding/폭 계산/자동 trailing spaces는 없다. 따라서
`업체명 :[spaces]대표자 :[spaces](인)`은 `업체명 :값대표자 :값(인)`이 될 수 있다.
blank에 속하지 않은 공백은 유지한다. 시각적 간격/긴 업체명의 줄밀림은 Windows 한글에서 확인해야 한다.

출력은 기존 atomic no-clobber/CRC/XML/Parser 검증을 유지한다. inline은 같은 문단의 모든 수정을 반영한
최종 logical text를 계산해 재파싱 결과와 정확히 비교한다. LEFT_BLANK/optional UNSUPPORTED는 preflight 없이 skip한다.

### 실제 fixture E2E 및 semantic 한계

card_blank.hwpx에서 기존 TABLE_CELL 16개와 새 inline 4개를 탐지했다.
기존 GmsSchemaAnalyzer에 fake 응답을 주입하여 20개 schema-like field를 연결했다.
같은 SourceKey를 반복 허용하고 기존 _join이 business_name/business_name_2/business_name_3 및
대표자 key suffix를 unique하게 만드는 것을 검증했다. Extractor는 semantic field_key를 만들지 않는다.

실제 Runtime + fake Source values → Writer → Parser 결과:

- BUSINESS_NAME 3곳, USER_NAME 4곳(기존 표의 대표자/성명 2곳 + inline 2곳) 작성.
- 자동작성 총 13개, USER_INPUT LEFT_BLANK 5개, optional UNSUPPORTED 2개 보존.
- `(인)`, `(서명/인)` 유지. 서명/체크 자체는 생성하지 않는다.
- 수정하지 않은 sibling paragraphs, 동의/미동의 XML, helper 및 비관련 표, run/style 속성 보존.
- source bytes/hash 불변, valid ZIP 및 Parser round-trip 통과.

실제 GMS/RAG/운영 DB 호출은 하지 않았다. E-mail은 이 테스트에서 명시한 fake DIRECT/USER_EMAIL 매핑이다.
이는 실제 Analyzer의 semantic 재현성을 보장하지 않는다. 재전처리 시 user_email의 실제 분류를 별도로 확인한다.
여전히 USER_INPUT이면 Analyzer nondeterminism/source mapping 문제로 분리하여 검토한다. Prompt는 수정하지 않았다.

신규 테스트: Candidate 14, Writer 13, 실제 fixture E2E 1. 전체 588개 중 587개 통과/PG 선택 통합 1개 skip.
기존 16개 table-only E2E는 TABLE_CELL 후보만 필터링하여 유지했다. fixture 원본 자체는 변경하지 않았다.

### 사용자 수동 E2E

기존 template에는 inline 위치가 없으므로 **반드시 재전처리해 반환된 새 template_id를 사용**한다.
아래 전처리는 사용자가 실행하는 실제 DB/GMS 작업이다. 이번 구현 검증에서는 실행하지 않았다.

```sh
python -B -m app.agent.documents.preprocessing \
  1 /data/test/manual/original/test.hwp /data/test/manual/normalized \
  --original-format HWP

python -B -m app.agent.documents.runtime <template_id> 1 --show-values

python -B -m app.agent.documents.writer <template_id> 1 \
  --output /data/test/manual/generated/draft-inline-test.hwpx

python -B -m zipfile -t /data/test/manual/generated/draft-inline-test.hwpx
```

output parent를 준비하고 재실행 시 새로운 파일명을 사용한다. Runtime 결과에서 반복 SourceKey 및 user_email 분류를 확인한다.
원본 SHA-256 불변 확인 후 Windows 한글에서 다음을 점검한다:

- 업체명 3곳과 대표자/성명 반복 위치의 실제 값
- `(인)`, `(서명/인)` 보존, 동의/미동의 선택 안 됨, 생년월일/서명 원본 유지
- 문단/run/style, 줄 밀림, 페이지 배치 및 HWPX 열기 오류 없음

현재 제한: 최소 두 label 그룹과 괄호 suffix 패턴만 탐지, ASCII space blank만 지원,
text-only paragraph/단일 줄 TEXT만 수정, visual width engine 없음. DOCX/Draft API/migration은 추가하지 않았다.

## USER Source 후속 — DATE + empty (2026-09-18)

이 항목은 이전 버전의 DATE+empty 미지원 및 생년월일 보존 기대를 대체한다.
RESOLVED + DATE + TABLE_CELL + empty는 Python date 또는 엄격한 YYYY-MM-DD 문자열을
기존 placeholder와 공유하는 parse_date로 검증하고 YYYY-MM-DD 그대로 작성한다.
달력상 유효하지 않은 날짜/compact date/datetime/공백 포함 문자열은 INVALID_DATE_VALUE다.
기존 한국어 placeholder는 YYYY년 MM월 DD일이며 helper/run/style 보존 동작을 유지한다.
DATE + inline/helper/unit_suffix 및 BOOLEAN/JSON rendering은 지원하지 않는다.
LEFT_BLANK 날짜/동의는 계속 skip한다. stale guard, 원본 보호, ZIP/Parser 재검증은 동일하다.

실제 card_blank.hwpx + fake GMS/Source E2E에서 작성14 / LEFT_BLANK4 / UNSUPPORTED2.
BUSINESS_NAME 3곳, USER_NAME 4곳, USER_EMAIL, USER_BIRTH_DATE(1999-01-23)를 검증했다.
동의/미동의 XML, (인)/(서명/인), 비작성 문단, 원본 bytes를 보존한다.
이는 실제 GMS 또는 DB 검증이 아니다. 한글의 화면 배치/줄넘침/페이지 밀림은 육안 확인해야 한다.
재전처리는 기존 template ID를 재사용할 수 있으므로 반환된 ID로 Runtime/Writer를 실행한다.
최신 수동 명령과 SQL은 docs/document-agent-progress.md의 USER Source 보완 항목을 따른다.
