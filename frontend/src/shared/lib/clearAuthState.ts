import { clearOAuthRequest } from '@/features/auth/model/googleOAuth'
import { queryClient } from '@/shared/api/queryClient'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 세션이 끝날 때 남는 것을 전부 치운다 (S15P21D101-395).
 *
 * 세션이 끝나는 길이 셋이다 — 로그아웃 · 탈퇴 · 재발급 실패(만료). 셋이 각자 정리하다
 * 보니 만료 경로만 `clearSession()` 하나만 부르고 react-query 캐시를 두고 갔다.
 * gcTime 이 5분이라(`queryClient.ts`) 그동안 이전 사용자의 신청 내역·계좌 목록이
 * 메모리에 남고, 같은 탭에서 다른 계정으로 들어오면 첫 화면에 그 값이 스친다.
 *
 * 그래서 한 곳으로 모은다. 새 정리 대상이 생겨도 여기만 고치면 세 경로에 같이 적용된다.
 *
 * ⚠️ `pendingToast` 는 일부러 건드리지 않는다. 탈퇴가 '탈퇴됐어요' 를 적어두고 이
 *    함수를 부르기 때문에, 여기서 지우면 도착한 화면에서 안내가 사라진다.
 *    그건 세션 정보가 아니라 사용자에게 전할 말이라 성격이 다르다.
 *
 * ⚠️ 화면 이동은 하지 않는다. 로그아웃·탈퇴는 전체 이동(`window.location.replace`)이
 *    필요하고 만료는 보호 라우트가 알아서 보내는데, 세 경로의 사정이 서로 달라서
 *    여기서 정하면 한쪽이 반드시 어긋난다. 부르는 쪽이 정한다.
 */
export function clearAuthState() {
  // 토큰·사용자·가입경로·로그인 후 목적지
  useAuthStore.getState().clearSession()

  // 이전 사용자의 응답이 남지 않게. gcTime 을 기다리지 않고 즉시 비운다
  queryClient.clear()

  // 동의 화면으로 나갔다가 못 돌아온 요청 기록
  clearOAuthRequest()
}
