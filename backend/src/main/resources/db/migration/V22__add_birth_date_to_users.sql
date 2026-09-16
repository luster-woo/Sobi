ALTER TABLE users
    ADD COLUMN birth_date DATE;

COMMENT ON COLUMN users.birth_date IS '생년월일 (소셜 가입 시 null, 온보딩에서 입력)';