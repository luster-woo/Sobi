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

/** 실제 로그인 응답(`LoginResponse.UserInfo`)이 주는 것과 같은 필드다 */
const ENTREPRENEUR_USER: SessionUser = {
  userId: 1,
  email: 'owner@sogong.com',
  name: '김소상',
  role: USER_ROLE.ENTREPRENEUR,
  birthDate: '1988-04-12',
}

const PREENTREPRENEUR_USER: SessionUser = {
  userId: 2,
  email: 'pre@sogong.com',
  name: '박예비',
  role: USER_ROLE.PREENTREPRENEUR,
  birthDate: '1995-11-03',
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

/**
 * 구글로 들어오는 계정. 목은 code 를 검증할 수 없어 구글 사용자를 하나로 고정한다.
 *
 * 온보딩을 처음부터 다시 보려면 콘솔에서 이 계정을 지운다:
 *   sessionStorage.removeItem('msw:accounts')
 */
const GOOGLE_EMAIL = 'google@sogong.com'

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
function addAccount(email: string, password: string, name: string, birthDate: string) {
  const accounts = loadAccounts()

  accounts[email] = {
    password,
    user: { userId: Date.now(), email, name, role: USER_ROLE.PREENTREPRENEUR, birthDate },
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

/* ---------- 내 정보 조회 (S15P21D101-377) ---------- */

/** 알림 수신 여부. ERD 기본값이 true 라 기록이 없으면 켜진 것으로 본다 */
const NOTIFICATION_KEY = 'msw:notification:'

function isNotificationOn(email: string) {
  return sessionStorage.getItem(NOTIFICATION_KEY + email) !== 'false'
}

/** 서버처럼 현재 값을 뒤집고 바뀐 값을 돌려준다 */
function flipNotification(email: string) {
  const next = !isNotificationOn(email)
  sessionStorage.setItem(NOTIFICATION_KEY + email, String(next))
  return next
}

const DAY_MS = 86_400_000

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 19)
}

/**
 * 사업자 계정이 보는 값. 백엔드 `MyPageResponse` 와 같은 모양이다.
 *
 * ⚠️ `myData` · `accountSummary` 는 **null 이 아니다.** 연동 전인지는 `linked` 와
 *    0 으로 표현한다 — 서버가 그렇게 준다. 목이 null 을 주면 화면의 분기가 실서버에서
 *    다르게 돈다.
 */
const OWNER_EXTRA = {
  business: {
    businessName: '한상차림',
    brn: '123-45-67890',
    ownerName: '김소상',
    industryName: '한식음식점',
    address: '대구광역시 북구 산격동 1287-1',
    openDate: '2023-04-10',
  },
  myData: { linked: true, updatedAt: daysAgo(1) },
  accountSummary: {
    totalBalance: 21_700_000,
    totalLoanBalance: 55_200_000,
    accountCount: 5,
    institutionCount: 2,
  },
  payoutAccount: { bankName: '대구은행', accountNo: '0324003842123412' },
}

/**
 * 예비창업자.
 *
 * 사업자등록이 없으면 마이데이터를 연동할 근거가 없고, 연동이 없으면 계좌도 없다.
 * '연동 전' 이 아니라 '연동할 수 없음' 이다.
 */
const PRE_OWNER_EXTRA = {
  business: null,
  myData: { linked: false, updatedAt: null },
  accountSummary: {
    totalBalance: 0,
    totalLoanBalance: 0,
    accountCount: 0,
    institutionCount: 0,
  },
  payoutAccount: null,
}

/**
 * 소셜로 전환된 계정. `POST /auth/social/google` 이 여기 적는다.
 *
 * 서버는 `users.provider` 를 GOOGLE 로 바꾸고 password 를 지운다. 목도 저장해야
 * 새로고침 후에도 '연결됨' 이 유지되는지 확인할 수 있다 — 응답만 돌려주면 화면이
 * 잠깐 바뀌었다가 조회 한 번에 되돌아간다.
 */
const SOCIAL_KEY = 'msw:social:'

function markSocialLinked(email: string) {
  sessionStorage.setItem(SOCIAL_KEY + email, 'GOOGLE')
}

/** 목 계정의 가입 경로. 구글로 가입했거나 전환한 계정이 GOOGLE 이다 */
function providerOf(email: string) {
  if (email === GOOGLE_EMAIL) return 'GOOGLE'
  return sessionStorage.getItem(SOCIAL_KEY + email) === 'GOOGLE' ? 'GOOGLE' : 'LOCAL'
}

/**
 * `GET /user/me` 응답. 백엔드 `UserMeResponse` 와 1:1 이다.
 *
 * ⚠️ **가볍다.** 여섯 필드뿐이고 사업자 정보·계좌는 없다. 그쪽은 `/user/mypage` 가
 *    맡는다 — 이 엔드포인트는 앱 진입마다 불려서 무겁게 만들 수 없다.
 */
function meResponse(user: SessionUser) {
  return { ...user, provider: providerOf(user.email) }
}

/** `GET /user/mypage` 응답. 백엔드 `MyPageResponse` 와 1:1 이다 */
function myPageResponse(user: SessionUser) {
  const extra = user.role === USER_ROLE.ENTREPRENEUR ? OWNER_EXTRA : PRE_OWNER_EXTRA

  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    birthDate: user.birthDate,
    role: user.role,
    provider: providerOf(user.email),
    notification: isNotificationOn(user.email),
    ...extra,
  }
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

export function currentMockRole() {
  return currentUser()?.role ?? null
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
 *    - `PATCH /user/profile` 만 백엔드에 없다. 나머지(`GET /user/me` · `GET /user/mypage` ·
 *      `DELETE /user/me` · `PATCH /user/password` · `PATCH /user/notification`)는 전부
 *      구현돼 있어서 실서버가 뜨면 목이 비켜선다
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
    const { email, password, name, birthDate } = (await request.json()) as {
      email?: string
      password?: string
      name?: string
      birthDate?: string
    }
    const path = '/api/v1/auth/signup'

    if (!email || !password || !name || !birthDate) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    /*
     * 백엔드 `@Past` 를 흉내 낸다. 오늘·미래 생년월일은 400 이다.
     *
     * 목에서 이걸 빼면 화면 검증이 느슨해져도 목에서는 통과해서, 실서버로 바꾼 뒤에야
     * 가입이 안 되는 것을 알게 된다.
     */
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!(new Date(`${birthDate}T00:00:00`) < today)) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    if (findAccount(email)) {
      return fail(409, 'AUTH_005', '이미 사용 중인 이메일입니다.', path)
    }

    if (!isVerified(email)) {
      return fail(400, 'AUTH_006', '이메일 인증이 완료되지 않았습니다.', path)
    }

    // 가입한 계정으로 바로 로그인할 수 있어야 흐름이 이어진다
    addAccount(email, password, name, birthDate)

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

  /*
   * GET /api/v1/user/me — 백엔드에 구현돼 있다(S15P21D101-262). 실서버가 뜨면 목이 비켜선다.
   *
   * 세션 복구(`useSession`)가 쓰는 가벼운 조회다. 사업자 정보·계좌는 아래 `/user/mypage` 다.
   */
  http.get('/api/v1/user/me', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', '/api/v1/user/me')
    }

    return ok(meResponse(user), '내 정보 조회에 성공했습니다.', { path: '/api/v1/user/me' })
  }),

  /*
   * GET /api/v1/user/mypage — 백엔드에 구현돼 있다. 실서버가 뜨면 목이 비켜선다.
   *
   * 실서버는 잔액을 금융망에서 실시간으로 받아와 1~2초 더 걸린다. 목은 바로 답한다.
   */
  http.get('/api/v1/user/mypage', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', '/api/v1/user/mypage')
    }

    return ok(myPageResponse(user), '마이페이지 조회에 성공했습니다.', {
      path: '/api/v1/user/mypage',
    })
  }),

  /*
   * PATCH /api/v1/user/notification
   *
   * ⚠️ 본문이 없다. 켤지 끌지를 받는 것이 아니라 **서버가 현재 값을 뒤집는다**
   *    (`UserServiceImpl.toggleNotification`). 목도 그래야 화면이 낙관적 갱신을
   *    잘못 짰을 때 여기서 드러난다.
   */
  http.patch('/api/v1/user/notification', () => {
    const path = '/api/v1/user/notification'
    const email = sessionStorage.getItem(SESSION_EMAIL_KEY)

    if (!hasSession() || !email) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', path)
    }

    return ok({ notification: flipNotification(email) }, '알림 설정 변경 완료', { path })
  }),

  /*
   * PATCH /api/v1/user/password
   *
   * ⚠️ body 가 `{ password }` 하나다. **현재 비밀번호를 받지 않는다** —
   *    백엔드 `PasswordChangeReqeust` 가 그렇다. 목도 똑같이 안 받아야 화면이
   *    잘못 보내는 것을 실서버로 바꾸기 전에 알 수 있다.
   *
   * 바꾼 값을 실제로 저장한다. 그래야 로그아웃 후 새 비밀번호로 다시 들어가 보는
   * 확인까지 목에서 된다.
   */
  http.patch('/api/v1/user/password', async ({ request }) => {
    const path = '/api/v1/user/password'
    const { password } = (await request.json()) as { password?: string }

    const email = sessionStorage.getItem(SESSION_EMAIL_KEY)
    if (!hasSession() || !email) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', path)
    }

    // 백엔드 @Size(min = 8, max = 20)
    if (!password || password.length < 8 || password.length > 20) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    updatePassword(email, password)

    return ok(null, '비밀번호 변경 완료', { path })
  }),

  /*
   * PATCH /api/v1/user/profile
   *
   * 구글 가입자가 로그인 직후 이름·생년월일을 채우는 자리다. 저장된 값을 되돌려 준다.
   *
   * ⚠️ 백엔드에는 아직 생년월일만 받는 `/user/birth-date` 뿐이라, 이 경로는 목이 유일한
   *    구현이다 — `lib/serverFirst.ts` 의 `MOCK_ONLY` 에 올려서 실서버를 안 물어본다.
   *    백엔드가 만들면 그 목록에서 빼야 한다.
   *
   * ⚠️ `@NotBlank`·`@Past` 를 흉내 낸다. 목에서 느슨하게 두면 화면 검증이 새도 여기서는
   *    통과해서, 실서버로 바꾼 뒤에야 저장이 안 되는 것을 알게 된다.
   */
  http.patch('/api/v1/user/profile', async ({ request }) => {
    const path = '/api/v1/user/profile'
    const { name, birthDate } = (await request.json()) as { name?: string; birthDate?: string }

    const email = sessionStorage.getItem(SESSION_EMAIL_KEY)
    if (!hasSession() || !email) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', path)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nameOk = Boolean(name?.trim()) && (name?.length ?? 0) <= 100
    const birthOk = Boolean(birthDate) && new Date(`${birthDate}T00:00:00`) < today

    if (!nameOk || !birthOk) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    /*
     * 실제로 계정에 저장한다. 그래야 로그아웃 후 같은 구글 계정으로 다시 들어왔을 때
     * 창이 **안 뜨는** 것까지 목에서 확인된다 — 판단 기준이 `birthDate === null` 이라
     * 저장이 안 되면 매번 다시 묻는 것처럼 보인다.
     */
    const saved = { name: name!.trim(), birthDate: birthDate! }

    const accounts = loadAccounts()
    const account = accounts[email]
    if (account) {
      accounts[email] = { ...account, user: { ...account.user, ...saved } }
      sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
    }

    return ok(saved, '프로필이 저장되었습니다.', { path })
  }),

  /*
   * DELETE /api/v1/user/me
   *
   * ⚠️ 경로가 `GET /user/me` 와 같고 메서드만 다르다. 명세에는 POST 로 적혀 있는데
   *    `UserController` 구현이 DELETE 라 구현을 따랐다.
   *
   * 실제로 계정을 지운다. 탈퇴한 이메일로 다시 로그인하면 실패해야 흐름이 맞고,
   * 같은 주소로 재가입해 보는 것도 목에서 확인된다 (서버는 deleted_at 을 채울 뿐이라
   * 재가입 가능 여부가 다를 수 있다 — 거기까지는 흉내 내지 않는다).
   */
  http.delete('/api/v1/user/me', () => {
    const path = '/api/v1/user/me'
    const email = sessionStorage.getItem(SESSION_EMAIL_KEY)

    if (!hasSession() || !email) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', path)
    }

    const accounts = loadAccounts()
    delete accounts[email]
    sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))

    // 서버도 refreshToken 을 지운다. 목에서는 세션 플래그를 치우는 것이 그 자리다
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_EMAIL_KEY)

    return ok(null, '회원 탈퇴 완료', { path })
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
     * 목은 code 를 검증할 수 없어 구글이 누구인지 알 수 없다. 그래서 구글 계정을
     * 하나로 고정하고, 그 계정을 처음 보는지로 `isNewUser` 를 가른다 —
     * 실제 백엔드도 `findByEmail` 이 비면 새로 만들고 `isNewUser: true` 를 준다.
     *
     * ⚠️ role 은 **null** 이다. 백엔드 `loginWithGoogle` 이 새 유저를 만들 때
     *    `.role(...)` 을 넣지 않아 구글 가입자만 null 로 시작한다. 이 값이어야
     *    온보딩(`/verify`)으로 가는 분기를 목에서도 볼 수 있다.
     */
    const existing = findAccount(GOOGLE_EMAIL)

    const user: SessionUser = existing?.user ?? {
      userId: 3,
      email: GOOGLE_EMAIL,
      name: '구글가입',
      role: null,
      /*
       * ⚠️ **null 이 맞다.** 구글이 생일을 주지 않아 소셜 가입은 비어 있다
       *    (V23 마이그레이션 주석). 이 값이어야 로그인 직후 생년월일 창이 뜨는 흐름을
       *    목에서도 볼 수 있다 — 채워 넣으면 그 화면을 영영 못 본다.
       */
      birthDate: null,
    }

    if (!existing) {
      // 비밀번호는 빈 문자열이다 — 소셜 계정이라 이메일 로그인이 막혀야 한다
      const accounts = loadAccounts()
      accounts[GOOGLE_EMAIL] = { password: '', user }
      sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
    }

    sessionStorage.setItem(SESSION_KEY, 'true')
    sessionStorage.setItem(SESSION_EMAIL_KEY, user.email)

    return ok(
      {
        accessToken: createMockAccessToken(user),
        tokenType: 'Bearer',
        expiresIn: 1800,
        user,
        // 실제 응답도 기존 유저에게는 null 을 준다
        isNewUser: existing ? null : true,
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

    // 실제로 바꿔 둔다. 새로고침해도 '연결됨' 이 유지되는지까지 목에서 확인된다
    markSocialLinked(user.email)

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
