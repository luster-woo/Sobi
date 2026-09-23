-- 대출 필수 서류 교체: 표준재무상태표·손익계산서 → 소상공인확인서
--
-- 소상공인은 재무제표를 따로 작성하지 않는 경우가 많고, 소상공인 정책자금은 소상공인 여부 확인이 더 직접적이다.
-- V20 은 이미 적용되어 수정할 수 없으므로 이름만 바꾼다. 행 id 가 그대로라 화면 순서(loan_document.id 순)도 유지된다.
--
-- ⚠ 이미 만들어진 신청의 서류 행(application_document)은 loan_document_id 로 이 행을 참조하므로
--    서류명은 함께 바뀐다. 그 서류 행에 올라가 있던 파일은 재무제표이므로, 로컬에서 테스트 중이던 신청은 다시 업로드해야 한다.
-- ⚠ doc_name 은 AI 검증 API 의 document_name 으로 그대로 넘어간다 (ai/docs/05_ocr_contract.md 서류별 기준).

UPDATE loan_document
SET doc_name = '소상공인확인서'
WHERE doc_name = '표준재무상태표·손익계산서';
