import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      /*
       * XSS 회귀 방지 (S15P21D101-394).
       *
       * 지금 두 패턴 다 코드에 0건이다. 점검은 그 시점의 사진일 뿐이라, 다음에 누가
       * 넣어도 아무도 못 거른다. 규칙이 있어야 상태가 유지된다.
       *
       * eslint-plugin-react 를 쓰면 react/no-danger · react/jsx-no-target-blank 로
       * 더 정확하게 잡히지만, 규칙 둘 때문에 의존성을 늘리지 않고 선택자로 처리했다.
       */
      /*
       * 토큰 저장 회귀 방지 (S15P21D101-395).
       *
       * accessToken 은 메모리(zustand)에만 둔다. localStorage·sessionStorage 에 넣으면
       * XSS 스크립트가 `getItem` 한 줄로 꺼내 간다 — 메모리에 있으면 그런 범용
       * 페이로드로는 못 꺼낸다. refreshToken 은 httpOnly 쿠키라 JS 가 아예 못 읽는다.
       *
       * 지금 코드에 위반이 0건인데, 그 상태를 지켜주는 장치가 없어서 규칙으로 못 박는다.
       * 판단 근거는 docs 의 인증 ADR 에 적혀 있다.
       */
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'localStorage 는 쓰지 않습니다. 토큰은 메모리(useAuthStore)에만 두고, 탭을 닫으면 사라져야 하는 값은 sessionStorage 를 쓰세요. 영구 저장이 꼭 필요하면 인증 ADR 을 먼저 고치고 사유와 함께 이 규칙을 비활성화하세요.',
        },
      ],

      /*
       * 민감정보 노출 경로 차단 (S15P21D101-395).
       *
       * `console.log` 만 막는다. 디버깅하다 남기는 것이 거의 이 함수이고, 사용자 값을
       * 통째로 찍는 것도 여기다 — `console.log(user)` 한 줄이 브라우저 콘솔에 남으면
       * 그 화면을 캡처해 문의로 보내는 순간 새어 나간다.
       *
       * info·warn·error 는 남긴다. MSW 가 어느 엔드포인트를 목으로 받았는지 알리고
       * (`mocks/lib/serverFirst.ts`), 세션 복구 폴백 같은 경고가 이 셋을 쓴다 —
       * 의도를 갖고 적은 문구라 사람이 한 번 판단한 자리다.
       *
       * 번들에서 통째로 지우는 방법(esbuild `drop`)도 있으나 Vite 8 은 미니파이어가
       * oxc 라 그 옵션이 없다. 넣는 쪽을 막는 것이 더 확실하기도 하다.
       */
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],

      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='sessionStorage'][callee.property.name='setItem'][arguments.0.value=/token|jwt|credential|secret|password/i]",
          message:
            '토큰·비밀번호를 sessionStorage 에 저장하지 마세요. XSS 스크립트가 한 줄로 꺼내 갑니다. accessToken 은 useAuthStore(메모리)에, refreshToken 은 서버가 httpOnly 쿠키로 관리합니다.',
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'dangerouslySetInnerHTML 은 XSS 로 직결됩니다. 텍스트는 JSX 로 그대로 넣으면 React 가 이스케이프합니다. 정말 필요하면 DOMPurify 같은 새니타이저를 거치고 이 규칙을 사유와 함께 비활성화하세요.',
        },
        {
          selector: "JSXAttribute[name.name='target'][value.value='_blank']",
          message:
            "target=\"_blank\" 대신 window.open(toSafeExternalUrl(url), '_blank', 'noopener,noreferrer') 을 쓰세요. 바깥 주소는 스킴을 먼저 걸러야 javascript: 실행을 막습니다 (shared/utils/externalUrl.ts).",
        },
      ],
    },
  },
])
