"""OCR 추출 규칙. PaddleOCR 없이 인식 결과(줄·좌표)를 흉내 내서 실행한다.
실제 서류에서 나온 함정을 재현한다 (document/ocr/서류 업로드·OCR 설계.md 6-6)."""

import unittest

import numpy as np

from app.ocr import extract
from app.ocr.extract import Line

H = 30   # 글자 높이


def box(x, y, w, h=H):
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]


def row(y, label_parts, values, label_pitch=44, value_x=420):
    """자간 넓은 표 라벨('개','업','일')은 조각으로, 값은 오른쪽 칸에"""
    lines = [Line(0, p, 0.9, box(60 + i * label_pitch, y, 34)) for i, p in enumerate(label_parts)]
    x = value_x
    for v in values:
        w = len(v) * 16
        lines.append(Line(0, v, 0.95, box(x, y, w)))
        x += w + 12
    return lines


def business_registration():
    """비영리법인 사업자등록증명 양식 (실측 샘플 배치)"""
    lines = []
    for y, label, values in [
        (200, list("발급번호"), ["8072-489-7244-010"]),
        (260, ["상", "호", "(", "법", "인", "명", ")"], ["(사)아시아포커스"]),
        (310, list("사업자등록번호"), ["113-82-05914"]),
        (360, ["성", "명", "(", "대", "표", "자", ")"], ["이경옥"]),
        (410, ["주", "민", "(", "법", "인", ")", "등록번호"], ["254321-0007034"]),
        (460, list("개업일"), ["2005년 03월 23일"]),
        (510, list("사업자등록일"), ["2005년 08월 02일"]),
        (950, list("접수번호"), ["502998232834"]),
    ]:
        lines += row(y, label, values)
    lines.append(Line(0, "2022 년 7 월 25 일", 0.9, box(700, 900, 260)))
    return lines


class MergeTest(unittest.TestCase):
    def test_fragmented_labels_are_merged_into_cells(self):
        cells = extract.merge_cells(business_registration())
        texts = [extract.norm(c.text) for c in cells]
        # 글자 조각('개','업','일')은 한 칸으로 합쳐지고, 멀리 떨어진 값 칸은 따로 남는다
        self.assertIn("개업일", texts)
        self.assertIn("2005년03월23일", texts)
        self.assertNotIn("개", texts)

    def test_close_rows_in_low_resolution_are_not_chained(self):
        """829×1046 이미지: 글자 높이 20, 줄 간격 27 → 개업일 행과 사업자등록일 행이 붙으면 안 된다"""
        lines = [Line(0, "개", 1.0, box(107, 348, 23, 22)), Line(0, "업", 1.0, box(168, 350, 19, 19)),
                 Line(0, "2023 년 01 월 10일", 0.9, box(256, 350, 178, 19)),
                 Line(0, "사업자등록일", 1.0, box(108, 376, 139, 20)),
                 Line(0, "2023년 01월 09일", 0.9, box(256, 377, 116, 20))]
        cells = extract.merge_cells(lines)
        self.assertEqual(len(cells), 2, [c.text for c in cells])
        self.assertEqual(extract.extract_rule_fields(cells).open_date, "2023-01-10")


class RuleFieldsTest(unittest.TestCase):
    def test_business_registration_fields(self):
        fields = extract.extract_rule_fields(extract.merge_cells(business_registration()))
        self.assertEqual(fields.brn, "1138205914")               # 주민(법인)등록번호·접수번호가 아님
        self.assertEqual(fields.open_date, "2005-03-23")          # 사업자등록일이 아님
        self.assertEqual(fields.issue_date, "2022-07-25")         # 라벨 없는 발급일
        self.assertIsNone(fields.valid_until)

    def test_brn_found_without_label_even_if_label_is_misread(self):
        cells = [Line(0, "사업자등복번호:345-67-89012 법인등복번호:", 0.9, box(0, 0, 400))]
        self.assertEqual(extract.find_brn(cells), "3456789012")

    def test_resident_number_is_not_a_brn(self):
        cells = [Line(0, "주민(법인)등록번호 254321-0007034", 0.9, box(0, 0, 400))]
        self.assertIsNone(extract.find_brn(cells))

    def test_validity_range_goes_to_valid_until_not_issue_date(self):
        cells = [Line(0, "유효기간: 2026-04-01~2027-03-31", 0.9, box(0, 0, 400)),
                 Line(0, "2026년 09월 17일", 0.9, box(0, 300, 200))]
        self.assertEqual(extract.find_dates(cells), ("2026-09-17", "2027-03-31"))

    def test_tax_period_rows_and_english_labels(self):
        """부가세 과세표준증명: 표의 기간 행은 발급일이 아니고, 발급일에 영문이 끼어든다"""
        cells = [Line(0, "2026-01-01 2026-06-30 141,063,200", 0.9, box(0, 0, 400)),
                 Line(0, "Head of ( 성동 ) District Tax Office (Stamp) 2026년 Year 09월 17일 Month Day 성동 세무서장 (인)",
                      0.9, box(0, 300, 600))]
        self.assertEqual(extract.find_dates(cells)[0], "2026-09-17")

    def test_issue_date_near_issuer_beats_validity_date(self):
        """납세증명서: 유효기간(2023-07-05)이 발급일(2023-06-05)보다 늦다"""
        cells = [Line(0, "유효기간 2023년 07월 05일", 0.9, box(0, 0, 300)),
                 Line(0, "민원봉사실 용인세무서장 2023년 6월 5일", 0.9, box(0, 300, 400))]
        self.assertEqual(extract.find_dates(cells), ("2023-06-05", "2023-07-05"))

    def test_en_dash_date(self):
        self.assertEqual(extract.dates_in("2021-04–01"), ["2021-04-01"])

    def test_strip_label_with_spaced_label(self):
        self.assertEqual(extract.strip_label("성명(대 표 자) 이경옥", "성명(대표자)"), "이경옥")


class ToImagesTest(unittest.TestCase):
    def test_png_is_decoded_to_bgr(self):
        import cv2
        ok, png = cv2.imencode(".png", np.zeros((20, 30, 3), dtype=np.uint8))
        images = extract.to_images(png.tobytes(), ".png")
        self.assertEqual(images[0].shape, (20, 30, 3))

    def test_pdf_pages_are_rendered_up_to_limit(self):
        import pymupdf
        doc = pymupdf.open()
        for _ in range(extract.MAX_PDF_PAGES + 2):
            doc.new_page(width=100, height=100)
        images = extract.to_images(doc.tobytes(), ".pdf")
        self.assertEqual(len(images), extract.MAX_PDF_PAGES)
        self.assertEqual(images[0].shape[2], 3)

    def test_broken_file_raises(self):
        with self.assertRaises(extract.FileUnreadableError):
            extract.to_images(b"%PDF-broken", ".pdf")
        with self.assertRaises(extract.FileUnreadableError):
            extract.to_images(b"\x89PNG\r\n\x1a\nbroken", ".png")


if __name__ == "__main__":
    unittest.main()
