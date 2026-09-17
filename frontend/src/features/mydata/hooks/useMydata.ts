import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'

import { linkMydata, refreshMydata } from '@/features/mydata/api/mydata'
import {
  formatRemaining,
  markJudged,
  readAvailableAt,
  REFRESH_COOLDOWN_MS,
} from '@/features/mydata/model/cooldown'
import type { MydataLinkResult } from '@/features/mydata/model/types'
import { ERROR_CODE, getErrorCode, getErrorStatus } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'

/**
 * 연동·갱신이 끝나면 낡는 것들.
 *
 * 수집으로 계좌·대출 잔액이 다시 채워지고, 자격 판정이 다시 저장되면서 대출·지원사업
 * 목록의 상태 배지와 의무보험 진단이 함께 바뀐다.
 *
 * 신청(`application`)은 뺐다. 신청 건의 진행 상태는 판정 결과와 별개로 움직인다.
 */
function invalidateAfterMydata(queryClient: QueryClient) {
  const stale = [
    queryKeys.account.all,
    queryKeys.repayment.all,
    queryKeys.loan.all,
    queryKeys.supportProgram.all,
    queryKeys.insurance.all,
  ]

  stale.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
}

/**
 * 실패 안내.
 *
 * 5xx·네트워크 오류는 axios 인터셉터가 이미 토스트를 띄운다. 여기서 또 띄우면 두 개가 뜬다.
 * 타임아웃도 `status === undefined` 라 인터셉터가 받는다.
 */
function toFailureMessage(error: unknown): string | null {
  const status = getErrorStatus(error)
  if (status === undefined || status >= 500) return null

  if (getErrorCode(error) === ERROR_CODE.MYDATA_REFRESH_COOLDOWN) {
    return '방금 갱신했어요. 하루에 한 번만 다시 불러올 수 있습니다.'
  }

  if (getErrorCode(error) === ERROR_CODE.MYDATA_NOT_FOUND) {
    return '사업자 인증을 먼저 마쳐야 연동할 수 있어요.'
  }

  return '마이데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'
}

/**
 * 최초 연동 (`POST /mydata/link`).
 *
 * 동의 화면에서 쏘고 수집 화면이 결과를 기다린다. 화면이 갈려 있어 `mutationKey` 를
 * 붙여두고, 결과 요약은 판정 화면이 쓰도록 캐시에 얹는다.
 */
export function useMydataLink() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.userId)

  return useMutation({
    mutationKey: queryKeys.mydata.link,
    mutationFn: linkMydata,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.mydata.link, result)
      // 서버 쿨다운은 '마지막 판정 시각' 기준이라 최초 연동도 시계를 돌린다
      markJudged(userId)
      invalidateAfterMydata(queryClient)
    },
  })
}

/**
 * 동의 화면이 쏜 연동의 현재 상태. 수집 화면이 읽는다.
 *
 * `undefined` 는 이 화면을 직접 열었거나 새로고침해서 뮤테이션이 사라진 경우다.
 * 그때는 막지 않는다 — 서버 쪽 수집은 계속 돌고 있을 수 있는데, 다시 쏘게 하면
 * 판정이 한 번 더 돈다.
 */
export function useMydataLinkState() {
  const states = useMutationState({
    filters: { mutationKey: queryKeys.mydata.link },
    select: (mutation) => mutation.state.status,
  })

  return states.at(-1)
}

/** 판정 화면이 쓰는 연동 결과 요약. 아직 없으면 undefined */
export function useMydataLinkResult() {
  const queryClient = useQueryClient()
  return queryClient.getQueryData<MydataLinkResult>(queryKeys.mydata.link)
}

export interface MydataRefresh {
  refresh: () => void
  isPending: boolean
  /** 쿨다운이 남아 있으면 '약 6시간 뒤' 같은 문구, 눌러도 되면 null */
  remaining: string | null
}

/**
 * 수동 갱신 (`POST /mydata/refresh`).
 *
 * 최초 연동과 같은 일을 하되 서버에 쿨다운이 걸려 있다(기본 24시간). 서버가 남은 시간을
 * 알려주지 않아 프론트도 같은 시각을 적어두고 버튼을 미리 잠근다 — `model/cooldown.ts`.
 *
 * 남은 시간은 마운트 시점에 한 번만 계산한다. 24시간짜리를 초 단위로 세어봐야 화면에
 * 보이는 문구가 바뀌지 않는다.
 */
export function useMydataRefresh(): MydataRefresh {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)
  const userId = useAuthStore((state) => state.user?.userId)

  const [availableAt, setAvailableAt] = useState(() => readAvailableAt(userId))

  const mutation = useMutation({
    mutationFn: refreshMydata,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.mydata.link, result)
      markJudged(userId)
      setAvailableAt(Date.now() + REFRESH_COOLDOWN_MS)
      invalidateAfterMydata(queryClient)
      showToast('최신 금융 정보로 갱신했어요.')
    },
    onError: (error) => {
      const message = toFailureMessage(error)
      if (message) showToast(message, 'danger')
    },
  })

  return {
    refresh: () => mutation.mutate(),
    isPending: mutation.isPending,
    remaining: formatRemaining(availableAt),
  }
}
