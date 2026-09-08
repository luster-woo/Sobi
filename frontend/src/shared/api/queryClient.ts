import { QueryClient } from '@tanstack/react-query'

import { getErrorStatus } from '@/shared/api/errors'

/**
 * 재조회 없이 캐시를 그대로 쓰는 시간.
 *
 * 지원사업·대출 상품은 서버 배치가 채우는 데이터라 초 단위로 신선할 필요가 없다.
 * 기본값 0 이면 컴포넌트가 마운트될 때마다 요청이 나가서, 탭을 옮겨 다닐 때마다
 * 같은 목록을 다시 불러온다.
 *
 * 신청 현황처럼 즉시성이 필요한 쿼리는 개별 훅에서 `staleTime: 0` 으로 덮는다.
 */
const STALE_TIME_MS = 60_000

/** 화면에서 사라진 쿼리를 캐시에 남겨두는 시간. 뒤로가기로 돌아왔을 때 즉시 보여주려고 둔다 */
const GC_TIME_MS = 5 * 60_000

const MAX_RETRY = 2

/**
 * 4xx 는 재시도하지 않는다.
 *
 * 잘못된 요청·권한 없음·없는 리소스는 같은 요청을 다시 보내도 결과가 같다.
 * 기본값(3회)이면 실패가 확실한 요청에 지수 백오프까지 붙어 화면이 몇 초 멈춘다.
 *
 * 401 은 axios 인터셉터(`shared/api/client.ts`)가 이미 재발급으로 한 번 살려보고
 * 그래도 실패해서 넘어온 것이라, 여기서 또 재시도할 이유가 없다.
 */
function shouldRetry(failureCount: number, error: Error): boolean {
  const status = getErrorStatus(error)

  if (status !== undefined && status >= 400 && status < 500) return false

  return failureCount < MAX_RETRY
}

/**
 * 앱 전역 QueryClient.
 *
 * 서버 에러 토스트는 여기서 처리하지 않는다. axios 응답 인터셉터가 5xx·네트워크
 * 오류를 이미 띄우고 있어서, QueryCache 콜백을 또 걸면 토스트가 두 개 뜬다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MS,
      retry: shouldRetry,
    },
    mutations: {
      // 생성·수정 요청을 자동 재시도하면 중복 신청이 생길 수 있다
      retry: 0,
    },
  },
})
