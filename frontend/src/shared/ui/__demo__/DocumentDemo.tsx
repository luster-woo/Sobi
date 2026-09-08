import { useState } from 'react'

import type { SubmitDocumentStatus, WriteDocumentStatus } from '@/shared/constants/documentStatus'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import Button from '@/shared/ui/Button'
import DocumentUploadItem from '@/shared/ui/DocumentUploadItem'
import DocumentWriteItem from '@/shared/ui/DocumentWriteItem'
import ToastViewport from '@/shared/ui/ToastViewport'

/**
 * S15P21D101-173 확인용 데모.
 *
 * 제출용 5상태 · 작성용 3상태를 보여주고, 업로드·초안 작성 흐름을 실제로 눌러볼 수
 * 있게 했습니다. 상태가 넘어가는 시간은 setTimeout 으로 흉내낸 것입니다 —
 * 실제 화면은 react-query refetchInterval 로 서버 상태를 폴링합니다.
 *
 * 파일 검사 실패 문구를 토스트로 띄웁니다. 화면에서도 같은 방식을 권합니다.
 * ToastViewport 를 여기서 렌더하는 이유는 main.tsx 가 App 대신 이 컴포넌트를
 * 렌더하기 때문입니다 (App 에 붙은 뷰포트가 마운트되지 않음).
 *
 * 보는 방법: src/main.tsx 에서 App 대신 이 컴포넌트를 렌더 (그 변경은 커밋하지 마세요)
 */

interface SubmitDoc {
  id: string
  name: string
  status: SubmitDocumentStatus
}

interface WriteDoc {
  id: string
  name: string
  status: WriteDocumentStatus
}

/** 상태마다 문구의 성격이 다릅니다. 이걸 화면이 넣는다는 게 description prop 의 취지입니다 */
const SUBMIT_DESCRIPTION: Record<SubmitDocumentStatus, string> = {
  EMPTY: '홈택스·정부24에서 즉시 발급받을 수 있어요',
  VALIDATION_READY: '업로드 완료. 검증을 기다리고 있어요',
  VALIDATING: '서명 / 도장 / 발급 유효기간 / 필수 필드를 확인하고 있어요',
  PASSED: '발급일 2026.08.20 · 직인 확인 · 필수 필드 완료',
  FAILED: '인감 도장이 확인되지 않아요. 날인 후 다시 올려주세요.',
}

const WRITE_DESCRIPTION: Record<WriteDocumentStatus, string> = {
  EMPTY: '양식을 받아 직접 작성하거나, 초안을 자동으로 만들 수 있어요',
  WRITING: '입력하신 사업자 정보를 서류에 채워 넣고 있어요',
  WRITTEN: '작성된 초안을 내려받아 확인 후 제출하세요',
}

const INITIAL_SUBMIT: SubmitDoc[] = [
  { id: 's1', name: '부가세 과세표준증명원', status: 'PASSED' },
  { id: 's2', name: '재무제표', status: 'VALIDATING' },
  { id: 's3', name: '사업자등록증명원', status: 'VALIDATION_READY' },
  { id: 's4', name: '등기부등본', status: 'FAILED' },
  { id: 's5', name: '국세 납세증명서', status: 'EMPTY' },
]

const INITIAL_WRITE: WriteDoc[] = [
  { id: 'w1', name: '자금 사용 계획서', status: 'EMPTY' },
  { id: 'w2', name: '사업 계획서', status: 'WRITING' },
  { id: 'w3', name: '지출 계획표', status: 'WRITTEN' },
]

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-h3">{title}</h2>
        {hint && <p className="text-body2 text-text-muted mt-1">{hint}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export default function DocumentDemo() {
  const showToast = useUiStore((state) => state.showToast)

  const [submitDocs, setSubmitDocs] = useState(INITIAL_SUBMIT)
  const [writeDocs, setWriteDocs] = useState(INITIAL_WRITE)

  const setSubmitStatus = (id: string, status: SubmitDocumentStatus) => {
    setSubmitDocs((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status } : doc)))
  }

  const setWriteStatus = (id: string, status: WriteDocumentStatus) => {
    setWriteDocs((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status } : doc)))
  }

  /** 업로드 → 검증 대기 → 검증 중 → 통과. 시간은 데모용 흉내입니다 */
  const handleSelectFile = (id: string) => (file: File) => {
    showToast(`${file.name} 업로드했어요`)
    setSubmitStatus(id, 'VALIDATION_READY')
    window.setTimeout(() => setSubmitStatus(id, 'VALIDATING'), 1500)
    window.setTimeout(() => setSubmitStatus(id, 'PASSED'), 5000)
  }

  /** 초안 작성 시작 → 작성 중 → 작성 완료 */
  const handleStartDraft = (id: string) => () => {
    setWriteStatus(id, 'WRITING')
    window.setTimeout(() => setWriteStatus(id, 'WRITTEN'), 5000)
  }

  const reset = () => {
    setSubmitDocs(INITIAL_SUBMIT)
    setWriteDocs(INITIAL_WRITE)
  }

  return (
    <div className="bg-bg min-h-screen">
      <ToastViewport />

      <div className="gap-section mx-auto flex max-w-[880px] flex-col p-8">
        <header>
          <h1 className="text-h1">서류 업로드·자동 검증 확인</h1>
          <p className="text-body1 text-text-secondary mt-2">
            S15P21D101-173 · FileDropzone / DocumentUploadItem / DocumentWriteItem
          </p>
        </header>

        <Section
          title="제출 서류 — 상태 5종"
          hint="미제출과 검증 실패만 클릭·드래그로 파일을 받습니다. 나머지는 누를 게 없습니다"
        >
          {submitDocs.map((doc) => (
            <DocumentUploadItem
              key={doc.id}
              name={doc.name}
              status={doc.status}
              description={SUBMIT_DESCRIPTION[doc.status]}
              onSelectFile={handleSelectFile(doc.id)}
              onFileError={(message) => showToast(message, 'danger')}
            />
          ))}
        </Section>

        <Section
          title="작성 서류 — 상태 3종"
          hint="업로드가 없습니다. 서버가 내 정보를 채워 초안을 만들어주는 흐름입니다"
        >
          {writeDocs.map((doc) => (
            <DocumentWriteItem
              key={doc.id}
              name={doc.name}
              status={doc.status}
              description={WRITE_DESCRIPTION[doc.status]}
              onDownloadOriginal={() => showToast(`${doc.name} 원본을 내려받았어요`)}
              onStartDraft={handleStartDraft(doc.id)}
              onDownloadDraft={() => showToast(`${doc.name} 초안을 내려받았어요`)}
            />
          ))}
        </Section>

        <Section title="파일 검사" hint="아래 세 가지를 일부러 시도해보세요">
          <ul className="border-border bg-surface text-body2 text-text-secondary space-y-2 rounded-lg border px-5 py-4">
            <li>· 국세 납세증명서 칸에 .zip 이나 .hwp 파일 넣기 → 확장자 안내</li>
            <li>· 10MB 넘는 파일 넣기 → 용량 안내</li>
            <li>· 파일 이름이 50자 넘는 파일 넣기 → 이름 길이 안내 (DB 컬럼 제한)</li>
            <li>· 파일을 칸 위로 끌고 오기 → 테두리와 배경이 바뀜</li>
          </ul>
        </Section>

        <div>
          <Button variant="outline" onClick={reset}>
            처음 상태로 되돌리기
          </Button>
        </div>
      </div>
    </div>
  )
}