import type { AppNotification } from '@/shared/types'

/**
 * 목록 응답 한 건.
 *
 * ERD 의 `notification` 에는 문구 컬럼이 없어서 프론트가 type 으로 만든다.
 * `targetName` 은 서버가 join 해서 같이 내려주면 문구에 넣고, 없으면 타입별 기본
 * 문구만 쓴다. 스케줄러가 매일 같은 시각에 여러 건을 한꺼번에 만들기 때문에
 * 이름이 없으면 같은 문장이 여러 줄 반복된다.
 */
export interface NotificationItem extends AppNotification {
  targetName?: string
}
