import { INSURANCE_DETAIL } from '@/features/dashboard/model/insuranceDetail'
import { type DashboardInsurance, INSURANCE_STATUS_LABEL } from '@/features/dashboard/model/types'
import { INSURANCE_STATUS_VARIANT } from '@/shared/constants/statusBadge'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

interface InsuranceDetailModalProps {
  /** null 이면 닫힌 상태다. 열 때 어느 보험인지 같이 넘긴다 */
  insurance: DashboardInsurance | null
  onClose: () => void
}

/**
 * 의무보험 안내 창.
 *
 * 대시보드 카드에서 보험 이름을 누르면 열린다. 별도 화면으로 만들지 않은 이유:
 * 여기서 할 일은 읽고 닫는 것뿐이고, 화면을 옮기면 대시보드로 돌아오는 길이 필요하다.
 *
 * 본문은 하드코딩이다(model/insuranceDetail.ts). `GET /insurance/{id}` 가 붙으면
 * 이 컴포넌트는 그대로 두고 그 파일만 응답으로 바꾼다.
 */
export default function InsuranceDetailModal({
  insurance,
  onClose,
}: InsuranceDetailModalProps) {
  // open 을 boolean 으로 따로 받지 않는다. 두 값이 어긋나면 빈 모달이 뜬다
  if (!insurance) return null

  const detail = INSURANCE_DETAIL[insurance.name] ?? null

  return (
    <Modal
      open
      onClose={onClose}
      title={insurance.name}
      description={detail?.legalBasis ?? insurance.law}
      headerRight={
        <Badge variant={INSURANCE_STATUS_VARIANT[insurance.status]}>
          {INSURANCE_STATUS_LABEL[insurance.status]}
        </Badge>
      }
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      }
    >
      {detail ? (
        <div className="space-y-6">
          <p className="text-body2 text-text-secondary leading-[1.8]">{detail.summary}</p>

          {detail.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h3 className="text-text text-body1 font-semibold">{section.heading}</h3>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="text-body2 text-text-secondary relative pl-3.5 leading-[1.8]"
                  >
                    <span aria-hidden="true" className="text-text-disabled absolute left-0">
                      ·
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="text-caption text-text-muted border-border-subtle border-t pt-4 leading-[1.7]">
            ※ 보장 한도와 과태료는 법령 개정에 따라 바뀝니다. 가입 전에 보험사 약관과 관할
            기관 고시를 확인해 주세요.
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
