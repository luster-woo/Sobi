import { ROUTES } from '@/shared/constants/routes'

/** 탭 제목 뒤에 붙는다 */
const SITE_NAME = 'Sobi'

/** 화면 이름을 못 찾았을 때. 랜딩·404 처럼 이름이 따로 없는 자리 */
const DEFAULT_DOCUMENT_TITLE = 'Sobi - 소상공인 매칭 서비스'

/** 상단바 화면 이름 겸 브라우저 탭 제목. 새 화면을 추가하면 여기에 한 줄 넣는다 */
export const PAGE_TITLES: Readonly<Record<string, string>> = {
  [ROUTES.LOGIN]: '로그인',
  [ROUTES.TERMS]: '약관 동의',
  [ROUTES.SIGN_UP]: '회원가입',
  [ROUTES.PASSWORD_RESET]: '비밀번호 재설정',

  [ROUTES.BUSINESS_VERIFY]: '사업자 인증',
  [ROUTES.MYDATA_CONSENT]: '마이데이터 동의',
  [ROUTES.MYDATA_COLLECT]: '마이데이터 연동',
  [ROUTES.MYDATA_JUDGING]: '대출 판정',

  [ROUTES.DASHBOARD]: '대시보드',
  [ROUTES.MARKET_ANALYSIS]: '상권 분석',
  [ROUTES.LOANS]: '대출',
  [ROUTES.SUPPORT_PROGRAMS]: '지원사업',
  [ROUTES.FUNDING_PLAN]: '자금 조합',
  [ROUTES.LOAN_REPAYMENTS]: '상환 관리',
  [ROUTES.APPLICATIONS]: '신청 현황',
  [ROUTES.MYPAGE]: '마이페이지',
  [ROUTES.MYPAGE_FAVORITES]: '관심 목록',
  [ROUTES.MYPAGE_ACCOUNTS]: '내 계좌',
}

/** 못 찾으면 빈 문자열. 접두사로 찾아 `/loans/12` 에서도 '대출' 이 나온다 */
export function resolvePageTitle(pathname: string): string {
  const matched = Object.keys(PAGE_TITLES)
    // 긴 것부터. `/mypage` 와 `/mypage/favorites` 가 같이 있으면 구체적인 쪽이 이겨야 한다
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0]

  return matched ? PAGE_TITLES[matched] : ''
}

/** 브라우저 탭 제목. '대시보드 | Sobi' */
export function resolveDocumentTitle(pathname: string): string {
  const title = resolvePageTitle(pathname)
  return title ? `${title} | ${SITE_NAME}` : DEFAULT_DOCUMENT_TITLE
}
