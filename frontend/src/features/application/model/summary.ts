import type {
  ApplicationDetail,
  ApplicationLoanSummary,
  ApplicationSupportSummary,
} from '@/features/application/model/types'
import { formatDeadlineDate, formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 화면 상단의 상품 이름과 요약 한 줄.
 *
 *   대출      소진공 일반경영안정자금
 *             소상공인시장진흥공단 · 연 3.4% · 최대 7,000만 원
 *   지원사업   스마트상점 바우처
 *             소상공인시장진흥공단 · 지원금 · 최대 500만 원 · ~ 9. 30
 *
 * 대출과 지원사업을 한 함수로 합치지 않는다. 서버가 두 객체를 완전히 다른 필드로
 * 주기 때문이다 — accountName/programName, bankName/jurisdiction,
 * maxLoanBalance/maxBalance. 억지로 합치면 어느 쪽 필드인지 읽히지 않고, 한쪽 응답이
 * 바뀔 때 다른 쪽까지 들여다봐야 한다.
 */

/** 신청 종류를 모를 때(상품이 지워진 신청) 쓸 이름 */
const UNKNOWN_NAME = '삭제된 상품'

export function describeLoan(loan: ApplicationLoanSummary): string {
  return [
    loan.bankName,
    `연 ${loan.interestRate}%`,
    `최대 ${formatMoneyShort(loan.maxLoanBalance)}`,
  ].join(' · ')
}

export function describeSupport(support: ApplicationSupportSummary): string {
  const parts: string[] = [support.jurisdiction, support.supportType]

  // 금액 개념이 없는 공고('기타')는 둘 다 null 이다
  if (support.maxBalance !== null) {
    parts.push(`최대 ${formatMoneyShort(support.maxBalance)}`)
  }

  // 상시 접수(마감 없음)면 줄만 길어지므로 붙이지 않는다
  if (support.endDate) parts.push(formatDeadlineDate(support.endDate))

  return parts.join(' · ')
}

/** 제목에 쓸 상품명 */
export function productName(detail: ApplicationDetail): string {
  if (detail.loan) return detail.loan.accountName
  if (detail.support) return detail.support.programName
  return UNKNOWN_NAME
}

/** 제목 아래 요약. 상품이 지워졌으면 빈 문자열이고 부르는 쪽이 줄을 생략한다 */
export function productSummary(detail: ApplicationDetail): string {
  if (detail.loan) return describeLoan(detail.loan)
  if (detail.support) return describeSupport(detail.support)
  return ''
}

/**
 * 신청 금액 범위. 대출에만 있다.
 *
 * 지원사업은 금액도 계좌도 입력받지 않는다. 유형에 '지원금'·'대출' 이 있지만 우리
 * 서비스에서 실제로 돈이 오가는 건 순수 대출뿐이다 — 서버도 지원사업 제출에서는
 * 금융망을 부르지 않고 신청 행에 값만 적는다.
 *
 * 공고의 minBalance·maxBalance 는 요약 줄에 계속 나온다(describeSupport 의
 * '최대 500만 원'). 그건 공고가 주는 금액이지 사용자가 입력할 값이 아니라 여기서 안 쓴다.
 *
 * ⚠️ 서버는 아직 '기타' 가 아닌 지원사업에 amount·accountId 를 요구한다
 *    (ApplicationServiceImpl.submitSupport). 둘 다 없으면 APPLICATION_009 로 막힌다.
 *    백엔드가 그 분기를 걷어내면 맞물린다 — 프론트는 이대로 둔다.
 */
export function amountRange(detail: ApplicationDetail): { min: number; max: number } | null {
  if (!detail.loan) return null

  return { min: detail.loan.minLoanBalance, max: detail.loan.maxLoanBalance }
}
