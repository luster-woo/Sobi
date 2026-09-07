# frontend

React 19 + TypeScript + Vite

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

| 폴더                 | 용도                                             |
| -------------------- | ------------------------------------------------ |
| `api/`               | API 요청 함수, axios 인스턴스                    |
| `assets/`            | 이미지·폰트 등 정적 리소스                       |
| `components/common/` | 도메인과 무관한 재사용 UI (Button, Modal, Input) |
| `components/layout/` | Header, Footer, Layout 등 골격                   |
| `constants/`         | 상수, 라우트 경로, 에러 메시지                   |
| `hooks/`             | 커스텀 훅                                        |
| `mocks/`             | MSW 핸들러                                       |
| `pages/`             | 라우트 단위 페이지 컴포넌트                      |
| `routes/`            | 라우터 설정                                      |
| `store/`             | 전역 상태                                        |
| `styles/`            | 전역 스타일, 테마                                |
| `types/`             | 여러 곳에서 쓰는 공용 타입                       |
| `utils/`             | 의존성 없는 순수 함수                            |

빈 폴더는 `.gitkeep` 으로 추적 중입니다. 실제 파일이 들어가면 지워주세요.

## 컨벤션

- **import 경로** — `@` 별칭 사용. `@/components/common/Button` (상대경로 `../../` 금지)
- **API 호출** — 절대주소 금지, `/api/...` 상대경로만. 개발 서버에서 `localhost:8080` 으로 프록시됩니다
- **파일명** — 컴포넌트는 PascalCase(`Button.tsx`), 그 외는 camelCase(`formatDate.ts`)
- **타입** — 한 파일에서만 쓰는 타입은 `types/` 대신 그 파일 안에 둡니다
- **커밋 전** — `npm run lint` 과 `npm run build` 통과 확인

## 에디터 설정

`.editorconfig` 가 줄바꿈(LF)·인덴트를 통일합니다. VSCode에서 적용되려면 확장이 필요합니다.

- `EditorConfig for VS Code`
- `ESLint`
- `Prettier - Code formatter`

## 주의

- 줄바꿈은 **LF**. CRLF로 저장하면 변경 없는 파일이 전부 수정된 것으로 잡혀 리뷰가 불가능해집니다
- `node_modules/`, `dist/` 는 커밋 금지 (루트 `.gitignore` 에서 제외 중)
