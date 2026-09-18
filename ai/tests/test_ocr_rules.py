"""OCR 판정 규칙. 엔진·GMS 없이 실행. 기준: ai/docs/05_ocr_contract.md"""

import unittest
from datetime import date

from app.ocr import rules
from app.ocr.schemas import Expected, Extracted

TODAY = date(2026, 9, 17)
FIELD_ORDER = ["readable", "doc_title", "brn", "owner_name", "birth_date",
               "validity", "business_name", "address", "open_date"]

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
        self.assertEqual(check(r, "birth_date").level, "SKIP")   # 사업자등록증명은 생년월일을 보지 않는다
        self.assertTrue(all(c.level == "OK" for c in r.checks if c.field != "birth_date"), r.checks)


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


class DefaultRuleTest(unittest.TestCase):
    def test_unknown_document_does_not_check_validity(self):
        r = judge("건축물대장", ext=extracted(issue_date=date(2019, 1, 1)))
        self.assertEqual(check(r, "validity").level, "SKIP")
        self.assertEqual(r.status, "PASSED")

    def test_unknown_document_brn_mismatch_only_warns(self):
        # 견적서처럼 남의 사업자번호가 찍히는 서류가 있다
        r = judge("견적서", ext=extracted(brn="2060843262"))
        self.assertEqual(check(r, "brn").level, "WARN")
        self.assertEqual(r.status, "PASSED")

    def test_third_party_document_skips_brn(self):
        r = judge("외주업체 사업자 등록증 1분", ext=extracted(brn="2060843262", owner_name="이재훈"))
        self.assertEqual(check(r, "brn").level, "SKIP")
        self.assertEqual(r.status, "PASSED")


class ClassifyTest(unittest.TestCase):
    """지원사업 서류명(program_document.doc_name) 표기 변형 → 규칙"""

    def assertRule(self, names, rule):
        for name in names:
            self.assertIs(rules.rule_for(name), rule, name)

    def test_business_registration_variants(self):
        self.assertRule(["사업자 등록증", "사업자등록증 사본", "사업자등롱증", "신청업체 사업자등록증 사본",
                         "사업자등록증 또는 사업자증명원 사본", "사업자등록증 사본(또는 사업자등록증명원)"],
                        rules.BUSINESS_REGISTRATION)
        self.assertRule(["사업자 등록 증명원", "사업자등록증명", "사업자등록증명워"], rules.BUSINESS_CERTIFICATE)

    def test_tax_certificate_variants(self):
        self.assertRule(["지방세 완납증서", "지방세납세증명서", "지방세 납입 증명서"], rules.LOCAL_TAX)
        self.assertRule(["국세 완납증서", "국세납세증명서", "국세 납입 증명서"], rules.RULES["국세 납세증명서"])
        self.assertRule(["국세/지방세 납세 증명서", "국·지방세 완납 증명서", "국세 및 지방세 납세 증명서",
                         "지방세국세 완납증명서", "납세증명서"], rules.RULES["국세·지방세 납세증명서"])

    def test_personal_document_variants(self):
        self.assertRule(["주민등록등본", "주민등록표등본", "주민증록표등본"], rules.RULES["주민등록등본"])
        self.assertRule(["주민등록 초본", "주민등록증 초본"], rules.RULES["주민등록초본"])
        self.assertRule(["주민등록 등·초본"], rules.RULES["주민등록등초본"])
        self.assertRule(["본인 명의 가족관계증명서"], rules.RULES["가족관계증명서"])
        self.assertRule(["대표자 신분증 사본", "신분증(주민등록증 또는 운전면허증)"], rules.RULES["신분증"])
        self.assertRule(["KB국민은행 통장사본", "소상공인(사업주) 명의 통장 사본"], rules.RULES["통장사본"])
        self.assertRule(["사업장 임대차계약서 사본", "임차계약서"], rules.RULES["임대차계약서"])

    def test_ambiguous_or_third_party_names_fall_back(self):
        self.assertRule(["매출액 증빙 서류", "4대 사회보험 완납증명서", "화제 보험 납입 증명서", "지방세과세증명서",
                         "주민등록등본(미혼 또는 분리거주시 가족관계증명서)", "국세 및 지방세 납세증명서, 등·초본",
                         "소상공인 확인서 또는 상시근로자 확인서류", "사업자등록증 또는 공장등록증 사본"],
                        rules.DEFAULT_RULE)
        self.assertRule(["근로자 주민등록등본", "광고주 사업자등록증 사본", "거래처(철거업체) 사업자등록증"],
                        rules.THIRD_PARTY_RULE)


class BusinessRegistrationTest(unittest.TestCase):
    def test_old_issue_date_passes(self):
        # 사업자등록증의 발급일은 개업·재발급 날짜다 (P1 샘플: 2023-12-12 재발급)
        r = judge("사업자 등록증", ext=extracted(doc_title="사업자등록증", issue_date=date(2023, 12, 12)))
        self.assertEqual(check(r, "validity").level, "SKIP")
        self.assertEqual(r.status, "PASSED")

    def test_title_mentioned_only_in_attachment_list_does_not_match(self):
        # 지방세 납세증명서 2쪽 첨부서류란 '사업자등록증(개인사업자에 한함) 1부'
        r = rules.judge("사업자등록증", EXPECTED, extracted(doc_title="지방세 납세증명서"), 0.9, 60,
                        "지방세 납세증명서\n...\n사업자등록증(개인사업자에 한함) 1부", TODAY,
                        title_text="지방세 납세증명서\n발급번호")
        self.assertEqual(check(r, "doc_title").level, "FAIL")

    def test_certificate_is_accepted_for_registration_slot(self):
        r = judge("사업자등록증", ext=extracted(doc_title="사업자등록증명"))
        self.assertEqual(check(r, "doc_title").result, "MATCH")


class TaxCertificateTest(unittest.TestCase):
    def test_local_tax_certificate_is_not_a_national_one(self):
        r = judge("국세 납세증명서", ext=extracted(doc_title="지방세 납세증명서", valid_until=date(2026, 10, 18)),
                  text="지방세 납세증명서 ... 납세증명서")
        self.assertEqual(check(r, "doc_title").level, "FAIL")

    def test_national_tax_title_still_matches(self):
        r = judge("국세 납세증명서", ext=extracted(doc_title="납세증명서", valid_until=date(2026, 10, 18)),
                  text="납세증명서 ... 지방세 안내")
        self.assertEqual(check(r, "doc_title").result, "MATCH")

    def test_combined_slot_accepts_either(self):
        for title in ("납세증명서", "지방세 납세증명서"):
            r = judge("국세/지방세 납세 증명서", ext=extracted(doc_title=title, valid_until=date(2026, 10, 18)))
            self.assertEqual(r.status, "PASSED", title)

    def test_local_tax_checks_birth_from_resident_number(self):
        exp = EXPECTED.model_copy(update={"birth_date": date(1994, 3, 11)})
        ext = extracted(doc_title="지방세 납세증명서", valid_until=date(2026, 10, 18))
        r = rules.judge("지방세 납세증명서", exp, ext, 0.9, 60, "", TODAY, birth_dates=("1994-03-11",))
        self.assertEqual(check(r, "birth_date").result, "MATCH")
        r = rules.judge("지방세 납세증명서", exp, ext, 0.9, 60, "", TODAY, birth_dates=("1981-07-22",))
        self.assertEqual(r.message, rules.MESSAGES["birth_date"])

    def test_corporation_skips_birth(self):
        # 법인이면 '주민등록번호' 칸에 법인등록번호(110111-…)가 들어간다
        exp = EXPECTED.model_copy(update={"brn": "368-88-03013", "birth_date": date(1994, 3, 11)})
        r = rules.judge("지방세 납세증명서", exp, extracted(brn="3688803013", valid_until=date(2026, 10, 18)),
                        0.9, 60, "", TODAY, birth_dates=("1911-01-11",))
        self.assertEqual(check(r, "birth_date").level, "SKIP")


PERSON = EXPECTED.model_copy(update={"owner_name": "김표준", "birth_date": date(1994, 3, 11)})
RESIDENT_TEXT = "( 등본) 용도및목적: 금융기관제출용 신청인:김표준(1994-03-11)\n세대주 성명(한자) 김표준 ()\n1본인 김표춘 ()"


def personal(document_name, text=RESIDENT_TEXT, birth_dates=("1994-03-11",), **over):
    ext = Extracted(**{"issue_date": date(2026, 9, 17), **over})   # 개인 서류는 GMS 를 거치지 않는다
    return rules.judge(document_name, PERSON, ext, 0.9, 40, text, TODAY, birth_dates=birth_dates)


class PersonalDocumentTest(unittest.TestCase):
    def test_resident_copy_passes_without_title_brn_or_business_fields(self):
        r = personal("주민등록등본")
        self.assertEqual(r.status, "PASSED")
        self.assertEqual(check(r, "doc_title").result, "MATCH")       # '(등본)' 으로 확인
        self.assertEqual(check(r, "owner_name").result, "MATCH")      # 본문에서 이름 확인
        self.assertEqual(check(r, "birth_date").result, "MATCH")
        for f in ("brn", "business_name", "address"):
            self.assertEqual(check(r, f).level, "SKIP", f)

    def test_someone_elses_resident_copy_fails_on_birth(self):
        r = personal("주민등록등본", text="( 등본) 신청인:박대형(1981-07-22)", birth_dates=("1981-07-22",))
        self.assertEqual(check(r, "owner_name").level, "WARN")       # 이름은 OCR 오타 때문에 FAIL 하지 않는다
        self.assertEqual(r.message, rules.MESSAGES["birth_date"])

    def test_birth_not_found_only_warns(self):
        r = personal("주민등록등본", birth_dates=())
        self.assertEqual(check(r, "birth_date").level, "WARN")
        self.assertEqual(r.status, "PASSED")

    def test_old_resident_copy_expires_after_90_days(self):
        r = personal("주민등록등본", issue_date=date(2026, 6, 1))
        self.assertEqual(check(r, "validity").result, "EXPIRED")

    def test_id_card_needs_fewer_lines(self):
        ext = Extracted()
        r = rules.judge("신분증", PERSON, ext, 0.9, 8, "주민등록증 김표준 940311-1234567", TODAY,
                        birth_dates=("1994-03-11",))
        self.assertEqual(r.status, "PASSED")
        self.assertEqual(check(r, "validity").level, "SKIP")


class BankAccountTest(unittest.TestCase):
    def bank(self, holder, expected=PERSON):
        ext = Extracted(issue_date=date(2022, 3, 15), owner_name=holder, account_no="0010-1010-1010-1010")
        return rules.judge("통장사본", expected, ext, 0.9, 60, "계좌번호 0010-1010-1010-1010\n이 통장은", TODAY)

    def test_holder_matches_owner_and_old_passbook_passes(self):
        r = self.bank("김 표준")
        self.assertEqual(r.status, "PASSED")
        self.assertEqual(check(r, "owner_name").result, "MATCH")
        self.assertEqual(check(r, "validity").level, "SKIP")
        self.assertEqual(check(r, "brn").level, "SKIP")

    def test_corporate_account_matches_business_name(self):
        exp = PERSON.model_copy(update={"business_name": "(주)글로벌데이터로드"})
        self.assertEqual(self.bank("주식회사 글로벌데이터로드", exp).status, "PASSED")

    def test_other_holder_fails(self):
        r = self.bank("박대형")
        self.assertEqual(check(r, "owner_name").level, "FAIL")
        self.assertEqual(r.message, rules.MESSAGES["account_holder"])


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
