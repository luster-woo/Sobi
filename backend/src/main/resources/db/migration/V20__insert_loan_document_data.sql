-- 대출 상품 필수 서류. 모든 대출 상품에 같은 제출 서류 4개를 붙인다.
-- 대출은 작성 서류 없이 제출 서류(AI 검증 대상)만 둔다.
-- type 은 application_document.document_type 과 같은 값(SUBMIT / WRITE)을 쓴다.


COMMENT ON COLUMN loan_document.type IS 'SUBMIT(제출) / WRITE(작성)';
COMMENT ON COLUMN loan_document.url  IS '작성 서류 원본 양식 위치 (제출 서류는 NULL)';

INSERT INTO loan_document (loan_id, doc_name, type, url)
SELECT l.id, d.doc_name, 'SUBMIT', NULL
FROM loan l
         CROSS JOIN (VALUES (1, '사업자등록증명원'),
                            (2, '부가가치세 과세표준증명원'),
                            (3, '국세 납세증명서'),
                            (4, '표준재무상태표·손익계산서')) AS d(sort_order, doc_name)
ORDER BY l.id, d.sort_order;
