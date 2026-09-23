import { countDone, isDone } from '@/features/application/model/documents'
import type { ApplicationDocument } from '@/features/application/model/types'
import Panel from '@/shared/ui/Panel'
import { cn } from '@/shared/utils/cn'

interface ApplicationChecklistProps {
  documents: ApplicationDocument[]
}

/**
 * 오른쪽 서류 체크리스트.
 *
 * 왼쪽 카드가 '지금 뭘 해야 하나' 를 보여준다면 여기는 '전체가 몇 개고 어디까지 왔나'
 * 를 보여준다. 그래서 상태 문구 대신 번호와 발급처만 적는다.
 *
 * 완료 개수는 서버에 요청하지 않았다. documents 를 세면 나오는 값이라, 화면 문구를
 * 바꿀 때 서버를 건드리지 않아도 된다.
 */
export default function ApplicationChecklist({ documents }: ApplicationChecklistProps) {
  const done = countDone(documents)

  return (
    <Panel
      title="제출·작성 서류"
      headerRight={
        <span className="text-body2 text-text-secondary">
          {done} / {documents.length} 완료
        </span>
      }
    >
      <ol className="divide-border-subtle divide-y">
        {documents.map((doc, index) => (
          <li
            key={doc.applicationDocumentId}
            className="px-card flex items-center gap-3 py-3 first:pt-4 last:pb-4"
          >
            <span
              className={cn(
                'text-caption flex size-6 shrink-0 items-center justify-center rounded-full border font-semibold',
                isDone(doc)
                  ? 'border-primary bg-primary text-text-inverse'
                  : 'border-border-strong text-text-secondary',
              )}
            >
              {index + 1}
            </span>
            <span className="text-body2 text-text min-w-0 flex-1 break-keep">
              {doc.documentName ?? '이름 없는 서류'}
            </span>
            {/*
              ⚠️ 원래는 발급처(홈택스 · 인터넷등기소)를 띄웠다. 확정 응답에서 issuer 가
                 빠져서 종류로 대신한다. 발급처는 상품마다 정해진 값이라 서버가 주는
                 편이 맞는데, 일부러 뺀 것인지 확인이 필요하다.
            */}
            <span className="text-caption text-text-secondary shrink-0">
              {doc.documentType === 'WRITE' ? '화면에서 작성' : '제출'}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
