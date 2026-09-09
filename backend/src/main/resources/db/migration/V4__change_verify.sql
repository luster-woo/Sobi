ALTER TABLE verify
    ALTER COLUMN business_code_id DROP NOT NULL;

ALTER TABLE verify
    ADD COLUMN business_code_name VARCHAR(100) NOT NULL;