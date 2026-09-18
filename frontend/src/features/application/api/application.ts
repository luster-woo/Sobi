import type { AxiosResponse } from 'axios'

import type {
  ApplicationDetail,
  ApplicationListData,
  CreateApplicationParams,
  CreateApplicationResult,
  SubmitApplicationBody,
  SubmitApplicationResult,
  UploadDocumentParams,
  UploadDocumentResult
} from '@/features/application/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/** 초안 생성은 AI 가 필드를 채우는 동안 응답이 없다. 서버 read timeout 300초보다 넉넉히 */
const DRAFT_TIMEOUT_MS = 330_000

export interface DownloadedFile {
  blob: Blob
  /** Content-Disposition 에서 뽑은 파일명. 못 읽으면 null 이고 부르는 쪽이 이름을 짓는다 */
  fileName: string | null
}

/**
 * Content-Disposition 에서 파일명을 꺼낸다.
 *
 * 두 API 가 형태를 달리 쓴다. 빈 서식은 한글 이름이라 `filename*=UTF-8''...` 이고
 * 초안은 `filename="draft-....hwpx"` 다. 둘 다 본다.
 */
function parseFileName(disposition: string | undefined): string | null {
  if (!disposition) return null

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (encoded) return decodeURIComponent(encoded[1])

  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain ? plain[1] : null
}

function toDownloadedFile(response: AxiosResponse): DownloadedFile {
  return {
    blob: response.data as Blob,
    fileName: parseFileName(response.headers['content-disposition'] as string | undefined),
  }
}

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
  const { data } = await api.post<CreateApplicationResult>(endpoints.application.create, null, {
    params,
  })
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

/**
 * 최종 신청. 서류가 다 끝난 뒤에만 호출한다.
 *
 * 응답으로 결과가 바로 온다. 금융망이 신청 즉시 심사 결과를 주고 대출까지 실행해서,
 * 접수만 하고 기다리는 구간이 없다. 거절도 200 이라 status 로 가른다.
 */
export async function submitApplication(
  applicationId: number,
  body: SubmitApplicationBody,
): Promise<SubmitApplicationResult> {
  const { data } = await api.post<SubmitApplicationResult>(
    endpoints.application.submit(applicationId),
    body,
  )
  return data
}

/**
 * 서버가 채운 초안(HWPX)을 받는다. 생성과 다운로드가 한 번이다.
 *
 * 비동기가 아니다. 요청을 넣고 상태를 폴링하는 구간이 없어서 이 한 번의 호출이
 * 끝날 때까지 기다린다 — 그래서 화면이 진행 상황을 보여줘야 한다.
 *
 * ⚠️ responseType 이 blob 이라 **실패 응답의 JSON 도 Blob 으로 온다.** 에러 코드로
 *    갈라 안내하려면 model/downloadError.ts 가 풀어야 한다.
 */
export async function writeDraft(programDocumentId: number): Promise<DownloadedFile> {
  const response = await api.post(endpoints.application.writeDraft(programDocumentId), null, {
    responseType: 'blob',
    timeout: DRAFT_TIMEOUT_MS,
  })

  return toDownloadedFile(response)
}

/** 공고가 배포하는 빈 서식을 받는다. 지원사업 서류에만 있다 */
export async function downloadProgramDocument(
  programDocumentId: number,
): Promise<DownloadedFile> {
  const response = await api.get(endpoints.programDocument.download(programDocumentId), {
    responseType: 'blob',
  })

  return toDownloadedFile(response)
}

/**
 * 서류 업로드 (첫 업로드·재업로드 공통).
 *
 * Content-Type 헤더는 직접 지정하지 않는다. axios 가 FormData 를 보면 boundary 를
 * 포함해서 알아서 넣어 주는데, 손으로 넣으면 boundary 가 빠져 서버가 파싱하지 못한다.
 *
 * 응답에 검증 결과가 없다. 제출 서류는 PENDING 으로 돌아오고 AI 검증이 뒤에서 도는데,
 * 그 결과는 신청 상세를 폴링해서 받는다. 작성 서류는 검증을 타지 않아 바로 PASSED 다.
 */
export async function uploadDocument({ applicationDocumentId, file }: UploadDocumentParams) {
  const formData = new FormData()
  formData.append('applicationDocumentId', String(applicationDocumentId))
  formData.append('file', file)

  const { data } = await api.post<UploadDocumentResult>(
    endpoints.application.uploadDocument,
    formData,
  )
  return data
}

/**
 * 내 신청 목록.
 *
 * status 파라미터를 보내지 않는다. 서버는 IN_PROGRESS / DONE 둘로만 거르는데 화면은
 * 준비 중을 진행 중에서 떼어 네 갈래로 나눈다. 건수가 많지 않고 탭 전환이 즉시
 * 반응해야 해서 전체를 한 번 받아 화면에서 거른다.
 *
 * 함께 오는 totalCount·inProgressCount·doneCount 도 같은 이유로 쓰지 않는다.
 */
export async function getApplications() {
  const { data } = await api.get<ApplicationListData>(endpoints.application.list)
  return data.applications
}
