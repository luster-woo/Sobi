import {
  useChangeInsuranceStatus,
  useInsuranceDetail,
} from '@/features/dashboard/hooks/useInsurance'
import { INSURANCE_DETAIL } from '@/features/dashboard/model/insuranceDetail'
import { type DashboardInsurance, INSURANCE_STATUS_LABEL } from '@/features/dashboard/model/types'
import { ERROR_CODE, getErrorCode, getErrorMessage } from '@/shared/api/errors'
import { INSURANCE_STATUS_VARIANT } from '@/shared/constants/statusBadge'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { INSURANCE_STATUS, type InsuranceStatus } from '@/shared/types'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import Skeleton from '@/shared/ui/Skeleton'

interface InsuranceDetailModalProps {
  /** null 이면 닫힌 상태다. 열 때 어느 항목인지 같이 넘긴다 */
  insurance: DashboardInsurance | null
  /**
   * 예비창업자용. 개업 전이라 가입 여부가 판정된 적이 없어 상태 배지와 선택 버튼을
   * 숨기고 안내만 읽게 한다. 본문도 서버가 아니라 목에서 가져온다 — 업체가 없으면
   * `GET /insurance/{id}` 가 404 다.
   */
  readOnly?: boolean
  onClose: () => void
}

/** 이미 고른 항목을 또 고르면 나는 400. 목록이 낡았을 때만 생긴다 */
const ALREADY_DECIDED_MESSAGE = '이미 처리된 항목이에요. 목록을 새로고침해 주세요.'

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
 * 본문(`condition`)은 열 때 받아온다. 목록에 같이 실으면 항목당 수십 줄이 딸려와
 * 대시보드 첫 응답이 무거워진다.
 */
export default function InsuranceDetailModal({
  insurance,
  readOnly = false,
  onClose,
}: InsuranceDetailModalProps) {
  const showToast = useUiStore((state) => state.showToast)

  /*
   * 훅은 조건 없이 부른다. 닫혀 있으면(null) 또는 참고 모드면 `enabled` 가 막는다.
   * 참고 모드는 애초에 서버에 없는 체크리스트라 목에서 본문을 가져온다.
   */
  const detailQuery = useInsuranceDetail(
    readOnly ? null : (insurance?.insuranceChecklistId ?? null),
  )
  const { mutate: changeStatus, isPending } = useChangeInsuranceStatus()

  // open 을 boolean 으로 따로 받지 않는다. 두 값이 어긋나면 빈 모달이 뜬다
  if (!insurance) return null

  const detail = readOnly
    ? (INSURANCE_DETAIL[insurance.insuranceChecklistId] ?? null)
    : (detailQuery.data ?? null)

  /*
   * 버튼 표시는 목록의 status 로 판단한다. 상세를 기다렸다 그리면 본문이 오는 동안
   * 하단이 '닫기' 였다가 두 개로 바뀌어 덜컹거린다.
   */
  const needsChoice = !readOnly && insurance.status === INSURANCE_STATUS.NEEDS_VERIFICATION

  const choose = (status: Extract<InsuranceStatus, 'REQUIRED' | 'EXEMPT'>) => {
    changeStatus(
      { insuranceChecklistId: insurance.insuranceChecklistId, status },
      {
        onSuccess: onClose,
        onError: (error) => {
          // 창은 열어둔다. 닫아버리면 무엇이 실패했는지 알 수 없다
          const code = getErrorCode(error)
          const stale =
            code === ERROR_CODE.INSURANCE_NOT_CHANGEABLE ||
            code === ERROR_CODE.INSURANCE_STATUS_INVALID

          showToast(
            getErrorMessage(error, stale ? { 400: ALREADY_DECIDED_MESSAGE } : undefined),
            'danger',
          )
        },
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={insurance.name}
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
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => choose(INSURANCE_STATUS.EXEMPT)}
            >
              가입 대상이 아니에요
            </Button>
            <Button loading={isPending} onClick={() => choose(INSURANCE_STATUS.REQUIRED)}>
              아직 가입 안 했어요
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        )
      }
    >
      {/* isPending 은 꺼진 쿼리에서도 true 다. 실제로 받아오는 동안만 참인 isLoading 을 쓴다 */}
      {!readOnly && detailQuery.isLoading ? (
        <div role="status" aria-label="안내 내용을 불러오는 중" className="space-y-3">
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="rect" height={160} />
        </div>
      ) : !readOnly && detailQuery.isError ? (
        /*
         * 실패를 '아직 안 써둔 내용' 으로 보이게 두면 안 된다. 인터셉터 토스트는 5xx·
         * 네트워크만 잡아서 404·401 은 여기서 말하지 않으면 아무 신호도 없다.
         */
        <p className="text-body2 text-text-secondary">
          안내 내용을 불러오지 못했어요. 창을 닫았다 다시 열어 주세요.
        </p>
      ) : detail ? (
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
