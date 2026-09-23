/**
 * 갱신 쿨다운을 프론트에서도 들고 있는다.
 *
 * 서버는 `business_info` 의 마지막 판정 시각을 기준으로 막는데(`ensureCooldownPassed`),
 * 그 시각도 남은 시간도 응답에 실어주지 않는다. 429 를 받고 나서야 알 수 있다는 뜻이다.
 * 그러면 사용자는 눌러봐야만 "아직 안 된다" 를 알게 되고, 수십 초 기다릴 각오로 누른
 * 버튼이 즉시 거절당한다.
 *
 * 그래서 연동·갱신에 성공한 시각을 브라우저에 적어두고 버튼을 미리 잠근다.
 *
 * ⚠️ **판정 기준은 어디까지나 서버다.** 여기 기록은 탭 하나에만 있어서, 다른 기기에서
 *    갱신했거나 탭을 닫았다 열면 비어 있다. 그때는 버튼이 열려 있고 429 로 막힌다 —
 *    쿨다운 검사는 수집을 시작하기 전에 도므로 그 호출은 크레딧을 쓰지 않는다.
 *
 * localStorage 가 아니라 sessionStorage 인 이유는 ESLint 규칙(`no-restricted-globals`)이다.
 * 24시간짜리를 탭 수명에 묶는 셈이라 놓치는 경우가 생기지만, 놓쳐도 429 한 번으로 끝나는
 * 화면 힌트라 규칙을 뚫을 만한 값이 아니다.
 */

/** 백엔드 `mydata.refresh-cooldown` 기본값 `24h` 와 같다 */
const DEFAULT_COOLDOWN_MINUTES = 1440

/**
 * 갱신 쿨다운.
 *
 * 백엔드가 `MYDATA_REFRESH_COOLDOWN` 환경변수로 받으므로(`application.yaml`) 이쪽도
 * 환경변수로 연다. **두 값은 같이 바꿔야 한다** — 서버만 낮추면 서버는 받아주는데
 * 버튼이 잠긴 채고, 프론트만 낮추면 열린 버튼이 429 로 떨어진다.
 */
export const REFRESH_COOLDOWN_MS =
  (Number(import.meta.env.VITE_MYDATA_REFRESH_COOLDOWN_MINUTES) || DEFAULT_COOLDOWN_MINUTES) *
  60 *
  1000

const KEY_PREFIX = 'mydata:judgedAt:'

/** 계정마다 따로 적는다. 한 브라우저에서 계정을 바꿔 들어오면 남의 기록에 걸린다 */
function keyOf(userId: number) {
  return `${KEY_PREFIX}${userId}`
}

/** 시크릿 창·저장소 차단 환경에서는 접근 자체가 던진다. 못 적어도 서버가 막으므로 삼킨다 */
export function markJudged(userId: number | undefined) {
  if (userId === undefined) return

  try {
    sessionStorage.setItem(keyOf(userId), String(Date.now()))
  } catch {
    /* empty */
  }
}

/** 다시 갱신할 수 있게 되는 시각(ms). 기록이 없으면 null */
export function readAvailableAt(userId: number | undefined): number | null {
  if (userId === undefined) return null

  try {
    const judgedAt = Number(sessionStorage.getItem(keyOf(userId)))
    return judgedAt > 0 ? judgedAt + REFRESH_COOLDOWN_MS : null
  } catch {
    return null
  }
}

/**
 * 남은 시간을 문구로. 쿨다운이 지났거나 기록이 없으면 null 이다.
 *
 * 분 단위는 올림한다 — '0분 뒤' 라고 해놓고 막혀 있으면 고장으로 보인다.
 */
export function formatRemaining(availableAt: number | null, now = Date.now()): string | null {
  if (availableAt === null) return null

  const remaining = availableAt - now
  if (remaining <= 0) return null

  const hours = Math.floor(remaining / 3_600_000)
  if (hours >= 1) return `약 ${hours}시간 뒤`

  return `약 ${Math.ceil(remaining / 60_000)}분 뒤`
}
