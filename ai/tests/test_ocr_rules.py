"""OCR 판정 규칙. 엔진·GMS 없이 실행. 기준: ai/docs/05_ocr_contract.md"""

import unittest
from datetime import date

from app.ocr import rules
from app.ocr.schemas import Expected, Extracted

TODAY = date(2026, 9, 17)
FIELD_ORDER = ["readable", "doc_title", "brn", "owner_name", "validity", "business_name", "address", "open_date"]

EXPECTED = Expected(brn="345-67-89012", owner_name="권병수", business_name="카페 하루",
                    address="서울특별시 성동구 성수이로 78", region="서울", open_date=date(2023, 1, 10))


def extracted(**over):
    base = dict(doc_title="사업자등록증명", issuer="성동세무서", issue_date=date(2026, 9, 17), valid_until=None,
                brn="3456789012", owner_name="권병수", business_name="카페하루",
                address="서울특별시 성동구 성수이로 78, 1층(성수동2가)", open_date=date(2023, 1, 10))
    base.update(over)
    return Extracted(**base)


def judge(document_name="사업자등록증명원", expected=EXPECTED, ext=None, confidence=0.9, lines=60, text=""):
    return rules.judge(document_name, expected, ext or extracted(), confidence, lines, text, TODAY)


def check(result, field):
    return next(c for c in result.checks if c.field == field)


class PassTest(unittest.TestCase):
    def test_all_match_passes_with_fixed_check_order(self):
        r = judge()
        self.assertEqual(r.status, "PASSED")
        self.assertIsNone(r.message)
        self.assertEqual([c.field for c in r.checks], FIELD_ORDER)
        self.assertTrue(all(c.level == "OK" for c in r.checks), r.checks)


class ReadableTest(unittest.TestCase):
    def test_low_confidence_fails_and_skips_the_rest(self):
        r = judge(confidence=0.5)
        self.assertEqual(r.status, "FAILED")
        self.assertEqual(r.message, rules.MESSAGES["readable"])
        self.assertEqual([c.field for c in r.checks], FIELD_ORDER)
        self.assertTrue(all(c.level == "SKIP" for c in r.checks[1:]))

    def test_too_few_lines_fails(self):
        self.assertEqual(check(judge(lines=14), "readable").result, "UNREADABLE")
        self.assertEqual(check(judge(lines=15), "readable").result, "VALID")


class TitleTest(unittest.TestCase):
    def test_other_document_fails_with_document_name_in_message(self):
        r = judge(ext=extracted(doc_title="부가가치세과세표준증명"), text="부가가치세과세표준증명 ...")
        self.assertEqual(check(r, "doc_title").level, "FAIL")
        self.assertEqual(r.message, "요청한 서류(사업자등록증명원)가 아닌 것 같습니다. 서류를 확인해 주세요.")

    def test_alias_with_spaces_matches(self):
        r = judge("소상공인확인서", ext=extracted(doc_title="중소기업 확인서", valid_until=date(2027, 3, 31)))
        self.assertEqual(check(r, "doc_title").result, "MATCH")

    def test_title_found_in_full_text_even_if_gms_title_differs(self):
        r = judge(ext=extracted(doc_title="증명서"), text="사 업 자 등 록 증 명\n...")
        self.assertEqual(check(r, "doc_title").result, "MATCH")

    def test_unread_title_only_warns(self):
        r = judge(ext=extracted(doc_title=None))
        self.assertEqual(check(r, "doc_title").level, "WARN")
        self.assertEqual(r.status, "PASSED")

    def test_unknown_document_skips_title_and_owner(self):
        r = judge("지원사업 신청서류", ext=extracted(doc_title="무엇이든", owner_name="다른사람"))
        self.assertEqual(check(r, "doc_title").level, "SKIP")
        self.assertEqual(check(r, "owner_name").level, "SKIP")
        self.assertEqual(r.status, "PASSED")


class BrnTest(unittest.TestCase):
    def test_hyphenated_expected_matches_digits(self):
        self.assertEqual(check(judge(), "brn").result, "MATCH")

    def test_mismatch_fails(self):
        r = judge(ext=extracted(brn="2060843262"))
        self.assertEqual(check(r, "brn").level, "FAIL")
        self.assertEqual(r.message, rules.MESSAGES["brn"])

    def test_not_found_warns(self):
        self.assertEqual(check(judge(ext=extracted(brn=None)), "brn").level, "WARN")

    def test_no_expected_skips(self):
        r = judge(expected=EXPECTED.model_copy(update={"brn": None}), ext=extracted(brn="1111111111"))
        self.assertEqual(check(r, "brn").level, "SKIP")


class OwnerTest(unittest.TestCase):
    def test_mismatch_fails_for_business_registration(self):
        r = judge(ext=extracted(owner_name="이재훈"))
        self.assertEqual(check(r, "owner_name").level, "FAIL")
        self.assertEqual(r.message, rules.MESSAGES["owner_name"])

    def test_spaces_are_ignored(self):
        self.assertEqual(check(judge(ext=extracted(owner_name="권 병 수")), "owner_name").result, "MATCH")

    def test_masked_name_skips(self):
        self.assertEqual(check(judge(ext=extracted(owner_name="권*수")), "owner_name").level, "SKIP")

    def test_tax_certificate_does_not_compare_owner(self):
        r = judge("국세 납세증명서",
                  ext=extracted(doc_title="납세증명서", owner_name=None, valid_until=date(2026, 10, 1)))
        self.assertEqual(check(r, "owner_name").level, "SKIP")
        self.assertEqual(r.status, "PASSED")


class ValidityTest(unittest.TestCase):
    def test_expired_valid_until_fails_with_date(self):
        r = judge("소상공인확인서", ext=extracted(doc_title="중소기업 확인서", valid_until=date(2022, 3, 31)))
        self.assertEqual(check(r, "validity").result, "EXPIRED")
        self.assertEqual(r.message, "유효기간이 지난 서류입니다 (2022-03-31). 새로 발급받아 올려주세요.")

    def test_valid_until_today_is_valid(self):
        r = judge("소상공인확인서",
                  ext=extracted(doc_title="중소기업 확인서", valid_until=TODAY, issue_date=date(2020, 1, 1)))
        self.assertEqual(check(r, "validity").result, "VALID")

    def test_missing_valid_until_falls_back_to_issue_date(self):
        r = judge("국세 납세증명서",
                  ext=extracted(doc_title="납세증명서", valid_until=None, issue_date=date(2026, 9, 1)))
        self.assertEqual(check(r, "validity").result, "VALID")

    def test_issue_date_90_day_boundary(self):
        self.assertEqual(check(judge(ext=extracted(issue_date=date(2026, 6, 19))), "validity").result, "VALID")
        r = judge(ext=extracted(issue_date=date(2026, 6, 18)))
        self.assertEqual(check(r, "validity").result, "EXPIRED")
        self.assertEqual(r.message, "유효기간이 지난 서류입니다 (2026-06-18). 새로 발급받아 올려주세요.")

    def test_no_dates_warns(self):
        r = judge(ext=extracted(issue_date=None))
        self.assertEqual(check(r, "validity").level, "WARN")
        self.assertEqual(r.status, "PASSED")


class PriorityTest(unittest.TestCase):
    def test_message_follows_check_order(self):
        r = judge(ext=extracted(brn="2060843262", owner_name="이재훈", issue_date=date(2020, 1, 1)))
        self.assertEqual([c.field for c in r.checks if c.level == "FAIL"], ["brn", "owner_name", "validity"])
        self.assertEqual(r.message, rules.MESSAGES["brn"])


class SoftChecksTest(unittest.TestCase):
    def test_business_name_mismatch_only_warns(self):
        r = judge(ext=extracted(business_name="해광레이저"))
        self.assertEqual(check(r, "business_name").level, "WARN")
        self.assertEqual(r.status, "PASSED")

    def test_address_short_sido_and_no_spaces_match(self):
        r = judge(ext=extracted(address="서울성동구 성수이로 78, 1층(성수동2가)"))
        self.assertEqual(check(r, "address").result, "MATCH")

    def test_address_other_district_only_warns(self):
        r = judge(ext=extracted(address="서울 마포구 홍익로5안길 55"))
        self.assertEqual(check(r, "address").level, "WARN")
        self.assertEqual(r.status, "PASSED")

    def test_merged_region_notation_accepts_both(self):
        exp = EXPECTED.model_copy(update={"address": "광주광역시 북구 설죽로 1", "region": "전남광주"})
        r = judge(expected=exp, ext=extracted(address="광주광역시북구 설죽로 1"))
        self.assertEqual(check(r, "address").result, "MATCH")

    def test_open_date_absent_in_other_documents_skips(self):
        r = judge("부가가치세 과세표준증명원", ext=extracted(doc_title="부가가치세과세표준증명", open_date=None))
        self.assertEqual(check(r, "open_date").level, "SKIP")

    def test_open_date_unread_on_business_registration_warns(self):
        self.assertEqual(check(judge(ext=extracted(open_date=None)), "open_date").level, "WARN")

    def test_open_date_mismatch_only_warns(self):
        r = judge(ext=extracted(open_date=date(2023, 1, 9)))
        self.assertEqual(check(r, "open_date").level, "WARN")
        self.assertEqual(r.status, "PASSED")


if __name__ == "__main__":
    unittest.main()
