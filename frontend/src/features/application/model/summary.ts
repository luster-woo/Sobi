import type { ApplicationProduct } from '@/features/application/model/types'
import { formatDeadlineDate, formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 상품 요약 한 줄. 있는 것만 골라 ' · ' 로 잇는다.
 *
 *   대출      기업은행 · 연 3.4% · 최대 7,000만 원
 *   지원금     소진공 · 무상 · 최대 500만 원 · ~ 9. 30
 *   그 외 공고  소진공 · ~ 9. 30
 *
 * 빈 문자열이 나올 수 있다(이름 말고 아무것도 없는 공고). 부르는 쪽에서 걸러야 한다.
 */
export function describeProduct(product: ApplicationProduct): string {
  const parts: string[] = []

  if (product.organization) parts.push(product.organization)

  // 0 은 무상이라는 뜻이라 '연 0%' 로 쓰면 안 된다. null 은 금리 개념이 없는 상품
  if (product.interestRate === 0) parts.push('무상')
  else if (product.interestRate !== null) parts.push(`연 ${product.interestRate}%`)

  if (product.maxAmount !== null) {
    parts.push(`최대 ${formatMoneyShort(product.maxAmount)}`)
  }

  // 마감이 없는 상품(대출)은 '상시 접수' 를 붙이지 않는다. 줄만 길어진다
  if (product.deadline) parts.push(formatDeadlineDate(product.deadline))

  return parts.join(' · ')
}
