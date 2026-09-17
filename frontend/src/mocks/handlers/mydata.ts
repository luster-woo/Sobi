import { delay, http } from 'msw'

import { REFRESH_COOLDOWN_MS } from '@/features/mydata/model/cooldown'
import type { MydataLinkResult } from '@/features/mydata/model/types'
import { fail, ok } from '@/mocks/lib/envelope'

/**
 * 마이데이터 목 (S15P21D101-374)
 *
 * 실제 호출은 15~40초 걸리지만 목은 짧게 끊는다. 화면 확인용이라 그 시간을 그대로
 * 흉내 내면 확인 한 번에 40초씩 걸린다. 대신 즉시 응답하지는 않는다 — 수집 화면이
 * 진행률을 그리는 구간이 있어야 하고, `link` 가 비동기라는 것을 화면이 잊으면 안 된다.
 */
const JOB_MS = 2500

/**
 * 쿨다운은 화면과 같은 값을 쓴다. 목만 짧게 두면 버튼은 잠겼는데 서버는 받아주는,
 * 실제로는 일어나지 않는 조합이 된다. 짧게 확인하려면 두 쪽이 같이 보는
 * `VITE_MYDATA_REFRESH_COOLDOWN_MINUTES` 를 낮춘다.
 */
const COOLDOWN_KEY = 'mock:mydata:lastJudgedAt'

const RESULT: MydataLinkResult = {
  totalCount: 20,
  eligibleCount: 11,
  unknownCount: 3,
  ineligibleCount: 6,
}

/**
 * 실패 흐름 스위치. 콘솔에서 켜고 끈다.
 *
 *   sessionStorage.setItem('mock:mydata:fail', '1')   // 수집 화면의 실패 화면 보기
 *   sessionStorage.removeItem('mock:mydata:fail')
 *
 * 성공만 돌려주면 수집 화면의 '다시 시도' 를 확인할 방법이 핸들러를 고치는 것뿐이다.
 * 실패 경로를 못 보고 넘어가면 실서버에서 처음 보게 된다.
 */
const FAIL_KEY = 'mock:mydata:fail'

function shouldFail() {
  return sessionStorage.getItem(FAIL_KEY) === '1'
}

function markJudged() {
  sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()))
}

function isCoolingDown() {
  const last = Number(sessionStorage.getItem(COOLDOWN_KEY) ?? 0)
  return Date.now() - last < REFRESH_COOLDOWN_MS
}

export const mydataHandlers = [
  http.post('/api/v1/mydata/link', async () => {
    const path = '/api/v1/mydata/link'

    await delay(JOB_MS)

    if (shouldFail()) {
      return fail(500, 'COMMON_002', '서버 내부 오류가 발생했습니다.', path)
    }

    markJudged()

    return ok(RESULT, '마이데이터 연동과 자격 판정을 완료했습니다.', { path })
  }),

  http.post('/api/v1/mydata/refresh', async () => {
    const path = '/api/v1/mydata/refresh'

    // 쿨다운은 대기 전에 판정한다. 서버도 수집을 시작하기 전에 막는다
    if (isCoolingDown()) {
      return fail(429, 'MYDATA_002', '마이데이터를 다시 불러오기까지 시간이 남았습니다.', path)
    }

    await delay(JOB_MS)

    if (shouldFail()) {
      return fail(500, 'COMMON_002', '서버 내부 오류가 발생했습니다.', path)
    }

    markJudged()

    return ok(RESULT, '마이데이터 갱신과 자격 재판정을 완료했습니다.', { path })
  }),
]
