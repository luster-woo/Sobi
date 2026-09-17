import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 비밀번호 변경.
 *
 * ⚠️ 보내는 것은 새 비밀번호 하나뿐이다. 백엔드 `PasswordChangeReqeust` 에
 *    현재 비밀번호 필드가 없어서, 로그인된 상태이기만 하면 그대로 바뀐다.
 *    `endpoints.user.password` 주석 참고.
 *
 * 길이 제한은 백엔드 `@Size(min = 8, max = 20)` 과 같다 — 화면의 `validatePassword`
 * 가 먼저 걸러내지만, 통과 못 하면 400 COMMON_001 이다.
 *
 * 성공해도 토큰은 그대로다. 서버가 세션을 끊지 않으므로 다시 로그인할 필요가 없다.
 */
export async function changePassword(password: string) {
  await api.patch(endpoints.user.password, { password })
}

/**
 * 회원 탈퇴. 되돌릴 수 없다.
 *
 * 서버가 `users.deleted_at` 을 채우고 refreshToken 을 지운다. 응답에 쿠키를 만료시키는
 * `Set-Cookie` 가 실려 오므로 프론트는 메모리에 남은 accessToken·스토어·캐시만 치우면 된다.
 *
 * ⚠️ 경로가 `GET /user/me` 와 같다. 메서드만 다르다 — 조회 엔드포인트를 지운 게 아니라
 *    같은 자리에 DELETE 를 얹은 것이다.
 */
export async function withdraw() {
  await api.delete(endpoints.user.withdraw)
}

/**
 * 새 공고 알림 수신 토글.
 *
 * ⚠️ 본문이 없다. 켤지 끌지를 보내는 것이 아니라 **서버가 현재 값을 뒤집는다.**
 *    그래서 같은 요청을 두 번 보내면 원래대로 돌아온다 — 화면에서 연타를 막아야 한다.
 *
 * 응답으로 바뀐 값이 온다. 프론트가 계산한 값 대신 이쪽을 쓴다.
 */
export async function toggleNotification() {
  const { data } = await api.patch<{ notification: boolean }>(endpoints.user.notification)
  return data.notification
}
