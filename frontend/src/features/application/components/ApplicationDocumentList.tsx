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
  /** 'AI 초안 받기'. 공고 서식 id 로 부른다 */
  onWriteDraft: (programDocumentId: number) => void
  /**
   * 지금 초안을 만들고 있는 서식 id.
   *
   * 한 건만 잠근다. 서류가 여러 장일 때 전부 잠그면, 한 장을 기다리는 동안 다른 장은
   * 손도 못 댄다.
   */
  draftingDocumentId: number | null
  /** '빈 서식 받기' */
  onDownloadOriginal: (programDocumentId: number) => void
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
  onWriteDraft,
  draftingDocumentId,
  onDownloadOriginal,
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
                 * 두 버튼 다 programDocumentId 로 부른다. 대출 신청의 서류는 이 값이
                 * null 이라 버튼이 아예 안 생긴다 — 대출에는 작성 서류도 서식 파일도 없다.
                 *
                 * 읽기 전용이면 초안만 막는다. 빈 서식은 제출한 뒤에도 받을 수 있어야
                 * 무엇을 냈는지 다시 볼 수 있다.
                 */
                onDownloadOriginal={
                  doc.programDocumentId === null
                    ? undefined
                    : () => onDownloadOriginal(doc.programDocumentId as number)
                }
                onWriteDraft={
                  readOnly || doc.programDocumentId === null
                    ? undefined
                    : () => onWriteDraft(doc.programDocumentId as number)
                }
                isDraftPending={draftingDocumentId === doc.programDocumentId}
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
