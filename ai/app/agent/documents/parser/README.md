# HWPX 구조 Parser

문서의 문단/표/셀과 위치만 읽는 독립 모듈이다.
DB, Normalizer 호출, 의미 해석, 필드 후보, SourceKey, LLM, Writer는 포함하지 않는다.
입력은 Normalizer가 이미 생성한 HWPX다. HWP/DOC/DOCX 직접 입력은 거부한다.

## 파일과 공통 모델

- enums.py: Parser용 DocumentFormat(HWPX/DOCX), LocationType.
  Normalizer의 HWP/DOC까지 포함하는 Enum을 수정하거나 import하지 않는다.
- models.py: Pydantic 구조 모델과 discriminator 기반 ParsedBlock union.
- errors.py: 내부 경로/XML/stack trace를 포함하지 않는 오류.
- base.py: 향후 DOCX Parser도 따를 DocumentParser Protocol.
- hwpx.py: ZIP/XML 읽기 전용 HwpxParser.
- __init__.py: 공개 진입점.
- __main__.py: JSON 디버그 CLI.
- tests/test_document_parser.py: 최소 HWPX ZIP fixture를 생성하는 단위 테스트.

```text
ParsedDocument
  format: HWPX | DOCX
  sections[]
    section_index
    blocks[]: ParsedParagraph | ParsedTable (실제 순서)
      Paragraph: text, location, has_non_text_content
      Table: table_index, location, rows[]
        Row: row_index, cells[]
          Cell: row/column_index, row/column_span
                text, paragraphs[], blocks[], is_empty
                has_non_text_content, location
  metadata: warnings[]
```

Cell.blocks가 셀 내부의 문단/중첩 표 순서를 보존한다.
Cell.paragraphs는 그 셀에 직접 속한 문단 조각만 제공하는 편의 목록이다.
Cell.text는 직접 문단들을 줄바꿈으로 합친 값이며, 중첩 표 텍스트를 중복 평탄화하지 않는다.
중첩 표의 텍스트는 Cell.blocks → Table.rows → Cell에서 확인한다.
is_empty는 직접 텍스트가 공백뿐이고, 비텍스트 개체도 없으며,
중첩 표에도 내용 있는 셀이 없는 경우 True다.
이미지/수식만 있는 셀은 text=""여도 has_non_text_content=True, is_empty=False다.
비텍스트 내용은 구조 경고만 남기고 실제 이미지/수식을 모델로 만들지 않는다.

## HWPX 구조 근거와 namespace

HWPX의 section은 hs:sec → hp:p → hp:run → hp:t/hp:tbl 형태다.
표는 hp:tbl → hp:tr → hp:tc → hp:subList → hp:p를 읽는다.
셀 주소와 span은 subList 뒤에 올 수 있으므로 자식 전체에서 이름으로 찾는다.
변환기와 같은 생태계의 원본 라이브러리 구현을 확인했다.

- [hwpxlib CellAddr](https://github.com/neolord0/hwpxlib/blob/main/src/main/java/kr/dogfoot/hwpxlib/object/content/section_xml/paragraph/object/table/CellAddr.java)
- [hwpxlib CellSpan](https://github.com/neolord0/hwpxlib/blob/main/src/main/java/kr/dogfoot/hwpxlib/object/content/section_xml/paragraph/object/table/CellSpan.java)
- [hwpxlib 문단 텍스트 T](https://github.com/neolord0/hwpxlib/blob/main/src/main/java/kr/dogfoot/hwpxlib/object/content/section_xml/paragraph/T.java)

표준 라이브러리 zipfile과 xml.etree.ElementTree를 사용한다. 새 dependency는 없다.
namespace prefix 자체를 비교하지 않고 ElementTree의 expanded tag에서 local-name을 사용한다.
hp 대신 다른 prefix나 default namespace를 사용하는 문서도 처리한다.
이 전략은 HWPX 구조 안의 이름을 전제로 하며, 동일 local-name을 사용하는 임의의 외부
확장 vocabulary 전체를 구분하는 범용 XML 해석기는 아니다.

## section / block / table / paragraph index 정책

모든 index는 0 기반이다.

- Contents/section([0-9]+).xml만 선택하며 section 숫자로 정렬한다.
  section0, section2, section10 순서이고 section_index는 파일명의 실제 숫자다.
  번호 공백은 유지한다. 중복 숫자(section1/section01 포함)는 오류다.
- block_index는 해당 컨테이너의 blocks 목록 기준이다.
  Section.blocks와 각 Cell.blocks는 각각 0부터 시작한다.
- table_index는 문서 전체 깊이 우선 등장 순서다. 부모 표 → 그 안의 중첩 표 → 다음 표 순이다.
- paragraph_index는 해당 컨테이너 안에서 원본 hp:p가 등장한 순서다.
- 표 안의 문단은 section 본문 문단으로 재수집하지 않는다.

일반 hp:p는 run 텍스트를 합친 Paragraph 하나가 된다.
표만 앵커로 가진 hp:p에서 가짜 빈 문단을 만들지 않고 Table만 내보낸다.
실제 빈 hp:p는 유지하되 layout XML을 별도 문단으로 만들지는 않는다.

하나의 hp:p가 '텍스트 A → 표 → 텍스트 B'라면
Paragraph(A), Table, Paragraph(B) 순서로 표현한다.
이 경우 두 Paragraph는 같은 원본 element_path/paragraph_index를 가지고
fragment_index 및 text_element_paths로 구별한다.
이 정책은 표의 읽기 순서와 원본 문단 소속을 함께 유지하기 위한 것이다.

XML 앵커 순서를 보존하며, 좌표 기반 렌더링 순서/다단 배치의 시각적 읽기 순서를
계산하지는 않는다. 떠 있는 표/개체는 XML 앵커 순서로 나온다.

## 텍스트

각 hp:t의 text와 자식 tail을 문서 순서로 합친다.
run 사이에는 임의의 공백을 넣지 않는다. XML entity는 XML Parser가 복원한다.
lineBreak/ tab / nbSpace / fwSpace / hyphen은 각각 줄바꿈/탭/비분리 공백/전각 공백/하이픈으로 처리한다.
글자 서식 속성, 제어 명령, fieldBegin 값, XML 태그·namespace 문자열은 텍스트로 출력하지 않는다.
표 내부도 같은 추출 함수를 사용한다.

## Row / Cell / 병합

- 실제 tr 순서대로 ParsedTableRow를 만든다.
- Row.row_index는 첫 셀의 유효한 cellAddr.rowAddr가 있으면 그 값을 쓰고,
  없으면 tr의 등장 순서를 사용한다.
- Cell.row_index / column_index는 cellAddr.rowAddr / colAddr를 우선한다.
- cellSpan.rowSpan / colSpan이 없거나 잘못된 값이면 1로 보완한다.
  잘못된 값은 INVALID_CELL_GEOMETRY 경고를 남긴다.
- 좌표가 없는 셀은 XML 순서를 따라 배치하되 앞선 셀의 행/열 span 점유 영역을 건너뛴다.
- 병합으로 가려진 자리에 가짜 셀을 추가하지 않는다.
- 명시 좌표가 겹치거나 같은 tr 안에서 행 주소가 다르면 값을 임의로 고치지 않고 경고한다.
  각 tc의 정확한 원본 element_path는 유지한다.
- 누락된 주소를 추론한 좌표는 원본 파일의 모든 비정상 구조를 복원한다는 보장이 없다.

## DocumentLocation / native_ref

주요 Paragraph/Table/Cell마다 공통 index와 다음 정보가 붙는다.

```json
{
  "section_file": "Contents/section0.xml",
  "element_path": [2, 0, 1, 3, 0],
  "element_name": "tc",
  "row_order": 0,
  "cell_order": 0
}
```

- element_path: section 루트부터 순서대로 따라가는 XML **요소 자식 index** 목록.
- element_name: 재탐색 후 확인할 local-name.
- xml_id: 원본에 id가 있을 때만 보조 정보로 저장.
  HWPX의 id="0" 등이 중복될 수 있어 ID만으로 대상을 찾지 않는다.
- Paragraph: fragment_index와 해당 조각의 text_element_paths를 추가한다.
- Cell: 실제 tr/tc 순서인 row_order/cell_order를 추가한다.
- cell의 block_index는 소속 Table의 컨테이너 내 block_index다.
  셀 내부 Paragraph의 block_index는 Cell.blocks 기준이다.
- 중첩 Table은 자체 table_index와 element_path로 식별한다.
  전체 상위 셀 관계는 ParsedDocument의 트리를 따라 확인한다.

향후 Writer는 동일한 XML을 ElementTree 기본 방식(주석/PI 미포함)으로 읽고 다음처럼 찾는다.

```python
node = section_root
for child_index in location.native_ref["element_path"]:
    node = node[child_index]
assert node.tag.rsplit("}", 1)[-1] == location.native_ref["element_name"]
```

문서/XML 구조가 변경되면 index 경로가 달라질 수 있다.
이 위치는 **파싱한 원본 버전**에 대한 참조이며, 수정 후에는 재파싱하거나 Writer가 매핑을 갱신해야 한다.
전체 XML, Element 객체, 서버 파일 경로는 결과에 저장하지 않는다.

## 미지원 구조 / TODO

- 이미지·도형·수식·OLE 등은 존재 여부와 native_ref 경고만 기록한다.
- 머리말/꼬리말, 각주/미주, 도형 내부 텍스트, ctrl 내부 별도 본문, 표 caption은 별도 모델화하지 않는다.
- switch/case 등 확장 분기는 임의의 분기를 선택하거나 합치지 않고 경고 후 건너뛴다.
- 변경 추적에 대한 최종 표시 상태, 숨김 서식, 자동 번호·필드 계산값은 해석하지 않는다.
  XML에 직접 들어 있는 텍스트 기준이며 렌더러와 동일한 가시성 판정은 아니다.
- cell의 첫 subList를 사용한다. 복수 subList 등 드문 변형은 실제 5개 파일에서 확인 후 지원한다.
- 미지원 구조로 발견한 하위 텍스트를 section 본문에 잘못 평탄화하지 않는다.
- metadata.warnings의 code/native_ref를 확인하고 실제 5개 지원사업 문서로 누락 구조를 점검한다.
- DOCX Parser는 향후 같은 ParsedDocument/DocumentParser 계약으로 별도 구현한다.
- 의미 해석, FieldCandidateExtractor, SourceKey 매핑, DB 저장, Writer는 별도 단계다.

지원사업 program_document의 존재와 type='작성용' 검사는 상위 Service 책임이다.
이 Parser에는 DB 접근이나 작성용/제출용 구분을 넣지 않는다.

## 입력 검증 / 오류

.hwpx 확장자(대소문자 무관), 존재/일반 파일, ZIP, section 존재, XML 구문, sec 루트를 검사한다.
손상 ZIP/필수 section 부재/malformed XML은 구분된 DocumentParseError가 된다.
외부에는 exc.as_dict()만 반환하며 원래 예외의 경로나 stack trace를 반환하지 않는다.

XML DTD는 거부한다. 기본 제한은 section당 16 MiB, 전체 section XML 64 MiB, XML 깊이 128이다.
필요하면 HwpxParser 생성자로 조정한다. 파일을 압축 해제하여 디스크에 쓰지 않는다.
일반적인 미지원 개체는 실패 대신 warnings로 남긴다.

## 테스트 및 실제 문서 출력

ai 디렉터리에서 실행:

```powershell
python -B -m unittest discover -s tests -p test_document_parser.py -v
python -B -m app.agent.documents.parser "normalized/document.hwpx"
```

JSON 저장(Python으로 UTF-8 파일 작성):

```python
from pathlib import Path
from app.agent.documents.parser import HwpxParser

parsed = HwpxParser().parse(Path("normalized/document.hwpx"))
print(parsed.model_dump_json(indent=2))
Path("parsed.json").write_text(parsed.model_dump_json(indent=2), encoding="utf-8")
```

출력 파일은 호출자가 별도 이름으로 저장한다. 입력 HWPX 경로를 출력 경로로 사용하지 않는다.
Parser 자체는 읽기만 한다. 단위 테스트에서 원본 SHA-256 전후 동일 여부를 확인한다.

실제 지원사업 HWPX 5개는 별도 통합 검증 대상으로 남아 있다.
각 파일의 JSON과 원본 화면을 비교해 문단/표 순서, 병합 주소, 빈 셀, 중첩 표,
warnings를 확인하고 native_ref를 따라 실제 XML 요소가 다시 찾아지는지 점검한다.
Normalizer는 이미 검증된 변환 결과를 공급하며 이 Parser 구현 때문에 변경하지 않는다.


## PARAGRAPH_INLINE location 확장 (2026-09-18)

LocationType enum에 PARAGRAPH_INLINE을 추가했다. Parser 자체는 이 target을 만들지 않는다.
기존 ParsedParagraph의 text/location/native_ref를 이용해 CandidateExtractor가 inline 입력영역을 만든다.
새 metadata는 target_location.native_ref.inline_range에 start/end/paragraph_text를 담는다.
Parser의 XML 읽기, text 추출, element_path traversal 및 section/table index 정책은 변경하지 않았다.
Writer 재파싱도 기존 public HwpxParser.parse를 그대로 사용한다.
자세한 range/current_text 계약은 candidates/README.md와 writer/README.md를 참조한다.
