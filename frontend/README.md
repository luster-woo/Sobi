# frontend

React 19 + TypeScript + Vite

## 실행

```bash
npm install
npm run dev        # localhost:5173 — 실서버(localhost:8080)로 붙는다
npm run dev:mock   # MSW 목으로 붙는다 (백엔드 없이 화면만 볼 때)
npm run build      # 배포 빌드 (커밋 전 필수 확인)
npm run preview    # 빌드 결과 로컬 확인
npm run lint       # ESLint 검사
npm run lint:fix   # ESLint 자동 수정
npm run format     # Prettier 포맷
```

> 타입 검사는 `npx tsc --noEmit` 이 아니라 **`npx tsc -b`** 로 한다.
> 루트 `tsconfig.json` 이 `"files": []` + references 구조라 `--noEmit` 은 아무 파일도 검사하지 않는다.

## 목(MSW)

`VITE_USE_MOCK=true` 일 때만 켜진다. `npm run dev` 는 꺼짐(`.env.development`),
`npm run dev:mock` 은 켜짐(`.env.mock`)이다.

**목은 백엔드에 아직 없는 엔드포인트만 받는다.** 목이 켜져 있어도 요청은 실서버로
먼저 나가고, 서버가 응답하면 그 응답을 쓴다. 아직 없는 엔드포인트일 때만 목이 받는다.
그래서 백엔드가 API 를 올리면 **설정을 안 고쳐도 자동으로 목에서 빠진다.**

콘솔에 엔드포인트별로 어느 쪽이 응답했는지 찍힌다.

```
[MSW] POST /api/v1/auth/login — 실서버 응답 사용
[MSW] GET /api/v1/user/me — 백엔드 미구현, 목으로 응답합니다
```

미구현 판정은 **404·405 중 공통 봉투가 없는 응답**과 연결 실패다. 스프링에 매핑이 없어
나는 404 와 업무 로직이 내는 404(`BUSINESS_O04` 등)를 본문으로 가른다. 업무 404 는
실서버 응답을 그대로 쓴다.

손으로 개입해야 하는 경우는 둘뿐이다.

```bash
# .env.mock
VITE_MOCK_DOMAINS=loan,support   # 목을 아예 등록하지 않을 때. 비우면 전부 등록
VITE_MOCK_FORCE=dashboard        # 서버는 있는데 응답 모양이 아직 안 맞을 때
```

고를 수 있는 값은 `src/mocks/handlers/index.ts` 의 `HANDLERS_BY_DOMAIN` 키다 —
`account` `application` `auth` `business` `funding` `insurance` `loan` `market`
`notification` `repayment` `support`.

## 구글 로그인

`VITE_GOOGLE_CLIENT_ID` 가 비어 있으면 구글 버튼이 비활성화된다.
클라이언트 ID 는 공개값이라 커밋해도 된다 — 비밀은 `clientSecret` 이고 서버만 가진다.

```bash
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/google
```

⚠️ **리디렉션 URI 는 세 곳이 글자 하나까지 같아야 한다** — 구글 콘솔의 '승인된 리디렉션 URI',
프론트의 이 값, 서버가 code 를 교환할 때 쓰는 값. 하나만 달라도 구글이
`redirect_uri_mismatch` 로 막는다. 배포 도메인을 쓰려면 콘솔에도 그 주소를 추가해야 한다.

로그인과 계정 연결이 **같은 콜백 주소**를 쓴다. 무엇을 하러 갔는지는 출발할 때
sessionStorage 에 기록해 두고(`oauth:intent`) 돌아와서 읽는다.

```
로그인    버튼 → 구글 동의 → /oauth/google → POST /auth/oauth/google
계정 연결  마이페이지 버튼 → 구글 동의 → /oauth/google → POST /auth/social/google
```

> 명세 예시에는 `/oauth/callback` 으로 적혀 있지만 **구글 콘솔에 등록된 값은 `/oauth/google`** 이다.
> 백엔드는 우리가 보낸 `redirectUri` 를 그대로 구글에 넘기므로 서버 수정은 필요 없다.

그래서 콜백 라우트는 ProtectedRoute·PublicOnlyRoute **어느 가드에도 넣지 않는다.**
로그인은 비로그인 상태로, 계정 연결은 로그인 상태로 같은 주소에 돌아오기 때문이다.

`state` 는 OAuth CSRF 를 막는 일회용 표식으로, sessionStorage 에 저장했다가 돌아온 값과
비교하고 버린다.

## 주요 라이브러리

| 라이브러리            | 용도                            |
| --------------------- | ------------------------------- |
| react-router          | 라우팅                          |
| @tanstack/react-query | 서버 상태 (조회·캐싱·재시도)    |
| zustand               | 전역 클라이언트 상태            |
| axios                 | HTTP 클라이언트                 |
| tailwindcss v4        | 스타일 (토큰은 `src/index.css`) |
| msw                   | API 목                          |

## 디렉토리 규칙

도메인별 세로 슬라이스 구조입니다. `app` → `pages` → `features` → `shared` 한 방향으로만
의존합니다. `shared` 는 위쪽을 import 하지 않고, feature 끼리도 서로 import 하지 않습니다.
두 feature 가 같은 걸 써야 하면 `shared` 로 올립니다.

```
src/
├─ app/                 앱 조립 — 여기서만 전역 설정을 만진다
│  ├─ providers/        QueryClientProvider 등 프로바이더
│  ├─ routes/           라우터 정의, 인증 보호 라우트          (118)
│  ├─ layouts/          Header·Footer·RootLayout               (110)
│  └─ App.tsx
├─ pages/               라우트 단위 페이지. features 를 조합만 한다
├─ features/            도메인별 기능. 각 폴더 안에 api/ hooks/ components/
│  ├─ landing/          비로그인 랜딩 — 히어로·기능 소개        (133)
│  ├─ auth/             인증, 온보딩(업체 등록·진위확인)        (133)
│  ├─ business/         업체 정보 수정, 매출·세액
│  ├─ dashboard/        대시보드, 의무보험 체크리스트            (176)
│  ├─ mypage/           마이페이지, 계좌, 알림 설정              (199)
│  ├─ market-analysis/  상권 분석                               (179)
│  ├─ loan/             대출 상품 목록·상세                     (184)
│  ├─ loan-repayment/   상환 관리                               (197)
│  ├─ support-program/  지원금(지원사업) 목록·상세              (191)
│  ├─ funding-plan/     자금 조합                               (196)
│  └─ application/      신청 현황                               (198)
├─ shared/              도메인에 안 묶이는 것들
│  ├─ api/              axios 인스턴스, queryClient, 엔드포인트 상수
│  ├─ lib/store/        zustand 스토어
│  ├─ types/            ERD 기반 공용 도메인 타입
│  ├─ ui/               Button·Modal·Input 등 재사용 UI         (168)
│  ├─ hooks/            공용 커스텀 훅
│  ├─ constants/        상수, 에러 메시지
│  └─ utils/            의존성 없는 순수 함수
├─ mocks/               MSW 핸들러
├─ assets/              이미지·폰트
├─ index.css            Tailwind 디자인 토큰
└─ main.tsx
```

괄호 안 숫자는 담당 Jira 에픽입니다. 폴더 이름을 에픽과 맞춰뒀으니 이슈 번호만 보고
어디를 건드릴지 정하면 됩니다.

`features/` 하위 폴더는 해당 도메인 작업을 시작할 때 만듭니다. 예를 들어 대출 목록을
작업하면 `features/loan/api/getLoans.ts`, `features/loan/hooks/useLoans.ts` 가 생깁니다.

폴더가 없는 도메인이 몇 개 있습니다. ERD 에는 테이블이 있지만 화면이 독립돼 있지 않아
쓰는 쪽에 붙였습니다.

| ERD 도메인            | 어디에 있나                                             |
| --------------------- | ------------------------------------------------------- |
| `insurance_checklist` | `features/dashboard/`                                   |
| `notification`        | 벨·드롭다운은 `app/layouts/`, 설정은 `features/mypage/` |
| `bookmark`            | 토글 버튼을 쓰는 `features/loan/`·`support-program/`    |

여러 feature 가 같이 쓰게 되면 그때 `shared/` 로 올리거나 독립 feature 로 뺍니다.

반대로 `landing/` 은 ERD 도메인이 없습니다. 서버에서 받아오는 게 없고 카피와 예시 숫자가
화면과 같이 배포되는 마케팅 페이지라 `api/` `hooks/` 없이 `components/` 만 있습니다.
에픽은 133(인증·온보딩)이지만 인증 로직과 섞이지 않게 폴더를 따로 뒀습니다.

빈 폴더는 `.gitkeep` 으로 추적 중입니다. 실제 파일이 들어가면 지워주세요.

## 컨벤션

- **import 경로** — `@` 별칭 사용. `@/shared/ui/Button` (상대경로 `../../` 금지)
- **API 호출** — 절대주소 금지, `/api/...` 상대경로만. 개발 서버에서 `localhost:8080` 으로 프록시됩니다
- **파일명** — 컴포넌트는 PascalCase(`Button.tsx`), 그 외는 camelCase(`formatDate.ts`).
  폴더는 소문자, 두 단어 이상이면 kebab-case(`support-program`)
- **타입** — 한 파일에서만 쓰는 타입은 `shared/types/` 대신 그 파일 안에 둡니다
- **주석** — 코드만 봐도 아는 건 쓰지 않습니다. 서버 응답에서 null 이 채워지는 시점,
  명세와 실제가 다른 지점, 그렇게 결정한 이유처럼 코드에 없는 정보만 남깁니다
- **서버 상태 vs 전역 상태** — 서버에서 받아오는 건 react-query, 그 외(토큰·UI)만 zustand
- **커밋 전** — `npm run lint` 과 `npm run build` 통과 확인

## 상태 관리

- **서버 상태** — `@tanstack/react-query`. 목록·상세 조회는 전부 여기로. 캐싱·재시도·무효화를
  라이브러리가 맡습니다
- **전역 클라이언트 상태** — `zustand`. 현재 두 개뿐입니다
  - `useAuthStore` — accessToken·user·세션 복구 상태
  - `useUiStore` — 토스트 큐
- **로컬 상태** — 그 컴포넌트에서만 쓰면 `useState`. 스토어에 올리지 않습니다

accessToken 은 메모리(zustand)에만 두고 localStorage 에 저장하지 않습니다. refreshToken 은
서버가 httpOnly 쿠키로 관리하므로 프론트에서 값을 볼 수 없습니다. 그래서 새로고침하면
토큰이 사라지고, 앱 진입 시 refresh 로 세션을 복구합니다 — 그 사이는
`useAuthStore.status === 'loading'` 입니다.

## 에디터 설정

`.editorconfig` 가 줄바꿈(LF)·인덴트를 통일합니다. VSCode에서 적용되려면 확장이 필요합니다.

- `EditorConfig for VS Code`
- `ESLint`
- `Prettier - Code formatter`

## 주의

- 줄바꿈은 **LF**. CRLF로 저장하면 변경 없는 파일이 전부 수정된 것으로 잡혀 리뷰가 불가능해집니다
- `node_modules/`, `dist/` 는 커밋 금지 (루트 `.gitignore` 에서 제외 중)
