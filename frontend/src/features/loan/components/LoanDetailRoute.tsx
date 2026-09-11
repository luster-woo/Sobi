import { useLocation, useNavigate, useParams } from 'react-router'

import LoanDetailModal from '@/features/loan/components/LoanDetailModal'
import { ROUTES } from '@/shared/constants/routes'

/**
 * `/loans/:loanId` 자식 라우트. 주소로 상세 모달을 여닫는 껍데기다.
 *
 * 목록 위에 뜨고 목록은 뒤에 남는다. 주소가 바뀌므로 링크 공유가 되고 뒤로가기로
 * 모달만 닫힌다.
 *
 * 닫을 때 location.search 를 그대로 들고 돌아간다 — 목록의 검색어·필터를 잃지 않는다.
 */
export default function LoanDetailRoute() {
  const { loanId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <LoanDetailModal
      loanId={Number(loanId)}
      onClose={() => navigate({ pathname: ROUTES.LOANS, search: location.search })}
    />
  )
}
