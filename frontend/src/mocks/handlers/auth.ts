import { http } from 'msw'

import { fail, ok } from '@/mocks/lib/envelope'
import type { LoginRequest, SessionUser } from '@/shared/types'
import { USER_ROLE } from '@/shared/types'

/**
 * 목 세션.
 *
 * 실제로는 refreshToken 이 httpOnly 쿠키라 새로고침해도 남는다. 그 지속성이 없으면
 * 세션 복구를 테스트할 수 없어서 sessionStorage 로 흉내낸다.
 *
 * 기본값은 **비로그인**이다. 첫 화면이 랜딩(`/`)이고, 온보딩을 처음부터 눌러보려면
 * 로그인 전 상태여야 한다. 아래 계정으로 실제 로그인하면 보호 라우트가 열린다.
 *
 * 133(인증/온보딩)에서 실제 쿠키 흐름으로 교체한다.
 *
 * 업체를 등록하면(`POST /business`) 이 저장본의 role 이 ENTREPRENEUR 로 바뀐다 —
 * 아래 `promoteToOwner` 를 `handlers/business.ts` 가 부른다. 목에서도 재발급 토큰에
 * 바뀐 role 이 실려야 사이드바 카드가 뜨는 것까지 확인할 수 있다.
 */
const SESSION_KEY = 'msw:logged-in'
/** 어느 계정으로 로그인했는지. `/user/me` 가 이 값으로 유저를 고른다 */
const SESSION_EMAIL_KEY = 'msw:email'

function hasSession() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

/** 다른 도메인 핸들러가 '인증 필요' 를 흉내 낼 때 쓴다 */
export const hasMockSession = hasSession

/** 실제 로그인 응답이 주는 네 필드뿐이다 */
const ENTREPRENEUR_USER: SessionUser = {
  userId: 1,
  email: 'owner@sogong.com',
  name: '김소상',
  role: USER_ROLE.ENTREPRENEUR,
}

const PREENTREPRENEUR_USER: SessionUser = {
  userId: 2,
  email: 'pre@sogong.com',
  name: '박예비',
  role: USER_ROLE.PREENTREPRENEUR,
}

interface MockAccount {
  password: string
  user: SessionUser
}

/**
 * 목 계정.
 *
 * 비밀번호는 두 계정 모두 `sogong1234!` 다. `validatePassword` 규칙(영문·숫자·특수문자
 * 8자 이상)을 통과하는 값으로 골랐다 — 화면 검증에 먼저 걸리면 로그인 실패를 볼 수 없다.
 *
 * 가입으로 만든 계정도 여기에 들어간다. 상수로만 두면 가입 직후 로그인이 실패해서
 * 가입 → 로그인 → 온보딩 흐름을 이어서 확인할 수 없다.
 *
 * sessionStorage 에 얹어 새로고침을 견디게 한다 — 가입하고 로그인 화면으로 넘어간 뒤
 * 새로고침하면 계정이 사라지는 일을 막는다. 탭을 닫으면 초기화된다.
 */
const ACCOUNTS_KEY = 'msw:accounts'

const SEED_ACCOUNTS: Record<string, MockAccount> = {
  'owner@sogong.com': { password: 'sogong1234!', user: ENTREPRENEUR_USER },
  'pre@sogong.com': { password: 'sogong1234!', user: PREENTREPRENEUR_USER },
}

function loadAccounts(): Record<string, MockAccount> {
  try {
    const saved = sessionStorage.getItem(ACCOUNTS_KEY)
    return saved
      ? { ...SEED_ACCOUNTS, ...(JSON.parse(saved) as Record<string, MockAccount>) }
      : SEED_ACCOUNTS
  } catch {
    return SEED_ACCOUNTS
  }
}

function findAccount(email: string): MockAccount | undefined {
  return loadAccounts()[email]
}

/**
 * 가입한 계정을 더한다.
 *
 * role 은 `PREENTREPRENEUR` 다. 백엔드 `AuthServiceImpl.signup()` 이 그렇게 넣는다 —
 * 사업자가 되려면 `POST /business` 로 업체를 등록해야 한다.
 */
function addAccount(email: string, password: string, name: string) {
  const accounts = loadAccounts()

  accounts[email] = {
    password,
    user: { userId: Date.now(), email, name, role: USER_ROLE.PREENTREPRENEUR },
  }

  sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

/**
 * 업체 등록 성공 처리. 로그인한 계정의 role 을 ENTREPRENEUR 로 올린다.
 *
 * 백엔드 `BusinessServiceImpl.business()` 의 `user.changeRole(ENTREPRENEUR)` 에 해당한다.
 * 목에서도 이걸 해줘야 뒤이은 `/auth/refresh` 가 바뀐 role 이 담긴 토큰을 준다 —
 * 안 그러면 등록은 됐는데 사이드바 카드가 안 뜨는 상태를 목에서 재현하게 된다.
 */
export function promoteToOwner() {
  const email = sessionStorage.getItem(SESSION_EMAIL_KEY)
  if (!email) return

  const accounts = loadAccounts()
  const account = accounts[email]
  if (!account) return

  accounts[email] = {
    ...account,
    user: { ...account.user, role: USER_ROLE.ENTREPRENEUR },
  }

  sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

/** 비밀번호 재설정. 시드 계정도 덮어쓸 수 있게 저장본에 기록한다 */
function updatePassword(email: string, password: string) {
  const accounts = loadAccounts()
  const account = accounts[email]
  if (!account) return

  accounts[email] = { ...account, password }
  sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function currentUser(): SessionUser | null {
  const email = sessionStorage.getItem(SESSION_EMAIL_KEY)
  return email ? (findAccount(email)?.user ?? null) : null
}

/**
 * 백엔드 `JwtProvider` 와 같은 claim 을 담은 가짜 JWT.
 *
 * 세션 복구 폴백이 토큰을 디코드하므로 `sub`·`email`·`role` 이 실제로 들어 있어야
 * 목 환경에서도 그 경로를 검증할 수 있다. 서명은 검증하지 않는다.
 */
function createMockAccessToken(user: SessionUser): string {
  const encode = (value: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    sub: String(user.userId),
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 1800,
  })

  return `${header}.${payload}.mock-signature`
}

/**
 * 가입 흐름에서 쓰는 고정 인증번호.
 *
 * 서버는 6자리 난수를 만들어 메일로 보낸다. 목에는 메일이 없으니 값을 고정하고
 * 발송할 때 콘솔에 찍는다.
 */
const MOCK_VERIFICATION_CODE = '123456'

/** 1분 쿨다운. 서버 `emailCodeRepository.isCoolingDown` 을 흉내 낸다 */
const COOL_DOWN_MS = 60_000
const coolDownUntil = new Map<string, number>()

function isCoolingDown(email: string) {
  return Date.now() < (coolDownUntil.get(email) ?? 0)
}

function startCoolDown(email: string) {
  coolDownUntil.set(email, Date.now() + COOL_DOWN_MS)
}

/**
 * 인증을 마친 이메일. 서버도 검증 성공과 가입을 분리해서 이 상태를 따로 들고 있다.
 * 이게 없으면 가입할 때 AUTH_006 이다.
 */
const verifiedEmails = new Set<string>()

const markVerified = (email: string) => verifiedEmails.add(email)
const isVerified = (email: string) => verifiedEmails.has(email)
const clearVerified = (email: string) => verifiedEmails.delete(email)

/**
 * 이미 쓴 resetToken. 서버가 1회용으로 지우는 것을 흉내 낸다.
 *
 * 토큰이 어느 계정 것인지도 기억한다 — 재설정 후 새 비밀번호로 로그인되는지까지
 * 확인하려면 계정을 찾아야 한다.
 */
const resetTokenOwner = new Map<string, string>()
const usedResetTokens = new Set<string>()

/**
 * 인증 / 계정 (auth) 목 핸들러. 메시지·에러코드는 실제 백엔드 값을 그대로 쓴다.
 *
 * ⚠️ 남은 계약 불일치
 *    - 로그인 응답이 `refreshToken` 을 바디로 준다. 실제로는 httpOnly 쿠키다
 *    - `/user/me` 는 백엔드 미구현이라 목이 유일한 구현이다 — S15P21D101-377
 *
 * 가입 흐름은 목에서도 순서를 지켜야 통과한다.
 *    중복 확인 → 발송(쿨다운) → 검증(123456) → 가입
 */
export const authHandlers = [
  // GET /api/v1/auth/email/check?email=
  http.get('/api/v1/auth/email/check', ({ request }) => {
    const email = new URL(request.url).searchParams.get('email')

    // isDuplicate 는 existsByEmail 결과 그대로다 — true 면 가입할 수 없다
    return ok(
      { isDuplicate: email !== null && findAccount(email) !== undefined },
      '이메일 중복 확인 성공',
      { path: '/api/v1/auth/email/check' },
    )
  }),

  /*
   * POST /api/v1/auth/email/send
   *
   * 서버는 1분 쿨다운을 두고 걸리면 429 를 던진다. 목도 같은 규칙으로 흉내 내야
   * 재발송 버튼이 실제로 막히는지 확인할 수 있다.
   */
  http.post('/api/v1/auth/email/send', async ({ request }) => {
    const { email } = (await request.json()) as { email?: string }
    const path = '/api/v1/auth/email/send'

    if (!email) return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)

    if (isCoolingDown(email)) {
      return fail(429, 'AUTH_002', '잠시 후 다시 시도해주세요.', path)
    }

    startCoolDown(email)
    console.info(`[MSW] ${email} 인증번호: ${MOCK_VERIFICATION_CODE}`)

    return ok(null, '인증번호 발송 성공', { path })
  }),

  /*
   * POST /api/v1/auth/email/verify
   *
   * ⚠️ 실패가 200 + verified:false 가 아니라 **400** 이다.
   *    만료는 AUTH_003, 불일치는 AUTH_004.
   */
  http.post('/api/v1/auth/email/verify', async ({ request }) => {
    const { email, verificationCode } = (await request.json()) as {
      email?: string
      verificationCode?: string
    }
    const path = '/api/v1/auth/email/verify'

    if (!email || !verificationCode) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    if (verificationCode !== MOCK_VERIFICATION_CODE) {
      return fail(400, 'AUTH_004', '인증번호가 일치하지 않습니다', path)
    }

    markVerified(email)
    return ok({ verified: true }, '이메일 인증 성공', { path })
  }),

  /*
   * POST /api/v1/auth/email/verify/reset
   *
   * 가입용과 다른 점 둘.
   *   - 계정이 실제로 있어야 한다. 없는 계정·탈퇴 계정도 **AUTH_003** 으로 온다 —
   *     계정 존재 여부를 숨기려고 인증번호 만료와 같은 코드를 쓴다
   *   - 소셜 계정은 **AUTH_018**. 비밀번호가 없어 재설정할 것이 없다
   */
  http.post('/api/v1/auth/email/verify/reset', async ({ request }) => {
    const { email, verificationCode } = (await request.json()) as {
      email?: string
      verificationCode?: string
    }
    const path = '/api/v1/auth/email/verify/reset'

    if (!email || !verificationCode) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    const account = findAccount(email)

    if (!account) {
      return fail(400, 'AUTH_003', '인증번호가 만료되었거나 존재하지 않습니다.', path)
    }

    // 목에서 소셜 계정은 비밀번호를 빈 문자열로 둔다
    if (!account.password) {
      return fail(
        400,
        'AUTH_018',
        '소셜 로그인으로 가입된 계정입니다. 소셜 로그인으로 시도해주세요.',
        path,
      )
    }

    if (verificationCode !== MOCK_VERIFICATION_CODE) {
      return fail(400, 'AUTH_004', '인증번호가 일치하지 않습니다', path)
    }

    const resetToken = `mock-reset-${String(Date.now())}`
    resetTokenOwner.set(resetToken, email)

    return ok({ verified: true, resetToken }, '이메일 인증번호 검증 성공', { path })
  }),

  /*
   * POST /api/v1/auth/password/reset
   *
   * resetToken 은 **1회용**이다. 서버가 쓰고 나서 지우므로 같은 값으로 두 번 부르면
   * AUTH_011 이다. 목도 쓴 토큰을 기억해 같은 동작을 흉내 낸다.
   *
   * 성공하면 서버가 기존 refreshToken 을 전부 지운다 — 다른 기기도 로그아웃된다.
   */
  http.post('/api/v1/auth/password/reset', async ({ request }) => {
    const { resetToken, newPassword } = (await request.json()) as {
      resetToken?: string
      newPassword?: string
    }
    const path = '/api/v1/auth/password/reset'

    if (!resetToken || !newPassword) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    if (newPassword.length < 8 || newPassword.length > 20) {
      return fail(400, 'COMMON_001', '입력값 중에 기준을 만족하지 않은 입력값이 있습니다.', path)
    }

    const owner = resetTokenOwner.get(resetToken)

    if (!owner || usedResetTokens.has(resetToken)) {
      return fail(
        400,
        'AUTH_011',
        '유효하지 않거나 만료된 요청입니다. 이메일 인증을 다시 진행해주세요.',
        path,
      )
    }

    usedResetTokens.add(resetToken)
    // 실제로 바꿔야 새 비밀번호로 로그인되는지까지 확인할 수 있다
    updatePassword(owner, newPassword)

    // 세션을 끊는 것까지 흉내 낸다. 로그인 중이었다면 새로고침 시 풀린다
    sessionStorage.setItem(SESSION_KEY, 'false')
    sessionStorage.removeItem(SESSION_EMAIL_KEY)

    return ok(null, '비밀번호 변경이 완료되었습니다.', { path })
  }),

  /*
   * POST /api/v1/auth/signup
   *
   * 응답에 토큰이 없다. 서버가 인증 완료 여부를 따로 들고 있다가 확인한다.
   */
  http.post('/api/v1/auth/signup', async ({ request }) => {
    const { email, password, name } = (await request.json()) as {
      email?: string
      password?: string
      name?: string
    }
    const path = '/api/v1/auth/signup'

    if (!email || !password || !name) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    if (findAccount(email)) {
      return fail(409, 'AUTH_005', '이미 사용 중인 이메일입니다.', path)
    }

    if (!isVerified(email)) {
      return fail(400, 'AUTH_006', '이메일 인증이 완료되지 않았습니다.', path)
    }

    // 가입한 계정으로 바로 로그인할 수 있어야 흐름이 이어진다
    addAccount(email, password, name)

    clearVerified(email)
    return ok(null, '회원가입 성공', { path })
  }),

  // POST /api/v1/auth/login
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as LoginRequest

    const account = findAccount(email)

    /*
     * 어느 쪽이 틀렸는지 알려주지 않는다. 서버도 없는 계정·비밀번호 불일치·소셜 계정
     * (password null)을 전부 AUTH_009 하나로 뭉친다. 목에서 소셜은 password 가 빈 문자열이라
     * `!account.password` 로 걸린다.
     */
    if (!account || !account.password || account.password !== password) {
      return fail(
        401,
        'AUTH_009',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        '/api/v1/auth/login',
      )
    }

    sessionStorage.setItem(SESSION_KEY, 'true')
    sessionStorage.setItem(SESSION_EMAIL_KEY, email)

    /*
     * refreshToken 은 바디에 넣지 않는다 — 실제로는 httpOnly 쿠키다.
     * accessToken 은 세션 복구 폴백(`shared/lib/accessToken.ts`)이 디코드할 수 있게
     * 진짜 JWT 모양으로 만든다. 서명은 아무 값이나 넣는다. 검증은 서버 몫이다.
     */
    return ok(
      {
        accessToken: createMockAccessToken(account.user),
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: account.user,
      },
      '로그인 성공',
      { path: '/api/v1/auth/login' },
    )
  }),

  // POST /api/v1/auth/refresh
  http.post('/api/v1/auth/refresh', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return fail(401, 'AUTH_008', '만료된 토큰입니다.', '/api/v1/auth/refresh')
    }

    // 실제 응답에는 expiresIn 이 없다. 목도 맞춰둔다
    return ok({ accessToken: createMockAccessToken(user) }, '액세스 토큰 재발급 성공', {
      path: '/api/v1/auth/refresh',
    })
  }),

  // GET /api/v1/user/me — 백엔드 미구현이라 목이 유일한 구현이다
  http.get('/api/v1/user/me', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', '/api/v1/user/me')
    }

    return ok(user, '내 정보 조회 성공', { path: '/api/v1/user/me' })
  }),

  // POST /api/v1/auth/oauth/:provider
  http.post('/api/v1/auth/oauth/:provider', async ({ request, params }) => {
    const { code } = (await request.json()) as { code?: string }
    const path = `/api/v1/auth/oauth/${String(params.provider)}`

    if (params.provider !== 'google') {
      return fail(400, 'AUTH_012', '지원하지 않는 소셜 로그인입니다.', path)
    }

    if (!code) {
      return fail(400, 'AUTH_013', '소셜 로그인 인증에 실패했습니다.', path)
    }

    /*
     * 목은 code 를 검증할 수 없다. 항상 사업자 계정으로 로그인시킨다.
     * 최초 가입 분기(`isNewUser`)를 보려면 code 에 'new' 를 넣어 호출한다 —
     * 실제로는 서버가 정한다.
     */
    const user = ENTREPRENEUR_USER
    sessionStorage.setItem(SESSION_KEY, 'true')
    sessionStorage.setItem(SESSION_EMAIL_KEY, user.email)

    return ok(
      {
        accessToken: createMockAccessToken(user),
        tokenType: 'Bearer',
        expiresIn: 1800,
        user,
        ...(code.includes('new') ? { isNewUser: true } : {}),
      },
      '소셜 로그인 성공',
      { path },
    )
  }),

  /*
   * POST /api/v1/auth/social/:provider — 로컬 → 소셜 전환. 인증 필요.
   *
   * 되돌릴 수 없다. 서버가 provider 를 GOOGLE 로 바꾸고 password 를 지워서
   * 이후로는 구글로만 들어올 수 있다.
   */
  http.post('/api/v1/auth/social/:provider', async ({ request, params }) => {
    const path = `/api/v1/auth/social/${String(params.provider)}`
    const user = hasSession() ? currentUser() : null

    if (!user) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    if (params.provider !== 'google') {
      return fail(400, 'AUTH_012', '지원하지 않는 소셜 로그인입니다.', path)
    }

    const { code } = (await request.json()) as { code?: string }
    if (!code) return fail(400, 'AUTH_013', '소셜 로그인 인증에 실패했습니다.', path)

    /*
     * 서버는 구글 이메일이 계정 이메일과 같을 때만 전환한다. 목은 구글에 물어볼 수
     * 없으니 code 에 'mismatch' 가 들어오면 그 케이스로 친다 — 화면 확인용이다.
     */
    if (code.includes('mismatch')) {
      return fail(400, 'AUTH_016', '계정 이메일과 일치하는 구글 계정만 연결할 수 있습니다.', path)
    }

    return ok(
      { userId: user.userId, email: user.email, provider: 'GOOGLE' },
      '소셜 계정 연결이 완료되었습니다.',
      { path },
    )
  }),

  // POST /api/v1/auth/logout
  http.post('/api/v1/auth/logout', () => {
    sessionStorage.setItem(SESSION_KEY, 'false')
    sessionStorage.removeItem(SESSION_EMAIL_KEY)

    // 백엔드는 204 가 아니라 200 + `data: null` 로 응답한다
    return ok(null, '로그아웃 성공', { path: '/api/v1/auth/logout' })
  }),
]
