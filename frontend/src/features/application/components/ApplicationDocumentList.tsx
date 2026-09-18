import { splitByType } from '@/features/application/model/documents'
import {
  describeDocument,
  toSubmitUiStatus,
  toWriteUiStatus,
} from '@/features/application/model/documentStatus'
import type { ApplicationDocument } from '@/features/application/model/types'
import { UPLOAD_MAX_SIZE_MB,uploadAccept } from '@/features/application/model/upload'
import DocumentUploadItem from '@/shared/ui/DocumentUploadItem'
import DocumentWriteItem from '@/shared/ui/DocumentWriteItem'

interface ApplicationDocumentListProps {
  documents: ApplicationDocument[]
  onUpload: (applicationDocumentId: number, file: File) => void
  /** 확장자·용량·파일명 검사에서 걸렸을 때. FileDropzone 이 문구를 만들어 준다 */
  onFileError: (message: string) => void
  /** AI 에게 초안을 만들어 달라고 요청한다 */
  onRequestDraft: (applicationDocumentId: number) => void
  /** 서식 원본·초안 내려받기 */
  /**
   * 서식·초안 내려받기.
   *
   * ⚠️ 지금은 url 이 항상 null 이다 (413 대기). 부르는 쪽이 '준비 중' 을 알린다.
   *    엔드포인트가 정해지면 주소를 넘기고 이 주석을 지운다.
   */
  onDownload: (url: string | null) => void
  /**
   * 신청이 접수된 뒤라 서류를 더 바꿀 수 없는 상태.
   *
   * 서버가 거절할 요청을 보낼 수 있게 두면 사용자는 이유 모를 실패를 본다.
   * 내려받기는 남긴다 — 뭐를 냈는지 다시 볼 수 있어야 한다.
   */
  readOnly?: boolean
}

/**
 * 서류 목록.
 *
 * 제출 서류와 작성 서류를 나눠 그린다. 검증을 받는 쪽과 받지 않는 쪽이라 사용자가
 * 할 일이 다르고, 시안도 두 묶음으로 갈라 두었다.
 *
 * 카드 자체는 공용 컴포넌트가 그린다. 여기서는 서버 상태를 그 컴포넌트가 아는 UI
 * 상태로 옮겨 넘기는 일만 한다.
 */
export default function ApplicationDocumentList({
  documents,
  onUpload,
  onFileError,
  onRequestDraft,
  onDownload,
  readOnly = false,
}: ApplicationDocumentListProps) {
  const { submit, write } = splitByType(documents)

  return (
    <div className="flex flex-col gap-6">
      {submit.length > 0 && (
        <section>
          <h2 className="text-body2 text-text-secondary mb-3 font-semibold">제출 서류</h2>
          <div className="flex flex-col gap-3">
            {submit.map((doc) => (
              <DocumentUploadItem
                key={doc.applicationDocumentId}
                name={doc.documentName ?? '이름 없는 서류'}
                status={toSubmitUiStatus(doc.validationStatus)}
                description={describeDocument(doc)}
                accept={uploadAccept(doc.documentType)}
                maxSizeMb={UPLOAD_MAX_SIZE_MB}
                readOnly={readOnly}
                onSelectFile={(file) => onUpload(doc.applicationDocumentId, file)}
                onFileError={onFileError}
              />
            ))}
          </div>
        </section>
      )}

      {write.length > 0 && (
        <section>
          <h2 className="text-body2 text-text-secondary mb-3 font-semibold">작성 서류</h2>
          <div className="flex flex-col gap-3">
            {write.map((doc) => (
              <DocumentWriteItem
                key={doc.applicationDocumentId}
                name={doc.documentName ?? '이름 없는 서류'}
                status={toWriteUiStatus(doc)}
                description={describeDocument(doc)}
                accept={uploadAccept(doc.documentType)}
                maxSizeMb={UPLOAD_MAX_SIZE_MB}
                /*
                 * ⚠️ 서식·초안 내려받기는 아직 동작하지 않는다 (413). 확정 응답에
                 *    templateUrl·draftUrl 이 없고 다운로드 엔드포인트도 정해지지 않았다.
                 *    자리는 두고 누르면 준비 중임을 알린다.
                 *
                 *    다만 초안 받기는 초안이 실제로 있을 때만 넘긴다. 이 컴포넌트가
                 *    핸들러 유무로 '초안이 있느냐' 를 판단해서, 항상 넘기면 만든 적도
                 *    없는데 '초안 다시 만들기' 가 뜬다.
                 */
                onDownloadOriginal={() => onDownload(null)}
                onDownloadDraft={doc.draftStatus === 'WRITTEN' ? () => onDownload(null) : undefined}
                // 읽기 전용이면 핸들러를 안 넘긴다. 그러면 그 버튼들이 사라진다
                onStartDraft={
                  readOnly ? undefined : () => onRequestDraft(doc.applicationDocumentId)
                }
                onSelectFile={
                  readOnly ? undefined : (file) => onUpload(doc.applicationDocumentId, file)
                }
                onFileError={onFileError}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
