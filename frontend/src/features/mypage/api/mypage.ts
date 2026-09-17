import type {
  AccountSummary,
  DepositAccount,
  MyBusinessInfo,
  MyDataStatus,
  MyPageData,
} from '@/features/mypage/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { AuthProvider, ISODate, ISODateTime, UserRole } from '@/shared/types'
import { AUTH_PROVIDER, USER_ROLE } from '@/shared/types'

/**
 * `GET /user/mypage` 응답. 백엔드 명세와 1:1 이다.
 *
 * `GET /user/me` 와 다른 엔드포인트다. 저쪽은 세션 복구용이라 여섯 필드뿐이고
 * (`UserMeResponse`), 이쪽은 사업자 정보·마이데이터·계좌를 한 번에 모아 준다.
 *
 * ⚠️ 표기가 섞여 있다. `business_name` · `business_type` 만 snake_case 고 나머지는
 *    아니다. 명세가 그렇게 적혀 있어 그대로 받고, 아래 변환 함수에서 정리한다.
 */
interface MyBusinessInfoResponse {
  business_name: string
  /** 하이픈 포함 '123-45-67890' */
  bsn: string
  /** 대표자명. `GET /business/me` 의 같은 이름 필드와 뜻이 다르다 */
  name: string
  business_type: string
  address: string
  openDate: ISODate
}

interface MyDataResponse {
  creditRating: string | null
  /** 마지막 수집 시각 */
  createdAt: ISODateTime
}

interface WithdrawAccountResponse {
  bankName: string
  accountNo: string
  /** 잔액(원) */
  balance: number
}

interface LinkedAccountResponse {
  balanceSum: number
  loanSum: number
  /** 계좌 수. 기관 수가 아니다 */
  accountNum: number
}

interface MyPageResponse {
  name: string
  email: string
  role: string
  provider: string
  notification: boolean
  businessInfo: MyBusinessInfoResponse | null
  myData: MyDataResponse | null
  withdrawAccount: WithdrawAccountResponse[] | null
  linkedAccount: LinkedAccountResponse | null
}

/**
 * role 문자열을 좁힌다.
 *
 * 명세 예시에는 한글 `"사업자"` 로 적혀 있었지만 enum 으로 내려주기로 했다. 그래도
 * 모르는 값이 오면 예비창업자로 본다 — `isPreOwner` 와 같은 판단이다(사업자가
 * 아니면 전부 예비창업자). 잘못 사업자로 보면 없는 업체 정보를 그리려다 빈 화면이 된다.
 */
function toUserRole(raw: string): UserRole {
  return raw === USER_ROLE.ENTREPRENEUR ? USER_ROLE.ENTREPRENEUR : USER_ROLE.PREENTREPRENEUR
}

/** 모르는 값은 LOCAL 로 본다. 소셜 가입자에게 비밀번호 변경을 잘못 열어주면 AUTH_017 로 막힌다 */
function toProvider(raw: string): AuthProvider {
  return raw === AUTH_PROVIDER.GOOGLE ? AUTH_PROVIDER.GOOGLE : AUTH_PROVIDER.LOCAL
}

function toBusinessInfo(raw: MyBusinessInfoResponse | null): MyBusinessInfo | null {
  if (!raw) return null

  return {
    businessName: raw.business_name,
    brn: raw.bsn,
    ownerName: raw.name,
    industryName: raw.business_type,
    address: raw.address,
    openDate: raw.openDate,
  }
}

function toMyDataStatus(raw: MyDataResponse | null): MyDataStatus | null {
  if (!raw) return null

  return { creditRating: raw.creditRating, linkedAt: raw.createdAt }
}

function toAccountSummary(raw: LinkedAccountResponse | null): AccountSummary | null {
  if (!raw) return null

  return {
    totalBalance: raw.balanceSum,
    totalLoanBalance: raw.loanSum,
    accountCount: raw.accountNum,
  }
}

/** 연동 전이면 배열 자체가 null 이다. 화면은 '없음' 과 '빈 목록' 을 같게 그린다 */
function toDeposits(raw: WithdrawAccountResponse[] | null): DepositAccount[] {
  return raw ?? []
}

/**
 * 마이페이지 조회.
 *
 * 마이페이지·연동 계좌 화면이 이 하나로 돈다. 사업자 정보·마이데이터·계좌가 전부
 * 여기 실려서 화면마다 따로 부를 것이 없다.
 */
export async function getMyPage(): Promise<MyPageData> {
  const { data } = await api.get<MyPageResponse>(endpoints.user.mypage)

  return {
    profile: {
      name: data.name,
      email: data.email,
      role: toUserRole(data.role),
      provider: toProvider(data.provider),
    },
    business: toBusinessInfo(data.businessInfo),
    myData: toMyDataStatus(data.myData),
    accountSummary: toAccountSummary(data.linkedAccount),
    deposits: toDeposits(data.withdrawAccount),
    notification: data.notification,
  }
}
