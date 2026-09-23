import type { MydataLinkResult } from '@/features/mydata/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 수집과 자격 판정이 한 요청 안에서 끝난다. 백엔드 기준 15~40초라 전역 timeout(10초)으로는
 * 매번 끊긴다.
 *
 * ⚠️ 끊겨도 서버는 끝까지 돈다. 판정 1회에 GMS 크레딧이 약 100 나가므로 "실패로 보이는데
 *    실제로는 진행 중" 상태에서 사용자가 다시 누르면 비용이 두 배다. 그래서 넉넉하게 잡는다.
 *
 * ⚠️ 배포 환경은 이 값만으로 안 끝난다. nginx 기본 `proxy_read_timeout` 이 60초라
 *    판정이 늦어지면 504 다 — `/api/v1/mydata/` 경로에 따로 걸어야 한다.
 */
const JOB_TIMEOUT_MS = 180_000

export async function linkMydata() {
  const { data } = await api.post<MydataLinkResult>(endpoints.mydata.link, null, {
    timeout: JOB_TIMEOUT_MS,
  })
  return data
}

export async function refreshMydata() {
  const { data } = await api.post<MydataLinkResult>(endpoints.mydata.refresh, null, {
    timeout: JOB_TIMEOUT_MS,
  })
  return data
}
