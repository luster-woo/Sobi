import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import DefinitionList from '@/components/common/DefinitionList'
import Modal from '@/components/common/Modal'
import type { Insurance } from '@/types'

interface InsuranceModalProps {
  item: Insurance | null
  onClose: () => void
  onToggleStatus: (id: string) => void
}

/** 의무보험 항목 클릭 → 세부 내용 모달 (화면 미제작 → 디자인 시스템 기준 임시 구성) */
export default function InsuranceModal({ item, onClose, onToggleStatus }: InsuranceModalProps) {
  if (!item) return null
  const required = item.status === 'required'

  return (
    <Modal
      open
      onClose={onClose}
      title={item.name}
      description={`${item.law} · 업종별 필수 가입 항목`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            variant={required ? 'primary' : 'outline'}
            onClick={() => onToggleStatus(item.id)}
          >
            {required ? '가입 제외로 변경' : '가입 필요로 변경'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span className="typo-body2 text-text-muted">가입 상태</span>
          {required ? <Badge tone="warning">가입 필요</Badge> : <Badge>가입 완료</Badge>}
        </div>
        <p className="typo-body1 leading-relaxed">{item.description}</p>
        <Card variant="flat" className="rounded-md p-4">
          <DefinitionList
            size="sm"
            items={[
              { label: '근거 법령', value: item.law },
              { label: '미가입 시', value: '과태료 부과 및 영업 정지 사유가 될 수 있어요' },
              { label: '확인 기준', value: '마이데이터 보험 가입 내역 (2026. 9. 2 갱신)' },
            ]}
          />
        </Card>
      </div>
    </Modal>
  )
}
