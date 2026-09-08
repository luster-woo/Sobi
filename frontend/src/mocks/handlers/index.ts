import { authHandlers } from './auth'

/**
 * 도메인별 핸들러를 여기에 모읍니다.
 * 새 도메인이 생기면 `handlers/{도메인}.ts` 를 만들고 아래에 추가하세요.
 */
export const handlers = [...authHandlers]
