import { INSURANCE_DETAIL } from '@/features/dashboard/model/insuranceDetail'
import { type DashboardInsurance, INSURANCE_STATUS_LABEL } from '@/features/dashboard/model/types'
import { INSURANCE_STATUS_VARIANT } from '@/shared/constants/statusBadge'
import { INSURANCE_STATUS, type InsuranceStatus } from '@/shared/types'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

interface InsuranceDetailModalProps {
  /** null 이면 닫힌 상태다. 열 때 어느 항목인지 같이 넘긴다 */
  insurance: DashboardInsurance | null
  /** 확인 필요 → 가입 필요 · 가입 제외 */
  onChangeStatus: (insuranceChecklistId: number, status: InsuranceStatus) => void
  /**
   * 예비창업자용. 개업 전이라 가입 여부가 판정된 적이 없어 상태 배지와 선택 버튼을
   * 숨기고 안내만 읽게 한다.
   */
  readOnly?: boolean
  onClose: () => void
}

/**
 * 의무보험 안내 창.
 *
 * 대시보드 카드에서 보험 이름을 누르면 열린다. 별도 화면으로 만들지 않은 이유:
 * 여기서 할 일은 읽고 상태를 고르는 것뿐이고, 화면을 옮기면 대시보드로 돌아오는
 * 길이 따로 필요하다.
 *
 * '확인 필요' 일 때만 하단에 선택 버튼이 나온다. 마이데이터로 가입 여부를 판정하지
 * 못한 항목이라 사용자밖에 답을 모른다. 가입 완료는 사용자가 고르게 두지 않는다 —
 * 자기 신고로 완료 처리되면 체크리스트가 아무것도 보장하지 못한다.
 *
 * 본문은 하드코딩이다(model/insuranceDetail.ts). `GET /insurance/{id}` 가 붙으면
 * 이 컴포넌트는 그대로 두고 그 파일만 응답으로 바꾼다.
 */
export default function InsuranceDetailModal({
  insurance,
  onChangeStatus,
  readOnly = false,
  onClose,
}: InsuranceDetailModalProps) {
  // open 을 boolean 으로 따로 받지 않는다. 두 값이 어긋나면 빈 모달이 뜬다
  if (!insurance) return null

  const detail = INSURANCE_DETAIL[insurance.insuranceChecklistId] ?? null
  const needsChoice = !readOnly && insurance.status === INSURANCE_STATUS.NEEDS_VERIFICATION

  const choose = (status: InsuranceStatus) => {
    onChangeStatus(insurance.insuranceChecklistId, status)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={insurance.insuranceName}
      headerRight={
        readOnly ? undefined : (
          <Badge variant={INSURANCE_STATUS_VARIANT[insurance.status]}>
            {INSURANCE_STATUS_LABEL[insurance.status]}
          </Badge>
        )
      }
      size="lg"
      footer={
        needsChoice ? (
          <>
            <Button variant="outline" onClick={() => choose(INSURANCE_STATUS.EXEMPT)}>
              가입 대상이 아니에요
            </Button>
            <Button onClick={() => choose(INSURANCE_STATUS.REQUIRED)}>아직 가입 안 했어요</Button>
          </>
        ) : (
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        )
      }
    >
      {detail ? (
        <div className="space-y-5">
          <p className="text-body2 text-text-secondary leading-[1.8]">{detail.info}</p>

          {/* condition 은 원문이라 줄바꿈이 의미를 갖는다. 마크업으로 쪼개지 않는다 */}
          <p className="text-body2 text-text-secondary border-border-subtle border-t pt-5 leading-[1.9] whitespace-pre-line">
            {detail.condition}
          </p>

          <p className="text-caption text-text-muted border-border-subtle border-t pt-4 leading-[1.7]">
            ※ 보장 한도와 과태료는 법령 개정에 따라 바뀝니다. 가입 전에 보험사 약관과 관할 기관
            고시를 확인해 주세요.
          </p>
        </div>
      ) : (
        <p className="text-body2 text-text-secondary">
          안내 내용을 준비하고 있어요. 관할 기관이나 보험사에 문의해 주세요.
        </p>
      )}
    </Modal>
  )
}
