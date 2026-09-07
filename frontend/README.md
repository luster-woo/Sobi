# frontend

React 19 + TypeScript + Vite + Tailwind v4

## 실행

```bash
npm install
npm run dev        # localhost:5173
npm run build      # 배포 빌드 (커밋 전 필수 확인)
npm run preview    # 빌드 결과 로컬 확인
npm run lint       # ESLint 검사
npm run lint:fix   # ESLint 자동 수정
npm run format     # Prettier 포맷
```

## 디렉토리 규칙

```
src/
├─ app/                라우터 설정 (router.tsx)
├─ assets/             이미지·폰트 등 정적 리소스
├─ components/
│  ├─ common/          도메인과 무관한 공용 UI (Button, Card, Modal, Input…)
│  └─ layout/          AppLayout, PublicLayout, AppHeader, AppSidebar
├─ mocks/              목 데이터(*.mock.ts) + MSW 핸들러
├─ pages/              화면. 화면흐름도 번호와 1:1
│  ├─ landing/         01 시작 페이지
│  ├─ auth/            02~05 로그인·회원가입·비밀번호
│  ├─ onboarding/      06~09 사업자 인증·마이데이터
│  ├─ dashboard/       10 대시보드
│  ├─ market/          11 상권 분석
│  ├─ loans/           13 대출
│  ├─ supports/        14 지원금
│  ├─ funding/         15 자금 조합
│  ├─ repayments/      16 상환 관리
│  ├─ applications/    17 신청 현황
│  ├─ mypage/          18 마이페이지·관심 목록·연동 계좌
│  └─ _dev/            개발용 컴포넌트 갤러리 (/_gallery)
├─ types/              여러 곳에서 쓰는 공용 타입
├─ utils/              의존성 없는 순수 함수 (formatWon, cn, session…)
├─ index.css           Tailwind + 디자인 토큰(@theme)
└─ main.tsx
```

**폴더를 고를 때 기준 하나만 기억하면 됩니다.**

> 두 화면 이상에서 쓰이면 `components/common`, 한 화면에서만 쓰이면 그 페이지 폴더 안에.

페이지 전용 조각은 그 페이지 폴더에 둡니다 (예: `pages/mypage/WithdrawModal.tsx`).
전역 상태·API 클라이언트·커스텀 훅이 필요해지면 `store/`, `api/`, `hooks/` 를 그때 만듭니다.

## 디자인 토큰

색·타이포·반경·간격은 전부 `src/index.css` 의 `@theme` 에 있습니다.
**컴포넌트에 hex 를 직접 쓰지 마세요.**

| 종류   | 예시                                                                  |
| ------ | --------------------------------------------------------------------- |
| 색     | `bg-primary` `text-text-muted` `border-border-strong` `bg-primary/10` |
| 타이포 | `typo-h1` `typo-body1` `typo-caption` `typo-label` `typo-badge`       |
| 반경   | `rounded-sm(6)` `rounded-md(10)` `rounded-lg(14)` `rounded-xl(20)`    |
| 간격   | `p-card(20)` `gap-section(24)` `h-header(56)` `w-sidebar(224)`        |

`typo-*` 는 글꼴·크기·행간·굵기가 한 세트로 묶인 클래스입니다. 제목·본문에는 이것만 쓰면
디자인 보드와 항상 일치합니다.

## 컨벤션

- **import 경로** — `@` 별칭 사용. `@/components/common/Button` (상대경로 `../../` 금지, 같은 폴더 안은 `./` 허용)
- **API 호출** — 절대주소 금지, `/api/...` 상대경로만. 개발 서버에서 `localhost:8080` 으로 프록시됩니다
- **파일명** — 컴포넌트는 PascalCase(`Button.tsx`), 그 외는 camelCase(`formatDate.ts`)
- **타입** — 한 파일에서만 쓰는 타입은 `types/` 대신 그 파일 안에 둡니다
- **컴포넌트 파일에서 함수·상수 export 금지** — Fast Refresh 가 깨집니다. 별도 파일로 분리하세요
- **커밋 전** — `npm run lint` 과 `npm run build` 통과 확인

## 목 데이터

현재 화면은 `src/mocks/*.mock.ts` 의 정적 데이터로 동작합니다.
API 연동 단계에서 이 데이터를 MSW 핸들러(`src/mocks/handlers/`) 응답으로 옮기고,
화면은 `fetch` 로 바꿉니다. 타입(`types/`)이 같으므로 화면 코드는 거의 그대로 씁니다.

목업 확인용 임시 동작은 화면에 `목업 안내:` 캡션으로 표시해 두었습니다. 연동 시 제거 대상입니다.

## 에디터 설정

`.editorconfig` 가 줄바꿈(LF)·인덴트를 통일합니다. VSCode에서 적용되려면 확장이 필요합니다.

- `EditorConfig for VS Code`
- `ESLint`
- `Prettier - Code formatter`

## 주의

- 줄바꿈은 **LF**. CRLF로 저장하면 변경 없는 파일이 전부 수정된 것으로 잡혀 리뷰가 불가능해집니다
- `node_modules/`, `dist/` 는 커밋 금지 (루트 `.gitignore` 에서 제외 중)
