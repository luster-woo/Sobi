# 소비(SOBI) — 제가 맡은 부분 (이윤우)

6명이 만든 소비(SOBI)에서 제가 맡은 프론트엔드 부분만 항목별로 정리한 문서입니다. 서비스 전체 소개는 [README](README.md)에 있습니다.

## 1. Project Overview

- 프로젝트명: 소비(SOBI) — 마이데이터 기반 소상공인 정책자금 자격 판정·매칭 서비스
- 개발 기간: 2026.08.17 ~ 2026.10.02 (기획·설계 포함 약 7주, SSAFY 15기 특화 프로젝트)
- 팀 구성: 6명 (프론트엔드 2 · 백엔드·AI 3 · 인프라 1)
- 담당 역할: 프론트엔드 파트장(프론트 2명 중 리드). 팀장은 따로 있습니다. 프론트 기반 설계와 작업 분담, 인증·온보딩, 대시보드, 마이페이지, 프론트엔드 보안을 맡았습니다
- GitHub: https://github.com/luster-woo/Sobi
- 기술 스택 (제가 쓴 것): React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · TanStack Query v5 · Zustand · React Router 8 · Axios · MSW · ESLint · Prettier · Nginx(보안 헤더)

## 2. My Contribution

직접 담당한 기능과 개발 범위

- 프론트 기반: Vite·TypeScript·ESLint·Prettier 설정, 디렉토리 규칙, 디자인 토큰, axios 인스턴스와 인터셉터, TanStack Query·Zustand 상태 경계, 라우팅과 보호 라우트, MSW 목 체계
- 인증·온보딩: 로그인, 회원가입, 약관 동의, 비밀번호 재설정, 구글 소셜 로그인과 계정 연결, 세션 복구와 토큰 재발급, 사업자 인증, 마이데이터 동의·수집, 자격 판정 로딩
- 대시보드: 사업자·예비창업자 두 모드, 판정 요약, 의무보험 체크리스트, 상환 요약
- 마이페이지: 내 정보, 연동 계좌, 관심 목록, 회원탈퇴
- 프론트 보안: 토큰 저장 정책, XSS 차단, CSRF 표식 헤더, Nginx 보안 헤더와 CSP, 유휴 자동 로그아웃, 민감정보 마스킹
- 범위: 화면 22개 중 14개, API 56개 중 34개 연동, MSW 핸들러 56개 중 33개, 공용 UI 컴포넌트 9개

팀에서 구현한 부분 (제 작업이 아닙니다)

| 영역 | 담당 |
|---|---|
| 대출·지원사업 목록과 상세, 신청·서류 제출, 자금 조합, 상권 분석, 상환 관리 화면, 그 밖의 공용 UI | 프론트 팀원 |
| 자격 판정(RAG·LLM), 마이데이터, OCR 검증, 서류 초안 생성, 금융망 연동 등 백엔드·AI 전체 | 백엔드·AI 팀원 |
| Jenkins CI/CD, Docker Compose, EC2, Nginx 기본 구성 | 인프라 팀원 |

인프라 쪽에서 제가 만진 것은 Nginx의 보안 헤더와 서비스 워커 캐시 설정, 프론트 Dockerfile의 빌드 인자까지입니다. 테스트 계정(페르소나) 6명은 팀이 함께 설계했습니다.

<sub>화면은 모두 같은 크기로 잘라 두었습니다. 누르면 전체 캡처가 열립니다.</sub>

화면 — 인증 · 온보딩

비로그인 랜딩부터 로그인·약관 동의·사업자 인증까지, 서비스에 들어오는 경로 전체를 담당했습니다.

| 랜딩 | 로그인 |
| :---: | :---: |
| <a href="docs/screenshots/01_landing.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-01_landing.png" width="420"/></a> | <a href="docs/screenshots/02_login.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-02_login.png" width="420"/></a> |
| **약관 동의 (회원가입)** | **사업자 인증** |
| <a href="docs/screenshots/03_signup_terms.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-03_signup_terms.png" width="420"/></a> | <a href="docs/screenshots/31_pre_verify.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-31_pre_verify.png" width="420"/></a> |

화면 — 대시보드

자격 판정 요약, 지원 가능한 대출·지원사업, 상환 일정, 의무보험 가입 현황, 마이데이터 매출을 한 화면에 모읍니다. 조각 하나가 실패해도 나머지는 그대로 렌더링됩니다(5번 문제 2).

| 위쪽 — 자격 판정 요약 · 지원 가능 상품 | 아래쪽 — 상환 일정 · 보험 · 매출 |
| :---: | :---: |
| <a href="docs/screenshots/10_dashboard.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-10_dashboard.png" width="420"/></a> | <a href="docs/screenshots/10_dashboard.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-10_dashboard_2.png" width="420"/></a> |

화면 — 마이페이지 · 관심 목록

| 마이페이지 | 연동 계좌 |
| :---: | :---: |
| <a href="docs/screenshots/23_mypage.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-23_mypage.png" width="420"/></a> | <a href="docs/screenshots/24_mypage_accounts.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-24_mypage_accounts.png" width="420"/></a> |
| **관심 목록** | **신청 현황** |
| <a href="docs/screenshots/22_favorites.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-22_favorites.png" width="420"/></a> | <a href="docs/screenshots/21_applications.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-21_applications.png" width="420"/></a> |

화면 — 예비창업자 모드

사업자등록 전에도 상권 분석과 예비창업자 대상 지원금·대출을 볼 수 있습니다. 사업자 정보가 없는 상태에서 화면이 깨지지 않는 것이 이 모드의 핵심이고, 사업자 전용 기능은 막는 대신 인증으로 이어지는 안내를 띄웁니다.

| 예비창업자 대시보드 | 마이페이지 (미인증) |
| :---: | :---: |
| <a href="docs/screenshots/30_pre_dashboard.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-30_pre_dashboard.png" width="420"/></a> | <a href="docs/screenshots/36_pre_mypage.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-36_pre_mypage.png" width="420"/></a> |
| **대출 — 예비창업자 자격 판정** | **상환 관리 — 사업자 전용 안내** |
| <a href="docs/screenshots/32_pre_loans.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-32_pre_loans.png" width="420"/></a> | <a href="docs/screenshots/34_pre_repayments_locked.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-34_pre_repayments_locked.png" width="420"/></a> |
| **지원사업** | **신청 현황** |
| <a href="docs/screenshots/33_pre_support_programs.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-33_pre_support_programs.png" width="420"/></a> | <a href="docs/screenshots/35_pre_applications.png"><img src="docs/screenshots/%EC%98%AC%EB%A6%B4%EC%82%AC%EC%A7%84_Sobi/thumb-35_pre_applications.png" width="420"/></a> |

## 3. Architecture

전체 시스템 구조

브라우저 요청을 Nginx가 받아 정적 파일과 `/api/`로 가르고, Spring Boot가 비즈니스 로직과 외부 연동(금융망·Google OAuth·마이데이터)을 맡습니다. 프론트는 AI 서버를 직접 부르지 않습니다.

담당 영역의 구조

```
frontend/src
├── app/          앱 조립 — 라우터·보호 라우트·레이아웃
├── pages/        라우트 단위 페이지 (features 를 조합만 한다)
├── features/     도메인별 폴더 — 각 폴더 안에 api/ hooks/ components/ model/
├── shared/       api(axios·queryClient) · lib/store(zustand) · ui · types · utils
├── mocks/        MSW 핸들러 (백엔드 병렬 개발)
└── index.css     Tailwind 디자인 토큰
```

`app → pages → features → shared` 한 방향으로만 의존합니다. `shared`는 위쪽을 import하지 않고 feature끼리도 서로 import하지 않습니다. 폴더 이름은 Jira 에픽과 1:1로 맞췄습니다.

서버 간 통신 방식

- 브라우저 ↔ Spring Boot: REST(Axios). 모든 응답은 공통 봉투(`data`·`statusCode`·`timestamp`)에 담겨 오고, 응답 인터셉터가 봉투를 벗깁니다
- 인증: accessToken은 `Authorization` 헤더로 보내고, refreshToken은 서버가 httpOnly 쿠키로 관리합니다. 401을 받으면 인터셉터가 재발급한 뒤 원래 요청을 다시 보냅니다
- 개발 중: MSW가 요청을 실서버로 먼저 보내고, 아직 없는 엔드포인트만 목이 응답합니다

데이터 흐름

랜딩 → 회원가입·로그인 → 약관 동의 → 사업자 인증 → 마이데이터 전송요구 동의 → 수집·자격 판정 → 대시보드

데이터베이스 구성

- 서버 DB(PostgreSQL 16 + pgvector, Redis)는 백엔드 팀원이 설계했습니다
- 프론트에서 상태를 두는 곳은 제가 정했습니다. 서버 데이터는 TanStack Query, 전역 클라이언트 상태는 Zustand, accessToken은 메모리에만 둡니다. localStorage는 ESLint 규칙으로 막았습니다

## 4. Key Implementations

### 4-1. 실서버를 먼저 부르는 목 서버

- 구현 목적: 목을 켜면 개발 중에 실서버로 요청이 한 번도 나가지 않아 연동을 검증할 수 없었습니다. 백엔드가 API를 올려도 설정을 손으로 고치기 전까지 목이 응답했습니다
- 적용 기술: MSW, Axios 인터셉터
- 구현 과정: 목 핸들러 앞에 같은 경로의 탐지 핸들러를 두어 요청을 실서버로 먼저 보내고, 아직 없는 엔드포인트일 때만 목이 받게 했습니다. 도메인이 아니라 엔드포인트 단위라, 백엔드가 하나를 구현하면 설정을 고치지 않아도 목에서 빠집니다
- 기술적 고려사항: 같은 상태 코드가 두 가지 뜻이었습니다. 404는 매핑 없음일 수도 업무 404일 수도 있어서, 본문에 공통 봉투가 있는지로 갈랐습니다. 회원탈퇴·비밀번호 변경·마이데이터 연동처럼 되돌릴 수 없는 요청은 서버 오류일 때 목으로 넘기지 않습니다. 실제로는 처리됐는데 목이 성공을 한 번 더 만들어 보여 주는 일을 막기 위해서입니다

### 4-2. 세션과 토큰 재발급

- 구현 목적: 화면에 들어가면 아무것도 하지 않았는데 로그아웃되는 경로가 여럿 있었습니다
- 적용 기술: Axios 인터셉터, Zustand, TanStack Query
- 구현 과정: 첫 재발급 요청의 Promise를 보관해 뒤따르는 요청이 같은 Promise를 기다리게 했습니다. 재발급은 전용 axios 인스턴스로 보내고, 세션은 재발급이 401·403일 때만 지웁니다
- 기술적 고려사항: accessToken은 메모리에만 두고 localStorage에 넣지 않습니다. 새로고침하면 사라지므로 앱 진입 때 refresh로 세션을 복구하는 경로를 따로 만들었습니다

### 4-3. 프론트 보안을 규칙으로 고정

- 구현 목적: 위반이 0건이어도 그 상태를 지켜 줄 장치가 없으면 되돌아옵니다
- 적용 기술: ESLint 커스텀 규칙, 브라우저 `URL` 파서, Nginx 보안 헤더·CSP, BroadcastChannel
- 구현 과정: `localStorage` 사용, 토큰의 sessionStorage 저장, `dangerouslySetInnerHTML`, `console.log`를 ESLint 에러로 막았습니다. 서버가 준 서류 주소는 `URL` 파서로 스킴을 검사한 뒤에만 엽니다. 30분 동안 조작이 없으면 로그아웃하고 60초 전에 경고하며, 탭끼리 활동을 공유합니다. 계좌·사업자번호·이메일은 화면에서 가려 표시합니다
- 기술적 고려사항: CSRF 표식 헤더는 프론트만으로는 아무것도 막지 못합니다. 서버가 헤더를 검사해야 하는데 그 검사는 끝내지 못했고, 코드 주석에 그 사실을 적어 두었습니다

### 4-4. 대시보드 건수 재집계와 부분 실패 격리

- 구현 목적: 서버 요약이 판정과 상관없이 전체를 세고 있어 표시 건수와 실제 판정이 어긋났습니다
- 적용 기술: TanStack Query, `Promise.all`
- 구현 과정: 백엔드 수정을 기다리지 않고 목록 API 4개의 전체 건수로 다시 셌습니다. 네 칸의 합이 전체와 같아야 한다는 기준은 팀 회의에서 정했습니다
- 기술적 고려사항: 판정 조회만 따로 떼어, 실패해도 나머지 카드는 그리게 했습니다. 판정을 거치지 않은 목록에는 '지원 가능한 대출' 대신 '추천 대출'이라고 표시합니다

### 4-5. 마이데이터 연동 대기 화면

- 구현 목적: 마이데이터 연동은 서버가 15~40초 동안 응답을 잡고 있는 동기 호출입니다
- 적용 기술: Axios 요청별 타임아웃, TanStack Query
- 구현 과정: 이 요청만 타임아웃을 180초로 두고, 동의 화면은 응답을 기다리지 않고 수집 화면으로 넘어갑니다
- 기술적 고려사항: 진행률은 서버에 묻는 값이 아니라 예상 소요 시간으로 추정한 값입니다

## 5. Technical Challenges

### 문제 1. 화면에 들어가면 가끔 로그아웃됐습니다

- Situation: 화면 진입 때 여러 요청이 동시에 나가는데, accessToken이 만료돼 있으면 사용자는 아무것도 하지 않았는데 로그아웃됐습니다
- Cause: 요청마다 재발급을 불렀고, 두 번째 재발급부터는 이미 폐기된 refreshToken을 보냈습니다
- Solution: 첫 재발급의 Promise를 공유하고, 재발급 전용 인스턴스를 분리했습니다. 같은 인스턴스로 부르면 재발급이 401일 때 인터셉터가 재발급을 다시 불러 무한 재귀가 됩니다
- Result: 동시 요청에서 재발급이 한 번만 나갑니다. 재발급 응답의 봉투를 벗기지 않아 세션 복구가 조용히 실패하던 문제도 함께 잡았습니다

### 문제 2. 판정 조회 하나가 실패하면 대시보드 전체가 죽었습니다

- Situation: 자격 판정 조회가 실패하면 멀쩡한 매출·상환 정보까지 에러 화면으로 떨어졌습니다. 마이데이터를 아직 연동하지 않은 사용자에게 자주 났습니다
- Cause: 여러 조회를 한 묶음으로 처리해 하나의 실패가 전체 실패가 됐습니다
- Solution: 실패한 조각만 대체 화면을 띄우고 나머지는 그대로 그립니다. 404는 없는 것이 정상인 상태라 재시도하지 않습니다
- Result: 연동 전 사용자도 대시보드에 들어와 "사업자 인증하기"로 이어 갈 수 있습니다. 목 서버로 판정 조회 실패를 재현해 나머지 카드가 남는 것을 확인했습니다

### 문제 3. 보안 헤더가 일부 경로에서만 사라졌습니다

- Situation: Nginx의 server 블록에 보안 헤더를 넣었는데 정적 파일 경로에는 붙지 않았습니다
- Cause: `add_header`는 상속되지 않습니다. 하위 location에 `add_header`가 하나라도 있으면 상위 것이 전부 무시되는데, 캐시 헤더를 붙이는 location이 셋 있었습니다
- Solution: 보안 헤더를 별도 파일로 빼 블록마다 `include`하고, `always`를 붙여 404·500 응답에도 붙게 했습니다
- Result: 모든 경로에 보안 헤더가 붙습니다. 새 location을 추가할 때도 include하라는 주석을 파일 맨 위에 남겼습니다

### 문제 4. 구글 로그인과 계정 연결이 같은 주소로 돌아옵니다

- Situation: 로그인은 비로그인 상태로, 계정 연결은 로그인 상태로 같은 콜백 주소에 돌아옵니다
- Cause: 콜백 라우트를 보호 라우트에 넣으면 로그인이 막히고, 비로그인 전용 라우트에 넣으면 계정 연결이 막힙니다
- Solution: 콜백 라우트를 어느 가드에도 넣지 않고, 출발할 때 무엇을 하러 가는지 sessionStorage에 적어 두었다가 돌아와서 읽고 분기합니다. `state` 값은 한 번 쓰고 버립니다
- Result: 두 흐름이 한 콜백에서 갈립니다

### 문제 5. 잘못된 안내 한 줄이 계정을 못 쓰게 만들었습니다

- Situation: 사이드바의 업체 카드가 조회 실패를 전부 '미등록'으로 그려서, 이미 등록한 사업자에게 "업체 등록하기"가 떴습니다
- Cause: 401이나 네트워크 오류도 미등록과 같은 화면으로 처리했습니다. 거기서 다른 번호를 넣으면 업체가 두 건이 돼 그 계정의 일부 API가 계속 실패했습니다
- Solution: 백엔드 코드를 읽어 미등록 응답이 404 하나임을 확인하고, 404만 미등록으로 보고 나머지 실패에는 아무것도 그리지 않게 했습니다. 등록 화면에서도 조회 중이거나 실패하면 버튼을 잠급니다
- Result: 같은 계정에 두 번째 업체가 생기는 경로를 막았습니다

## 6. Performance & Results

- 개선 전후 비교, API 응답 시간, 데이터 처리 성능: 재지 않았습니다. 렌더링·번들 크기·응답 시간의 전후 기록이 없어 적지 않습니다
- 테스트 결과: 자동화된 테스트 코드는 넣지 못했습니다. 대신 판정이 갈리는 축을 나눈 테스트 계정 6명으로 화면 분기를 확인했고, 목 서버로 실패 응답(429·409·401·400 등)을 만들어 화면을 확인했습니다
- 범위: 화면 22개 중 14개, API 56개 중 34개 연동, MSW 핸들러 56개 중 33개

테스트 계정 6명과 프론트에서 확인한 것

| | 사업체 | 직원 | 등급 | 가능 | 확인필요 | 대출추천 | 보험 | 프론트에서 확인한 것 |
|---|---|---|---|---|---|---|---|---|
| **P1** 김표준 | 맛있는 한상 (서울·한식) | 4 | A | 16 | 10 | 19 | 8 | 표준 경로 — 잔액·대출금·출금계좌·추천 전부 렌더 |
| **P2** 이영세 | 카페 하루 (경북·커피) | 1 | E | 20 | 8 | 7 | 8 | 1인 사업장·자산 0 — 금액 0원 표기와 빈 상태 |
| **P3** 박대형 | 대형분식 (전남광주·분식) | 2 | C | 22 | 12 | 17 | 8 | 매출 12억 — 큰 숫자 포맷·줄바꿈 |
| **P4** 최예비 | (없음) | — | — | — | — | — | — | `business_info` 없음 — **404가 화면을 죽이지 않는지** |
| **P5** 정소셜 | 게임존 PC방 (경기·PC방) | 0 | B | 17 | 10 | 11 | 6 | 생년월일 없음 → 연령 `unknown`, 업종별 보험 6개 |
| **P6** 한직원 | 한상차림 (서울·한식) | 5 | A | **0** | 1 | 19 | 8 | **가능 0건** — 빈 목록 UI와 안내 문구 |

*(2026-09-18 기준, 공고 222건. 판정은 LLM이 하므로 호출마다 후보 안에서 조금씩 흔들리고, 공고가 추가되면 건수도 바뀝니다 — 위 대시보드 캡처는 공고 228건 시점이라 숫자가 다릅니다.)*

- 일정: 초반에 프론트 공통 기반이 한 번 덮여 다시 만드느라 개발 일정이 이틀 밀렸고, 절차를 바꾼 뒤로는 일정 차질이 없었습니다
- 수상: 팀이 SSAFY 특화 프로젝트 우수상(6팀 중 3등)을 받았습니다. 6명이 함께 받은 상입니다

## 7. Retrospective

개발하면서 배운 점

- 반복해서 어긋난다면 일을 넘기는 방식에 확인 절차가 없다는 뜻입니다. 초반에 작업 범위와 순서에 대한 서로의 이해가 달라 같은 일을 두 번 하게 됐습니다. 잘잘못을 따지는 대신 방식을 바꿨습니다. 분담을 전달로 끝내지 않고 이해가 일치하는지 중간중간 맞췄고, 순서의 이유를 설명했고, 막히면 물을 수 있는 경로를 만들었습니다
- 병목은 관리하기보다 없는 경로를 만드는 편이 낫습니다. 백엔드 API를 기다리는 문제를 실서버를 먼저 부르는 목 구조로 풀었고, 의무보험 화면은 목으로 먼저 만든 뒤 백엔드 API가 나오자 그대로 실서버로 넘어갔습니다

아쉬웠던 점

- CSRF 방어를 끝내지 못했습니다. 프론트에는 표식 헤더가 있고 서버에는 검사가 없는 상태로 남았습니다. 서버 쪽 작업 단위까지 같이 쪼개 일정에 올렸어야 했습니다
- 테스트를 넣지 못했습니다. 후반 커밋 대부분이 QA에서 나온 수정이었습니다
- 사업자와 예비창업자가 같은 라우트를 쓰는 구조를 화면을 만들기 시작한 뒤에 정했습니다. 역할 분기가 여러 화면에 흩어져 QA에서 버그가 가장 많이 나왔습니다
- 핀테크를 주제로 골랐지만 완성된 서비스는 정보 매칭에 가까워졌습니다. 팀이 함께 내린 결정이었습니다

현재 다시 개발한다면 개선할 부분

- 화면을 만들기 전에 테스트 경로부터 깔겠습니다. MSW가 이미 있어 컴포넌트 테스트를 붙이기 좋은 상태였습니다
- 라우트를 나눌지는 "화면이 얼마나 겹치는가"가 아니라 "역할이 앞으로 늘어날 것인가"로 첫 구조를 잡을 때 정하겠습니다
- 주제를 고를 때 기간 안에 만들 수 있는 범위를 먼저 그리겠습니다. 범위는 만들다가 줄이는 것보다 고를 때 정하는 쪽이 쌉니다
