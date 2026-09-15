import type {
  ApplicationDetail,
  ApplicationListData,
  CreateApplicationParams,
  SubmitApplicationBody,
  UploadDocumentParams,
} from '@/features/application/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 신청 건 생성.
 *
 * 대상은 body 가 아니라 쿼리로 보낸다(`?type=LOAN&programId=2`). 서버가 이 시점에
 * 서류 행을 미리 깔아 주기 때문에, 응답의 documents 에는 아직 안 올린 서류도 들어 있다.
 * 금액·계좌는 여기서 보내지 않는다 — 화면에서 입력받아 최종 신청 때 함께 보낸다.
 *
 * 봉투는 `client.ts` 인터셉터가 벗긴다. 여기서는 알맹이 타입만 쓴다.
 */
export async function createApplication(params: CreateApplicationParams) {
  const { data } = await api.post<ApplicationDetail>(endpoints.application.create, null, { params })
  return data
}

/** 신청 상세. 검증이 비동기라 이 응답을 폴링해서 서류 상태를 갱신한다 */
export async function getApplicationDetail(applicationId: number) {
  const { data } = await api.get<ApplicationDetail>(endpoints.application.detail(applicationId))
  return data
}

/** 신청 취소. 신청 건과 올린 서류가 함께 삭제된다 — 되돌릴 수 없다 */
export async function cancelApplication(applicationId: number) {
  await api.delete<null>(endpoints.application.cancel(applicationId))
}

/** 최종 신청. 서류가 다 끝난 뒤에만 호출한다 */
export async function submitApplication(body: SubmitApplicationBody) {
  await api.post<null>(endpoints.application.submit, body)
}

/**
 * 작성 서류 초안 생성 요청.
 *
 * 서버가 비동기로 만들고 응답에는 결과가 없다. 상세를 다시 받아 WRITING 으로
 * 바뀐 뒤 폴링으로 draftUrl 을 기다린다.
 */
export async function requestDraft(applicationDocumentId: number) {
  await api.post<null>(endpoints.application.requestDraft, { applicationDocumentId })
}

/**
 * 서류 업로드. 제출 서류와 작성 서류가 같은 곳을 쓴다 — 작성 서류는
 * 서버가 검증을 건너뛰고 바로 작성 완료로 둘다.
 *
 * 서버가 Spring `@RequestPart` 로 받아서 파일과 JSON 이 각각 별개의 part 다.
 * JSON 을 문자열로 넣으면 part 에 Content-Type 이 안 붙어 415 가 나므로 Blob 으로 감싼다.
 *
 * Content-Type 헤더는 직접 지정하지 않는다. axios 가 FormData 를 보면 boundary 를
 * 포함해서 알아서 넣어 주는데, 손으로 넣으면 boundary 가 빠져 서버가 파싱하지 못한다.
 */
export async function uploadDocument({ applicationDocumentId, file }: UploadDocumentParams) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append(
    'request',
    new Blob([JSON.stringify({ applicationDocumentId })], { type: 'application/json' }),
  )

  await api.post<null>(endpoints.application.uploadDocument, formData)
}

/** 내 신청 목록. 상태 필터는 화면에서 거른다 — 건수가 많지 않고 탭 전환이 즉시 반응해야 한다 */
export async function getApplications() {
  const { data } = await api.get<ApplicationListData>(endpoints.application.list)
  return data.applications
}
