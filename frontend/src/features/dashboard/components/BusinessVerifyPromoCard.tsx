import MiniPanel from '@/features/dashboard/components/MiniPanel'
import NavButton from '@/features/dashboard/components/NavButton'
import { ROUTES } from '@/shared/constants/routes'

/**
 * 사업자 인증 유도 카드 (시안 10-1 오른쪽 첫 카드).
 *
 * 예비창업자 화면에서 비어 있는 것들 — 판정·상환 관리·매출 — 이 왜 없는지 한 자리에
 * 모아 설명한다. 화면 곳곳에 '사업자 인증이 필요해요' 를 흩어 놓으면 같은 말을 네 번
 * 읽게 된다.
 *
 * 닫기를 두지 않았다. 이 사용자에게 남은 가장 큰 다음 단계이고, 인증을 마치면 role 이
 * 바뀌어 카드가 통째로 사라진다.
 */
export default function BusinessVerifyPromoCard() {
  return (
    <MiniPanel title="사업자등록을 마치셨나요?">
      <p className="text-text-muted text-[11.5px] leading-[1.65]">
        인증하면 매출·신용 기준으로 자격을 판정하고 상환 관리까지 쓸 수 있어요.
      </p>

      <NavButton to={ROUTES.BUSINESS_VERIFY} size="sm" className="w-full">
        사업자 인증하기
      </NavButton>
    </MiniPanel>
  )
}
