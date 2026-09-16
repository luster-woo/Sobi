-- password 는 BCrypt('1234'). 평문이면 BCryptPasswordEncoder 때문에 로그인이 안 된다.
-- birth_date 는 AI 판정에서 대표자 연령 조건에 쓰인다. 청년/중년/장년으로 나눴다.
-- user_key 는 싸피 금융망에서 발급받은 실제 값이다.
--   test1~3@test.com 은 다른 팀이 선점해 발급이 불가했다.
--   d101-test1~3@test.com 으로 발급받아 넣었으므로 이메일과 userKey 의 주인이 다르다.
--   금융망은 userKey 만 보므로 동작에는 지장이 없다.

INSERT INTO users (
    email, password, name, birth_date, role, credit_rating,
    provider, provider_id, created_at, deleted_at, updated_at,
    notification, user_key
)
VALUES
    ('test1@test.com', '$2b$10$y4a2wC1odpy2Xz.jwBsypuIbBMDSliTrn/tkqYq5sAgqYXFeZLhHO',
     '박성현', '1994-03-11', 'PREENTREPRENEUR', NULL,
     'LOCAL', NULL, CURRENT_TIMESTAMP, NULL, NULL, TRUE,
     '7335885c-c57f-4797-b17c-4d69e28ba573'),

    ('test2@test.com', '$2b$10$y4a2wC1odpy2Xz.jwBsypuIbBMDSliTrn/tkqYq5sAgqYXFeZLhHO',
     '황문규', '1981-07-22', 'PREENTREPRENEUR', NULL,
     'LOCAL', NULL, CURRENT_TIMESTAMP, NULL, NULL, TRUE,
     '4bb37509-c7ef-4187-aa87-37f6b606cfd3'),

    ('test3@test.com', '$2b$10$y4a2wC1odpy2Xz.jwBsypuIbBMDSliTrn/tkqYq5sAgqYXFeZLhHO',
     '권병수', '1969-11-05', 'PREENTREPRENEUR', NULL,
     'LOCAL', NULL, CURRENT_TIMESTAMP, NULL, NULL, TRUE,
     '1c0f3740-d3f7-44c4-9aff-600eaf8ebfa8')

ON CONFLICT (email) DO UPDATE
    SET password   = EXCLUDED.password,
        name       = EXCLUDED.name,
        birth_date = EXCLUDED.birth_date,
        user_key   = EXCLUDED.user_key;