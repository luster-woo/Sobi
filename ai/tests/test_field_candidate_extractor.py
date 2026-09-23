import unittest
from unittest.mock import patch

from pydantic import ValidationError

from app.agent.documents.parser.enums import DocumentFormat, LocationType
from app.agent.documents.parser.models import (
    DocumentLocation, ParsedDocument, ParsedParagraph, ParsedSection,
    ParsedTable, ParsedTableCell, ParsedTableRow,
)
from app.agent.documents.candidates import FieldCandidateExtractor
from app.agent.documents.candidates.enums import CandidateRelation as R, FieldInputShape as S
from app.agent.documents.candidates.normalizer import normalize_label
from app.agent.documents.candidates import rules


def cell(row, column, text="", *, cs=1, rs=1, table=0, section=0, objects=False):
    location = DocumentLocation(
        type=LocationType.TABLE_CELL, section_index=section, table_index=table,
        row_index=row, column_index=column, block_index=0,
        native_ref={"section_file": f"Contents/section{section}.xml",
                    "element_path": [table, row, column], "element_name": "tc",
                    "row_order": row, "cell_order": column},
    )
    return ParsedTableCell(row_index=row, column_index=column, row_span=rs, column_span=cs,
                           text=text, paragraphs=[], blocks=[], is_empty=not text.strip(),
                           has_non_text_content=objects, location=location)


def table_of(cells, index=0):
    rows = sorted({c.row_index for c in cells})
    return ParsedTable(
        block_index=0, table_index=index,
        rows=[ParsedTableRow(row_index=r, cells=[c for c in cells if c.row_index == r]) for r in rows],
        location=DocumentLocation(type=LocationType.TABLE, section_index=0, table_index=index),
    )


def document(cells):
    return ParsedDocument(format=DocumentFormat.HWPX,
                          sections=[ParsedSection(section_index=0, blocks=[table_of(cells)])])


class CandidateTests(unittest.TestCase):
    def setUp(self):
        self.extractor = FieldCandidateExtractor()

    def extract(self, *cells):
        return self.extractor.extract(document(list(cells)))

    def test_right_empty(self):
        candidates = self.extract(cell(0, 0, "항목"), cell(0, 1))
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].relation, R.RIGHT)
        self.assertEqual(candidates[0].confidence, 0.95)
        self.assertEqual(candidates[0].current_text, "")

    def test_right_merged_cells(self):
        candidates = self.extract(cell(0, 0, "항목A", cs=2), cell(0, 2, cs=2),
                                  cell(0, 4, "항목B", cs=2), cell(0, 6, cs=2))
        self.assertEqual([c.target_location.column_index for c in candidates], [2, 6])

    def test_right_requires_real_adjacency(self):
        self.assertEqual(self.extract(cell(0, 0, "라벨"), cell(0, 3)), [])

    def test_right_uses_geometry_not_list_order(self):
        candidates = self.extract(cell(0, 2), cell(0, 0, "라벨", cs=2))
        self.assertEqual(len(candidates), 1)

    def test_right_row_span_overlap(self):
        candidates = self.extract(cell(0, 0, "라벨", rs=2), cell(1, 1))
        self.assertEqual(candidates[0].relation, R.RIGHT)

    def test_helper_patterns_and_original_preserved(self):
        for text in ("(사업자등록증 상)", "(해당자만 작성)", "(해당 시 작성)", "(2025년)",
                     "OO자 이내", "200자 이내", "OO 기준"):
            with self.subTest(text=text):
                candidate = self.extract(cell(0, 0, "라벨"), cell(0, 1, text))[0]
                self.assertEqual(candidate.confidence, 0.80)
                self.assertEqual(candidate.current_text, text)
                self.assertEqual(candidate.hints["helper_text"], text)

    def test_filled_text_is_not_placeholder(self):
        self.assertEqual(self.extract(cell(0, 0, "라벨"), cell(0, 1, "이미 작성된 값")), [])

    def test_label_normalization(self):
        for original, expected in (("업 체 명", "업체명"), ("주  소\n", "주소"), ("E-mail", "E-mail"),
                                   ("항 목: (A)", "항목:(A)")):
            self.assertEqual(normalize_label(original), expected)

    def test_original_label_kept(self):
        text = "  업 체\n명 "
        candidate = self.extract(cell(0, 0, text), cell(0, 1))[0]
        self.assertEqual(candidate.label, text)
        self.assertEqual(candidate.normalized_label, "업체명")

    def test_unit_suffix_target_but_not_label(self):
        for text in ("원", "명", "%", "개월", "년", "월", "일", "건", "회"):
            result = self.extract(cell(0, 0, "라벨"), cell(0, 1, text))
            self.assertEqual(len(result), 0 if text in {"년", "월", "일"} else 1)
            self.assertEqual(self.extract(cell(0, 0, text), cell(0, 1)), [])

    def test_unit_context_and_hint(self):
        candidate = self.extract(cell(0, 0, "금액"), cell(0, 1), cell(0, 2, "원"))[0]
        self.assertIn("원", candidate.context)
        self.assertEqual(candidate.hints["unit"], "원")

    def test_below_empty(self):
        candidate = self.extract(cell(0, 0, "항목"), cell(1, 0))[0]
        self.assertEqual(candidate.relation, R.BELOW)
        self.assertEqual(candidate.confidence, 0.70)

    def test_below_merged_and_long(self):
        candidate = self.extract(cell(0, 0, "항목", cs=4), cell(1, 0, cs=4, rs=2))[0]
        self.assertEqual(candidate.relation, R.BELOW)
        self.assertEqual(candidate.input_shape, S.LONG_TEXT)
        self.assertEqual(candidate.confidence, 0.75)

    def test_below_column_overlap(self):
        candidate = self.extract(cell(0, 2, "항목", cs=2), cell(1, 1, cs=3))[0]
        self.assertEqual(candidate.target_location.column_index, 1)
        self.assertEqual(candidate.relation, R.BELOW)

    def test_below_requires_overlap_and_next_logical_row(self):
        self.assertEqual(self.extract(cell(0, 0, "항목"), cell(1, 1)), [])
        self.assertEqual(self.extract(cell(0, 0, "항목"), cell(2, 0)), [])
        candidate = self.extract(cell(0, 0, "항목", rs=2), cell(2, 0))[0]
        self.assertEqual(candidate.relation, R.BELOW)

    def test_below_helper(self):
        candidate = self.extract(cell(0, 0, "항목"), cell(1, 0, "(해당 시 작성)"))[0]
        self.assertEqual(candidate.confidence, 0.65)

    def test_long_text_is_physical_not_semantic(self):
        small = self.extract(cell(0, 0, "사업계획"), cell(0, 1))[0]
        large = self.extract(cell(0, 0, "임의문자"), cell(0, 1, cs=4, rs=2))[0]
        self.assertEqual(small.input_shape, S.SHORT_TEXT)
        self.assertEqual(large.input_shape, S.LONG_TEXT)

    def test_number_not_inferred_from_label(self):
        candidate = self.extract(cell(0, 0, "사업자등록번호"), cell(0, 1))[0]
        self.assertEqual(candidate.input_shape, S.SHORT_TEXT)

    def test_explicit_date_checkbox_and_unknown_shape(self):
        for text, shape in (("년 월 일", S.DATE), ("____년 __월 __일", S.DATE),
                            ("□ 선택A □ 선택B", S.CHECKBOX), ("(2025년)", S.UNKNOWN)):
            self.assertEqual(self.extract(cell(0, 0, "항목"), cell(0, 1, text))[0].input_shape, shape)

    def test_context_neighbors_and_helper(self):
        candidate = self.extract(cell(0, 1, "(2025년)"), cell(1, 0, "항목"),
                                 cell(1, 1, "(해당 시 작성)"), cell(1, 2, "원"),
                                 cell(2, 1, "참고"))[0]
        for text in ("(2025년)", "(해당 시 작성)", "원", "참고"):
            self.assertIn(text, candidate.context)

    def test_context_bounded(self):
        cells = [cell(0, i, chr(65 + i) * 70) for i in range(8)]
        cells += [cell(0, 8, "라벨"), cell(1, 0, cs=9)]
        candidate = self.extract(*cells)[0]
        self.assertLessEqual(len(candidate.context), rules.MAX_CONTEXT_LENGTH)
        self.assertEqual(len(candidate.context), rules.MAX_CONTEXT_LENGTH)

    def test_context_excludes_long_and_duplicate_label(self):
        candidate = self.extract(cell(0, 1, "설명" * 200), cell(1, 0, "라 벨"),
                                 cell(1, 1), cell(1, 2, "라벨"))[0]
        self.assertIsNone(candidate.context)

    def test_dedup_right_and_below_same_target(self):
        candidates = self.extract(cell(0, 1, "위라벨"), cell(1, 0, "옆라벨"), cell(1, 1))
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].relation, R.RIGHT)
        self.assertEqual(candidates[0].label, "옆라벨")

    def test_tie_prefers_right(self):
        with patch.dict(rules.CONFIDENCE, {(R.RIGHT, "empty"): 0.7}):
            candidate = self.extract(cell(0, 1, "위라벨"), cell(1, 0, "옆라벨"), cell(1, 1))[0]
        self.assertEqual(candidate.relation, R.RIGHT)

    def test_dedup_prefers_confidence_before_relation(self):
        with patch.dict(rules.CONFIDENCE, {(R.BELOW, "empty"): 0.99}):
            candidate = self.extract(cell(0, 1, "위라벨"), cell(1, 0, "옆라벨"), cell(1, 1))[0]
        self.assertEqual(candidate.relation, R.BELOW)

    def test_label_with_right_does_not_generate_below(self):
        candidates = self.extract(cell(0, 0, "라벨"), cell(0, 1), cell(1, 0))
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].relation, R.RIGHT)

    def test_confidence_model_limits(self):
        candidate = self.extract(cell(0, 0, "라벨"), cell(0, 1))[0]
        for value in (-0.01, 1.01, float("nan"), float("inf")):
            data = candidate.model_dump()
            data["confidence"] = value
            with self.assertRaises(ValidationError):
                type(candidate).model_validate(data)

    def test_empty_document(self):
        self.assertEqual(self.extractor.extract(ParsedDocument(format=DocumentFormat.HWPX, sections=[])), [])

    def test_document_without_table(self):
        parsed = ParsedDocument(format=DocumentFormat.HWPX, sections=[ParsedSection(section_index=0, blocks=[
            ParsedParagraph(block_index=0, text="문단",
                            location=DocumentLocation(type=LocationType.PARAGRAPH, section_index=0))
        ])])
        self.assertEqual(self.extractor.extract(parsed), [])

    def test_only_empty_cells(self):
        self.assertEqual(self.extract(cell(0, 0), cell(0, 1), cell(1, 0)), [])

    def test_long_description_not_label(self):
        self.assertEqual(self.extract(cell(0, 0, "설명문" * 50), cell(0, 1)), [])

    def test_native_location_kept_and_input_unmodified(self):
        parsed = document([cell(0, 0, "라벨"), cell(0, 1)])
        before = parsed.model_dump_json()
        candidate = self.extractor.extract(parsed)[0]
        cells = parsed.sections[0].blocks[0].rows[0].cells
        self.assertEqual(candidate.label_location, cells[0].location)
        self.assertEqual(candidate.target_location, cells[1].location)
        self.assertEqual(parsed.model_dump_json(), before)
        candidate.target_location.native_ref["element_path"].append(99)
        self.assertEqual(parsed.model_dump_json(), before)

    def test_deterministic_unique_ids(self):
        parsed = document([cell(0, 0, "A"), cell(0, 1), cell(1, 0, "B"), cell(1, 1)])
        first = self.extractor.extract(parsed)
        self.assertEqual(first, self.extractor.extract(parsed))
        self.assertEqual([c.candidate_id for c in first], ["candidate_001", "candidate_002"])

    def test_nested_table_processed_but_parent_not_target(self):
        container = cell(0, 1)
        container.blocks = [table_of([cell(0, 0, "안쪽", table=1), cell(0, 1, table=1)], index=1)]
        candidates = self.extract(cell(0, 0, "바깥"), container)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].label, "안쪽")
        self.assertEqual(candidates[0].target_location.table_index, 1)

    def test_nontext_target_excluded(self):
        self.assertEqual(self.extract(cell(0, 0, "라벨"), cell(0, 1, objects=True)), [])

    def test_same_cell_not_automatically_detected(self):
        self.assertEqual(self.extract(cell(0, 0, "업체명 : __________")), [])



class CandidateV2Tests(unittest.TestCase):
    def extract(self, *cells):
        return FieldCandidateExtractor().extract(document(list(cells)))

    def test_unit_won(self):
        result = self.extract(cell(0, 0, "매출액"), cell(0, 1), cell(0, 2, "원"))
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].target_location.column_index, 1)
        self.assertEqual(result[0].hints["unit"], "원")

    def test_unit_people_merged(self):
        result = self.extract(cell(0, 0, "근로자수", cs=2), cell(0, 2, cs=4), cell(0, 6, "명"))
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].hints["unit"], "명")
        self.assertEqual(result[0].input_shape, S.SHORT_TEXT)
        self.assertEqual(result[0].target_location.column_index, 2)

    def test_unit_target_not_scan_bridge(self):
        result = self.extract(cell(0, 0, "항목"), cell(0, 1, "원"), cell(0, 2))
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].target_location.column_index, 1)

    def test_date_blank_and_fixed_year(self):
        for text in ("년 월 일", "2026년    월    일", "2026년 __월 __일"):
            with self.subTest(text=text):
                candidate = self.extract(cell(0, 0, "개업일"), cell(0, 1, text))[0]
                self.assertEqual(candidate.input_shape, S.DATE)
                self.assertEqual(candidate.current_text, text)
                self.assertEqual(candidate.hints["placeholder_text"], text)

    def test_date_helper(self):
        text = "년    월    일\n(사업자등록증 상)"
        candidate = self.extract(cell(0, 0, "항목"), cell(0, 1, text))[0]
        self.assertEqual(candidate.input_shape, S.DATE)
        self.assertEqual(candidate.current_text, text)
        self.assertEqual(candidate.hints["helper_text"], "(사업자등록증 상)")
        self.assertEqual(candidate.hints["target_kind"], "placeholder")

    def test_filled_dates_excluded(self):
        for text in ("2026년 9월 16일", "2026년 9월 일", "안내: 년 월 일"):
            self.assertEqual(self.extract(cell(0, 0, "항목"), cell(0, 1, text)), [])

    def test_whitespace(self):
        candidate = self.extract(cell(0, 0, "항목"), cell(0, 1, " \t\n "))[0]
        self.assertEqual(candidate.hints["target_kind"], "empty")

    def test_brackets_and_underlines(self):
        for text in ("(          )", "[          ]", "__________"):
            candidate = self.extract(cell(0, 0, "항목"), cell(0, 1, text))[0]
            self.assertEqual(candidate.hints["target_kind"], "placeholder")
            self.assertEqual(candidate.hints["placeholder_text"], text)

    def test_helper_generic_placeholder(self):
        text = "(해당 시 작성)\n[     ]"
        candidate = self.extract(cell(0, 0, "항목"), cell(0, 1, text))[0]
        self.assertEqual(candidate.hints["helper_text"], "(해당 시 작성)")
        self.assertEqual(candidate.hints["placeholder_text"], "[     ]")

    def test_instruction_mixed_target_not_placeholder(self):
        for text in ("(기존 값)", "[값]", "____\n임의의 설명문", "년 월 일\n실제 작성 내용"):
            self.assertEqual(self.extract(cell(0, 0, "항목"), cell(0, 1, text)), [])

    def test_scan_bounded_and_unit_hint(self):
        result = self.extract(cell(0, 0, "항목", cs=2), cell(0, 2, ":", cs=2),
                              cell(0, 4, "│"), cell(0, 5), cell(0, 6, "원"))
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].target_location.column_index, 5)
        self.assertEqual(result[0].hints["scan_cells"], 3)
        self.assertEqual(result[0].hints["unit"], "원")
        self.assertAlmostEqual(result[0].confidence, .85)

    def test_scan_limit_exceeded(self):
        self.assertEqual(self.extract(cell(0, 0, "항목"), cell(0, 1, ":"),
                                     cell(0, 2, ":"), cell(0, 3, ":"), cell(0, 4)), [])

    def test_scan_stops_at_next_label(self):
        result = self.extract(cell(0, 0, "첫 항목"), cell(0, 1, ":"),
                              cell(0, 2, "다음 항목"), cell(0, 3))
        self.assertEqual([c.label for c in result], ["다음 항목"])

    def test_scan_stops_at_first_target(self):
        result = self.extract(cell(0, 0, "A"), cell(0, 1, ":"), cell(0, 2),
                              cell(0, 3, "B"), cell(0, 4))
        self.assertEqual([(c.label, c.target_location.column_index) for c in result], [("A", 2), ("B", 4)])

    def test_scan_stops_at_objects_and_unknown(self):
        for bridge in (cell(0, 1, objects=True), cell(0, 1, "설명문" * 100)):
            self.assertEqual(self.extract(cell(0, 0, "항목"), bridge, cell(0, 2)), [])

    def test_scan_date_helper_target(self):
        result = self.extract(cell(0, 0, "항목"), cell(0, 1, ":"),
                              cell(0, 2, "2026년 월 일\n(해당 시 작성)"))
        self.assertEqual(result[0].input_shape, S.DATE)

    def test_form_markers(self):
        for text in ("서식1", "서식 2", "서식3", "붙임 1", "[별지 제1호서식]"):
            self.assertEqual(self.extract(cell(0, 0, text), cell(0, 1)), [])

    def test_form_filter_not_broad(self):
        for text in ("서식명", "서식1의 제목", "붙임자료명"):
            self.assertEqual(len(self.extract(cell(0, 0, text), cell(0, 1))), 1)

    def test_instruction_downranked_not_removed(self):
        candidate = self.extract(cell(0, 0, "※ 아래 내용을 작성하세요"), cell(1, 0))[0]
        self.assertTrue(candidate.hints["likely_instruction"])
        self.assertAlmostEqual(candidate.confidence, .55)

    def test_wide_right_is_short(self):
        candidate = self.extract(cell(0, 0, "임의 항목"), cell(0, 1, cs=5))[0]
        self.assertEqual(candidate.input_shape, S.SHORT_TEXT)

    def test_below_wide_and_tall_regression(self):
        for target in (cell(1, 0, cs=5), cell(1, 0, cs=4, rs=2)):
            candidate = self.extract(cell(0, 0, "현황 및 필요성", cs=4), target)[0]
            self.assertEqual(candidate.input_shape, S.LONG_TEXT)

    def test_multiple_fields_regression(self):
        result = self.extract(cell(0, 0, "업체명"), cell(0, 1), cell(0, 2, "대표자"), cell(0, 3))
        self.assertEqual([c.label for c in result], ["업체명", "대표자"])

    def test_helper_regression(self):
        result = self.extract(cell(0, 0, "업종"), cell(0, 1, "(사업자등록증 상)"))
        self.assertEqual(result[0].confidence, .8)

    def test_v2_native_and_immutability(self):
        target = cell(0, 2, "년 월 일\n(사업자등록증 상)")
        parsed = document([cell(0, 0, "항목"), cell(0, 1, ":"), target])
        before = parsed.model_dump_json()
        result = FieldCandidateExtractor().extract(parsed)
        self.assertEqual(result[0].target_location, target.location)
        self.assertEqual(before, parsed.model_dump_json())

    def test_scan_does_not_steal_adjacent_target(self):
        result = self.extract(cell(0, 0, "A", rs=2), cell(0, 1, ":"),
                              cell(1, 1, "B"), cell(0, 2, rs=2))
        self.assertEqual([c.label for c in result], ["B"])



class CandidateV21Tests(unittest.TestCase):
    def extract(self, *cells):
        return FieldCandidateExtractor().extract(document(list(cells)))

    def test_won_suffix(self):
        candidate = self.extract(cell(0, 0, "매출액"), cell(0, 1, "원"))[0]
        self.assertEqual(candidate.input_shape, S.NUMBER)
        self.assertEqual(candidate.confidence, .85)
        self.assertEqual(candidate.hints, {"target_kind": "unit_suffix", "unit": "원",
                                          "insertion_mode": "BEFORE_SUFFIX"})

    def test_people_suffix(self):
        candidate = self.extract(cell(0, 0, "종업원수"), cell(0, 1, "명"))[0]
        self.assertEqual(candidate.hints["unit"], "명")
        self.assertEqual(candidate.input_shape, S.NUMBER)

    def test_percent_and_other_numeric_units(self):
        for text in ("%", "개월", "건", "회", "천원", "만원", "백만원"):
            candidate = self.extract(cell(0, 0, "항목"), cell(0, 1, text))[0]
            self.assertEqual(candidate.hints["unit"], text)
            self.assertEqual(candidate.input_shape, S.NUMBER)

    def test_parenthesized_unit_preserved(self):
        candidate = self.extract(cell(0, 0, "전년도 매출액\n또는 월 매출액"), cell(0, 1, "(원)"))[0]
        self.assertEqual(candidate.current_text, "(원)")
        self.assertEqual(candidate.hints["unit"], "원")
        self.assertEqual(candidate.hints["insertion_mode"], "BEFORE_SUFFIX")

    def test_whitespace_suffix_preserved(self):
        for text in ("  원", "( 원 )", "\t( 명 )\n"):
            candidate = self.extract(cell(0, 0, "항목"), cell(0, 1, text))[0]
            self.assertEqual(candidate.current_text, text)
            self.assertIn(candidate.hints["unit"], ("원", "명"))

    def test_sentence_is_not_unit_only(self):
        for text in ("최대 500만원", "5명 이상", "월 매출액은 원 단위", "500원", "((원))", "원/명"):
            self.assertEqual(self.extract(cell(0, 0, "항목"), cell(0, 1, text)), [])

    def test_case_b_target_is_empty(self):
        for text in ("원", "명", "(원)"):
            result = self.extract(cell(0, 0, "항목"), cell(0, 1), cell(0, 2, text))
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0].target_location.column_index, 1)
            self.assertEqual(result[0].hints["target_kind"], "empty")
            self.assertNotIn("insertion_mode", result[0].hints)
            self.assertEqual(result[0].confidence, .95)

    def test_address_workers_regression(self):
        result = self.extract(cell(0, 0, "주소"), cell(0, 1, cs=2),
                              cell(1, 0, "현)상시근로자"), cell(1, 1), cell(1, 2, "명"))
        by_label = {c.label: c for c in result}
        self.assertNotIn("unit", by_label["주소"].hints)
        self.assertIn("명", by_label["주소"].context)
        self.assertEqual(by_label["현)상시근로자"].hints["unit"], "명")

    def test_email_revenue_regression(self):
        result = self.extract(cell(0, 0, "E-mail"), cell(0, 1, cs=2),
                              cell(1, 0, "카드 매출액"), cell(1, 1), cell(1, 2, "원"))
        by_label = {c.label: c for c in result}
        self.assertNotIn("unit", by_label["E-mail"].hints)
        self.assertIn("원", by_label["E-mail"].context)
        self.assertEqual(by_label["카드 매출액"].hints["unit"], "원")

    def test_above_unit_not_linked(self):
        result = self.extract(cell(0, 1, "원"), cell(1, 0, "항목"), cell(1, 1))
        self.assertNotIn("unit", result[0].hints)
        self.assertIn("원", result[0].context)

    def test_below_unit_not_linked(self):
        result = self.extract(cell(0, 0, "항목"), cell(0, 1), cell(1, 1, "명"))
        self.assertNotIn("unit", result[0].hints)
        self.assertIn("명", result[0].context)

    def test_same_row_other_field_unit_not_linked(self):
        result = self.extract(cell(0, 0, "A"), cell(0, 1), cell(0, 2, "B"), cell(0, 3, "원"))
        self.assertNotIn("unit", result[0].hints)
        self.assertEqual(result[1].hints["unit"], "원")

    def test_left_unit_not_linked(self):
        target = cell(0, 1)
        self.assertIsNone(rules.linked_unit(target, [cell(0, 0, "원"), target]))

    def test_merged_adjacency_not_list_order(self):
        result = self.extract(cell(0, 6, "명"), cell(0, 2, cs=4), cell(0, 0, "항목", cs=2))
        self.assertEqual(result[0].target_location.column_index, 2)
        self.assertEqual(result[0].hints["unit"], "명")

    def test_coordinate_gap_not_unit_link(self):
        result = self.extract(cell(0, 0, "항목"), cell(0, 1), cell(0, 3, "원"))
        self.assertNotIn("unit", result[0].hints)

    def test_ambiguous_suffix_not_arbitrarily_selected(self):
        target = cell(0, 1, rs=2)
        self.assertIsNone(rules.linked_unit(target, [target, cell(0, 2, "원"), cell(1, 2, "명")]))

    def test_date_regression(self):
        for text in ("년 월 일", "2026년 월 일", "년 월 일\n(사업자등록증 상)"):
            candidate = self.extract(cell(0, 0, "개업일"), cell(0, 1, text))[0]
            self.assertEqual(candidate.input_shape, S.DATE)
            self.assertEqual(candidate.hints["target_kind"], "placeholder")
            self.assertNotIn("insertion_mode", candidate.hints)

    def test_independent_date_units_still_excluded(self):
        for text in ("년", "월", "일", "(년)"):
            self.assertEqual(self.extract(cell(0, 0, "항목"), cell(0, 1, text)), [])

    def test_unit_suffix_not_below_target(self):
        self.assertEqual(self.extract(cell(0, 0, "항목"), cell(1, 0, "원")), [])

    def test_suffix_dedup(self):
        target = cell(0, 1, "원", rs=2)
        result = self.extract(cell(0, 0, "A"), cell(1, 0, "B"), target)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].target_location, target.location)

    def test_native_and_original_immutable(self):
        target = cell(0, 1, " ( 원 ) ")
        parsed = document([cell(0, 0, "항목"), target])
        before = parsed.model_dump_json()
        candidate = FieldCandidateExtractor().extract(parsed)[0]
        self.assertEqual(candidate.target_location, target.location)
        self.assertEqual(candidate.current_text, target.text)
        candidate.target_location.native_ref["element_path"].append(99)
        self.assertEqual(parsed.model_dump_json(), before)

    def test_scan_stops_on_unit_suffix(self):
        result = self.extract(cell(0, 0, "항목"), cell(0, 1, ":"), cell(0, 2, "원"), cell(0, 3))
        self.assertEqual(result[0].target_location.column_index, 2)
        self.assertEqual(result[0].hints["target_kind"], "unit_suffix")

    def test_nontext_unit_not_used(self):
        result = self.extract(cell(0, 0, "항목"), cell(0, 1), cell(0, 2, "원", objects=True))
        self.assertNotIn("unit", result[0].hints)


if __name__ == "__main__":
    unittest.main()

