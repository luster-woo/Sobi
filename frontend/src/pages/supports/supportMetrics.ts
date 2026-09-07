import type { Support } from '@/types'
import { dday } from '@/utils/format'

/** 지원금 목록·검색 결과 행에 공통으로 쓰는 지표 */
export function supportMetrics(s: Support) {
  return [
    { label: '지원 금액', value: s.amountLabel },
    { label: '접수 기간', value: s.deadline ? `D-${dday(s.deadline)}` : '상시' },
  ]
}
