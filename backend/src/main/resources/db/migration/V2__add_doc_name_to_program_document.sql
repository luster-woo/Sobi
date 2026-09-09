ALTER TABLE program_document
    ADD COLUMN doc_name VARCHAR(200);

COMMENT ON COLUMN program_document.doc_name IS '문서명';