import type { LoanConditions } from '@/features/loan/model/types'

/**
 * 신청 자격 요건을 한 줄로.
 *
 *   둘 다 필요   '사업 개시 후 · 근로자 1명 이상'
 *   하나만       '사업 개시 후'
 *   둘 다 아님   '별도 조건 없음'
 *
 * 시안에는 '대상: 소상공인' 줄이 있었는데 loan 테이블에 그런 컬럼이 없다. 이 플랫폼
 * 자체가 소상공인 대상이라 그 문구는 어느 상품에나 같은 말이기도 하다. 대신 서버가
 * 주는 실제 자격 요건으로 그 자리를 채운다 — 상품마다 다르고 신청 전에 알아야 하는
 * 정보다.
 *
 * '별도 조건 없음' 을 빈 문자열로 두지 않는 이유: 줄이 사라지면 조건을 확인하지
 * 못한 것인지 조건이 없는 것인지 구분되지 않는다.
 */
export function describeConditions({ requiresStart, requiresEmployee }: LoanConditions): string {
  const parts: string[] = []

  if (requiresStart) parts.push('사업 개시 후')
  if (requiresEmployee) parts.push('근로자 1명 이상')

  return parts.length > 0 ? parts.join(' · ') : '별도 조건 없음'
}
