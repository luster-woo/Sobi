import { useMutation } from '@tanstack/react-query'

import { changePassword, withdraw } from '@/features/mypage/api/user'
import { ROUTES } from '@/shared/constants/routes'
import { clearAuthState } from '@/shared/lib/clearAuthState'
import { setPendingToast } from '@/shared/lib/pendingToast'

/**
 * 비밀번호 변경.
 *
 * 성공해도 세션을 건드리지 않는다 — 서버가 토큰을 무효화하지 않으므로 다시 로그인할
 * 필요가 없다. 무효화할 쿼리도 없다: 비밀번호는 어느 조회 응답에도 실리지 않는다.
 *
 * 성공·실패 안내는 부르는 쪽(모달)이 한다. 모달이 닫힐지 열린 채 오류를 보여줄지는
 * 화면이 정할 일이다.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (password: string) => changePassword(password),
  })
}

/**
 * 회원 탈퇴.
 *
 * 성공하면 세션을 비우고 **전체 이동**으로 랜딩에 내려놓는다. `useLogout` 과 같은
 * 이유다 — `navigate` 로 옮기면 `clearSession()` 이 상태를 바꾸는 순간 아직 마운트돼
 * 있는 ProtectedRoute 가 `/login` 으로 먼저 보내버린다. 전체 이동이면 그 경쟁이 없고
 * 메모리에 남은 토큰·캐시도 함께 버려진다.
 *
 * 토스트는 이동을 건너야 해서 `setPendingToast` 로 넘긴다. 랜딩이 받아 띄운다 —
 * 되돌릴 수 없는 동작이라 "됐다" 는 말은 있어야 한다.
 *
 * ⚠️ 실패는 여기서 처리하지 않는다. 탈퇴가 안 됐는데 화면만 랜딩으로 가면 사용자는
 *    탈퇴된 줄 안다. 모달이 열린 채로 오류를 보여주도록 부르는 쪽에 맡긴다.
 */
export function useWithdraw() {
  return useMutation({
    mutationFn: withdraw,
    onSuccess: () => {
      /*
       * 안내를 먼저 적어둔다. `clearAuthState` 는 pendingToast 를 건드리지 않지만,
       * 순서를 뒤집으면 읽는 사람이 "지워지지 않나?" 하고 멈칫하게 된다.
       */
      setPendingToast('탈퇴가 완료됐어요. 그동안 이용해 주셔서 고맙습니다.')

      // 이동 전에도 지운다. 이동이 막히는 환경에서도 세션은 남지 않아야 한다
      clearAuthState()

      window.location.replace(ROUTES.HOME)
    },
  })
}
