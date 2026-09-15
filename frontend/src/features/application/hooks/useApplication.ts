import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelApplication,
  createApplication,
  getApplicationDetail,
  getApplications,
  requestDraft,
  submitApplication,
  uploadDocument,
} from '@/features/application/api/application'
import { hasValidating } from '@/features/application/model/documents'
import type { ApplicationDetail } from '@/features/application/model/types'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * 검증이 도는 동안 다시 물어보는 주기.
 *
 * 서버가 몇 초 걸리는지 아직 못 받았다. 2초는 화면이 멈춘 것처럼 보이지 않으면서
 * 요청이 과하지도 않은 값이고, 실제 소요 시간을 받으면 여기만 고치면 된다.
 */
const POLL_INTERVAL_MS = 2_000

/**
 * 신청 상세.
 *
 * 검증 중인 서류가 하나라도 있으면 폴링하고, 다 끝나면 스스로 멈춘다. 사용자가
 * 화면을 열어 둔 채 기다리는 동안 '검증 중' 이 '검증 통과' 로 바뀌어야 하는데,
 * 서버가 알려줄 방법이 없어서 이쪽에서 물어본다.
 */
export function useApplicationDetail(applicationId?: number) {
  return useQuery({
    queryKey: queryKeys.application.detail(applicationId ?? 0),
    queryFn: () => {
      if (!applicationId) throw new Error('applicationId 없이 신청 상세를 호출했다')
      return getApplicationDetail(applicationId)
    },
    enabled: Boolean(applicationId),
    refetchInterval: (query) => {
      const data = query.state.data as ApplicationDetail | undefined
      if (!data) return false
      return hasValidating(data.documents) ? POLL_INTERVAL_MS : false
    },
  })
}

/**
 * 신청 시작.
 *
 * 상품 상세 모달의 '신청하기' 가 부른다. 서버가 이미 준비중인 건을 가지고 있으면
 * 새로 만들지 않고 그걸 돌려주므로, 사용자가 두 번 눌러도 신청이 겹치지 않는다.
 */
export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createApplication,
    onSuccess: (data) => {
      // 방금 받은 상세를 캐시에 심어 두면 신청 화면이 로딩 없이 바로 그려진다
      queryClient.setQueryData(queryKeys.application.detail(data.applicationId), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list })
    },
  })
}

/**
 * 신청 취소.
 *
 * 신청 건과 올린 서류가 서버에서 삭제된다. 되돌릴 수 없으므로 부르는 쪽에서
 * 반드시 확인을 받아야 한다. 삭제된 건을 다시 조회하면 404 라서 무효화가 아니라
 * 캐시에서 지운다.
 */
export function useCancelApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: number) => cancelApplication(applicationId),
    onSuccess: (_data, applicationId) => {
      queryClient.removeQueries({ queryKey: queryKeys.application.detail(applicationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list })
    },
  })
}

/** 최종 신청. 성공하면 status 가 바뀌므로 상세를 다시 받는다 */
export function useSubmitApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitApplication,
    onSuccess: (_data, body) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.application.detail(body.applicationId),
      })
      // 상태가 SUBMITTED 로 바뀜으니 목록의 배지도 달라진다
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list })
    },
  })
}

/**
 * 작성 서류 초안 생성.
 *
 * 업로드와 마찬가지로 응답에 결과가 없다. 상세를 다시 받아야 '작성 중' 으로
 * 바뀌고, 그때부터 폴링이 초안을 기다린다.
 */
export function useRequestDraft(applicationId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: requestDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(applicationId) })
    },
  })
}

/**
 * 서류 업로드.
 *
 * 업로드 응답에는 상태가 없다. 검증은 서버에서 비동기로 시작되므로, 올린 직후
 * 상세를 다시 받아 '검증 준비중' 으로 바꾸고 그때부터 폴링이 돌게 한다.
 */
export function useUploadDocument(applicationId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(applicationId) })
    },
  })
}

/** 신청 목록. 신청·취소하면 무효화해야 하므로 키를 따로 둔다 */
export function useApplications() {
  return useQuery({
    queryKey: queryKeys.application.list,
    queryFn: getApplications,
  })
}
