import type { Business, DepositAccount, Insurance, Notification, User } from '@/types'

export const mockUser: User = {
  name: '김사장',
  email: 'sajang@example.com',
  role: 'owner',
  notifyNewNotice: true,
}

export const mockPreUser: User = {
  name: '이사장',
  email: 'pre@example.com',
  role: 'pre',
  notifyNewNotice: true,
}

export const mockBusiness: Business = {
  storeName: '한상차림',
  regNo: '123-45-67890',
  owner: '김사장',
  type: '개인사업자·일반과세자',
  industry: '음식점업 (한식)',
  address: '대구광역시 북구 산격동',
  openedAt: '2023-04-10',
}

export const mockDepositAccounts: DepositAccount[] = [
  {
    id: 'a1',
    bank: '대구은행',
    masked: '****-3412',
    label: '사업자 입출금·주거래',
    balance: 12_400_000,
    isWithdraw: true,
    autoTransfer: true,
  },
  { id: 'a2', bank: '국민은행', masked: '****-2251', label: '사업자 입출금', balance: 6_100_000 },
  { id: 'a3', bank: '대구은행', masked: '****-8907', label: '개인 입출금', balance: 3_200_000 },
]

export const mockInsurances: Insurance[] = [
  {
    id: 'i1',
    name: '화재배상책임보험',
    law: '다중이용업소법',
    status: 'joined',
    description:
      '다중이용업소의 화재로 타인의 생명·신체·재산에 피해가 발생했을 때 배상하는 보험이에요. 음식점 등 다중이용업소는 의무 가입 대상입니다.',
  },
  {
    id: 'i2',
    name: '가스사고배상책임보험',
    law: '액화석유가스법',
    status: 'required',
    description:
      'LPG 등 가스 사용 중 발생한 사고로 타인에게 피해를 준 경우 배상하는 보험이에요. 가스 사용 음식점은 가입 의무가 있습니다.',
  },
]

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    title: '새 공고 · 대구 소상공인 이자 지원',
    body: '신청 가능 대상이에요 · ~ 10. 4 마감',
    time: '10분 전',
    read: false,
  },
  {
    id: 'n2',
    title: '상환일 안내',
    body: '9. 15 자동이체 출금 예정 · 89만 원',
    time: '2시간 전',
    read: false,
  },
  {
    id: 'n3',
    title: '서류 반려',
    body: '등기부등본 재업로드가 필요해요',
    time: '어제',
    read: true,
  },
  {
    id: 'n4',
    title: '심사 상태 변경',
    body: '일반경영안정자금 · 서류 심사 > 승인',
    time: '8. 29',
    read: true,
  },
  {
    id: 'n5',
    title: '대출금 입금 완료',
    body: '소진공 일반경영안정자금 3,000만 원 입금',
    time: '8. 29',
    read: true,
  },
  {
    id: 'n6',
    title: '마이데이터 갱신 완료',
    body: '금융 거래 정보 4개 기관 · 신용 정보 갱신',
    time: '8. 28',
    read: true,
  },
  {
    id: 'n7',
    title: '새 공고 · 소상공인 온라인 판로 지원',
    body: '신청 가능 대상이에요 · ~ 10. 18 마감',
    time: '8. 27',
    read: true,
  },
  {
    id: 'n8',
    title: '지원금 지급 완료',
    body: '스마트상점 기술보급 500만 원 지급',
    time: '8. 26',
    read: true,
  },
  {
    id: 'n9',
    title: '의무보험 안내',
    body: '가스사고배상책임보험이 미가입 상태예요',
    time: '8. 25',
    read: true,
  },
  {
    id: 'n10',
    title: '신청 반려',
    body: '지역 상권 활성화 지원 · 상인회 미가입',
    time: '8. 22',
    read: true,
  },
  {
    id: 'n11',
    title: '자금 조합 추천 갱신',
    body: '이자 최소 조합이 연 3.3%로 개선됐어요',
    time: '8. 20',
    read: true,
  },
  {
    id: 'n12',
    title: '금리 인하 요구 가능',
    body: '매출 5개월 연속 상승 · 승인 가능성 높음',
    time: '8. 18',
    read: true,
  },
]
