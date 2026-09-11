import { useLocation, useNavigate, useParams } from 'react-router'

import SupportProgramDetailModal from '@/features/support-program/components/SupportProgramDetailModal'
import { ROUTES } from '@/shared/constants/routes'

/**
 * `/support-programs/:supportProgramId` 자식 라우트. 주소로 상세 모달을 여닫는 껍데기다.
 *
 * 닫을 때 location.search 를 그대로 들고 돌아간다 — 목록의 검색어·필터를 잃지 않는다.
 */
export default function SupportProgramDetailRoute() {
  const { supportProgramId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SupportProgramDetailModal
      supportProgramId={Number(supportProgramId)}
      onClose={() => navigate({ pathname: ROUTES.SUPPORT_PROGRAMS, search: location.search })}
    />
  )
}
