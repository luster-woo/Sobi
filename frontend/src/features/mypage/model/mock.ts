import type { LinkedAccountsData, MyPageData } from '@/features/mypage/model/types'
import { AUTH_PROVIDER } from '@/shared/types'

/**
 * 마이페이지 목 데이터. 리디자인 시안 18 · 18-3 의 값을 옮겼다.
 *
 * ⚠️ 삭제 대상. `GET /user/me` · 계좌 API 가 붙으면 이 파일을 지우고 useQuery 로
 *    바꾼다. 그때 지울 것이 이 파일 하나로 끝나도록 컴포넌트에는 값을 남기지 않았다.
 *
 * 관심 목록(18-1)은 빠졌다 — `GET /bookmark/me` 가 붙어서 `useBookmarks` 가 대신한다 (368).
 */

const DAY_MS = 86_400_000

function daysFromNow(days: number): string {
  const date = new Date(Date.now() + days * DAY_MS)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** 갱신 시각은 '오늘 14:20' 처럼 시간까지 보여준다 */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString().slice(0, 19)
}

/** 사업자 (김소상). 사업자등록·마이데이터·계좌가 모두 있다 */
export const MOCK_MYPAGE: MyPageData = {
  profile: {
    userId: 1,
    name: '김소상',
    email: 'owner@sogong.com',
    provider: AUTH_PROVIDER.LOCAL,
  },

  business: {
    businessName: '한상차림',
    brn: '123-45-67890',
    ownerName: '김소상',
    industryName: '음식점업 (한식)',
    region: '대구광역시 북구 산격동',
    openDate: '2023-04-10',
  },

  myData: {
    linked: true,
    links: [
      { label: '금융 거래 정보 · 4개 기관', updatedAt: hoursAgo(20) },
      { label: '신용 정보', updatedAt: hoursAgo(20) },
    ],
  },

  accountSummary: {
    totalBalance: 21_700_000,
    totalLoanBalance: 55_200_000,
    accountCount: 4,
    updatedAt: hoursAgo(20),
  },

  payoutAccount: {
    bankName: '대구은행',
    maskedNumber: '****-3412',
    autoTransfer: true,
  },

  notification: true,

  shortcut: {
    applicationInProgress: 1,
    favoriteCount: 4,
    nextRepaymentDate: daysFromNow(13),
  },
}

/**
 * 예비창업자 (박예비).
 *
 * 사업자등록이 없으니 business 가 null 이고, 그러면 마이데이터를 연동할 근거가
 * 없어 계좌도 없다. '연동 전' 이 아니라 '연동할 수 없음' 이다.
 */
export const MOCK_MYPAGE_PRE_OWNER: MyPageData = {
  profile: {
    userId: 2,
    name: '박예비',
    email: 'pre@sogong.com',
    provider: AUTH_PROVIDER.LOCAL,
  },
  business: null,
  myData: { linked: false, links: [] },
  accountSummary: null,
  payoutAccount: null,
  notification: true,
  shortcut: {
    applicationInProgress: 0,
    favoriteCount: 2,
    nextRepaymentDate: null,
  },
}

export const MOCK_LINKED_ACCOUNTS: LinkedAccountsData = {
  updatedAt: hoursAgo(20),
  totalBalance: 21_700_000,
  totalLoanBalance: 55_200_000,
  institutionCount: 4,

  deposits: [
    {
      accountId: 1,
      bankName: '대구은행',
      maskedNumber: '****-3412',
      description: '사업자 입출금 · 주거래',
      balance: 12_400_000,
      isPayout: true,
      autoTransfer: true,
    },
    {
      accountId: 2,
      bankName: '국민은행',
      maskedNumber: '****-2251',
      description: '사업자 입출금',
      balance: 6_100_000,
      isPayout: false,
      autoTransfer: false,
    },
    {
      accountId: 3,
      bankName: '대구은행',
      maskedNumber: '****-8907',
      description: '개인 입출금',
      balance: 3_200_000,
      isPayout: false,
      autoTransfer: false,
    },
  ],

  loans: [
    {
      accountId: 11,
      name: '소진공 일반경영안정자금',
      interestRate: 3.4,
      description: '거치 중 · 첫 상환 10. 15',
      balance: 30_000_000,
    },
    {
      accountId: 12,
      name: '지역신보 보증부 대출',
      interestRate: 4.1,
      description: '36회 중 6회 완료 · 다음 9. 15',
      balance: 25_200_000,
    },
  ],
}
