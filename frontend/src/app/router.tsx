import { createBrowserRouter, Navigate } from 'react-router-dom'

import AppLayout from '@/components/layout/AppLayout'
import PublicLayout from '@/components/layout/PublicLayout'
/* 개발용 — 공용 컴포넌트 갤러리 */
import GalleryPage from '@/pages/_dev/GalleryPage'
import ApplicationListPage from '@/pages/applications/ApplicationListPage'
import LoginPage from '@/pages/auth/LoginPage'
import PasswordResetPage from '@/pages/auth/PasswordResetPage'
import SignupPage from '@/pages/auth/SignupPage'
import SignupTermsPage from '@/pages/auth/SignupTermsPage'
/* 대시보드 이후 기능 흐름 */
import DashboardPage from '@/pages/dashboard/DashboardPage'
import FundingPage from '@/pages/funding/FundingPage'
/* 진입 · 인증 · 온보딩 */
import LandingPage from '@/pages/landing/LandingPage'
import LoanApplyPage from '@/pages/loans/LoanApplyPage'
import LoanListPage from '@/pages/loans/LoanListPage'
import LoanStatusPage from '@/pages/loans/LoanStatusPage'
import MarketPage from '@/pages/market/MarketPage'
import AccountsPage from '@/pages/mypage/AccountsPage'
import BookmarkPage from '@/pages/mypage/BookmarkPage'
import MyPage from '@/pages/mypage/MyPage'
import NotFoundPage from '@/pages/NotFoundPage'
import BusinessPhonePage from '@/pages/onboarding/BusinessPhonePage'
import BusinessVerifyPage from '@/pages/onboarding/BusinessVerifyPage'
import MydataConsentPage from '@/pages/onboarding/MydataConsentPage'
import MydataLoadingPage from '@/pages/onboarding/MydataLoadingPage'
import RepaymentPage from '@/pages/repayments/RepaymentPage'
import SupportApplyPage from '@/pages/supports/SupportApplyPage'
import SupportListPage from '@/pages/supports/SupportListPage'
import SupportSearchPage from '@/pages/supports/SupportSearchPage'
import SupportStatusPage from '@/pages/supports/SupportStatusPage'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup/terms', element: <SignupTermsPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/password/reset', element: <PasswordResetPage /> },
      { path: '/business/verify', element: <BusinessVerifyPage /> },
      { path: '/business/phone', element: <BusinessPhonePage /> },
      { path: '/mydata/consent', element: <MydataConsentPage /> },
      { path: '/mydata/loading', element: <MydataLoadingPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/market', element: <MarketPage /> },

      /* 상세(13-1 · 14-1)는 목록 위 모달 → 목록 페이지가 :id 를 함께 처리 */
      { path: '/loans', element: <LoanListPage /> },
      { path: '/loans/:loanId', element: <LoanListPage /> },
      { path: '/loans/:loanId/apply', element: <LoanApplyPage /> },
      { path: '/loans/:loanId/status', element: <LoanStatusPage /> },

      { path: '/supports', element: <SupportListPage /> },
      { path: '/supports/search', element: <SupportSearchPage /> },
      { path: '/supports/:programId', element: <SupportListPage /> },
      { path: '/supports/:programId/apply', element: <SupportApplyPage /> },
      { path: '/supports/:programId/status', element: <SupportStatusPage /> },

      { path: '/applications', element: <ApplicationListPage /> },
      { path: '/funding', element: <FundingPage /> },
      { path: '/repayments', element: <RepaymentPage /> },

      { path: '/mypage', element: <MyPage /> },
      { path: '/mypage/accounts', element: <AccountsPage /> },
      { path: '/bookmarks', element: <BookmarkPage /> },

      { path: '/_gallery', element: <GalleryPage /> },
      { path: '/funds', element: <Navigate to="/loans" replace /> },
    ],
  },
])
