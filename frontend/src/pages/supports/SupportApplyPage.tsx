import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '@/shared/ui/Card'
import Button from '@/shared/ui/Button'
import Tag from '@/shared/ui/Tag'
import DocumentList from '@/shared/ui/DocumentList'
import DefinitionList from '@/shared/ui/DefinitionList'
import { mockSupports } from '@/mocks/supports.mock'
import { mockSupportSubmitDocs, mockSupportWriteDocs } from '@/mocks/applications.mock'
import { dday, formatDate, formatMonthDay } from '@/shared/lib/format'

/** 14-2. 지원금 신청·서류 제출 */
export default function SupportApplyPage() {
  const navigate = useNavigate()
  const { programId } = useParams()
  const s = mockSupports.find((x) => x.id === programId) ?? mockSupports[0]
  const [docs, setDocs] = useState(mockSupportSubmitDocs)

  const upload = (id: string) => setDocs((xs) => xs.map((d) => (d.id === id ? { ...d, status: 'passed' } : d)))
  const ready = docs.every((d) => d.status === 'passed' || d.status === 'checking')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="typo-h2">{s.name}</h2>
        <div className="mt-2 flex gap-2">
          <Tag>{s.type}</Tag>
          <Tag>{s.amountLabel}</Tag>
          <Tag>도입비의 70%</Tag>
          {s.deadline && <Tag>~ {formatMonthDay(s.deadline)}</Tag>}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          <DocumentList submit={docs} write={mockSupportWriteDocs} onUpload={upload} />
          <Button size="lg" className="w-full" disabled={!ready} onClick={() => navigate(`/supports/${s.id}/status`)}>
            신청하기
          </Button>
          {!ready && (
            <p className="text-center typo-caption text-text-disabled">
              목업 안내: 검증 실패·미제출 서류의 업로드 버튼을 누르면 통과 처리돼요
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="typo-h4">제출·작성 서류</p>
            <ol className="space-y-2.5">
              {[...docs.map((d) => [d.name, d.source]), ...mockSupportWriteDocs.map((w) => [w.name, '화면에서 작성'])].map(
                ([n, src], i) => (
                  <li key={n} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 typo-body2">
                      <span className="inline-flex size-5 items-center justify-center rounded-full border border-border-strong typo-caption text-text-muted">
                        {i + 1}
                      </span>
                      {n}
                    </span>
                    <span className="typo-caption text-text-muted">{src}</span>
                  </li>
                ),
              )}
            </ol>
          </Card>

          <Card className="space-y-3">
            <p className="typo-h4">업로드 제한</p>
            <DefinitionList
              size="sm"
              labelWidth={48}
              items={[
                { label: '형식', value: 'PDF - JPG - PNG' },
                { label: '용량', value: '파일당 10MB 이하' },
                { label: '장수', value: '서류당 최대 5장' },
              ]}
            />
          </Card>

          {s.deadline && (
            <Card className="space-y-1">
              <p className="typo-caption text-text-muted">접수 마감까지</p>
              <p className="font-heading text-[26px] font-semibold">D-{dday(s.deadline)}</p>
              <p className="typo-caption text-text-muted">{formatDate(s.deadline)} 마감·마감 후에는 접수할 수 없어요</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
