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
      'no-restricted-syntax': [
        'error',
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
