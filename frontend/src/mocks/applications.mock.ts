import type { Application, SubmitDocument, WriteDocument } from '@/shared/types'

export const mockApplications: Application[] = [
  {
    id: 'ap-1',
    programId: 'ln-1',
    kind: 'loan',
    name: '소진공 일반경영안정자금',
    amount: 30_000_000,
    appliedAt: '2026-08-21',
    receiptNo: 'SBIZ-2026-08-1042',
    status: 'executed',
    steps: [
      { label: '접수', date: '2026-08-21', done: true },
      { label: '서류 검토', date: '2026-08-24', done: true },
      { label: '승인', date: '2026-08-29', done: true },
      { label: '계좌 입금', date: '2026-09-02', done: false },
    ],
    message: '9. 2에 출금 계좌로 3,000만 원이 입금됐어요, 상환은 10. 15부터 시작돼요.',
  },
  {
    id: 'ap-2',
    programId: 'sp-1',
    kind: 'support',
    name: '소상공인 스마트상점 기술보급',
    amount: 5_000_000,
    appliedAt: '2026-08-18',
    receiptNo: 'SEMAS-2026-08-0311',
    status: 'paid',
    steps: [],
  },
  {
    id: 'ap-3',
    programId: 'sp-4',
    kind: 'support',
    name: '지역 상권 활성화 지원',
    amount: 8_000_000,
    appliedAt: '2026-07-30',
    receiptNo: 'DAEGU-2026-07-0410',
    status: 'rejected',
    steps: [],
  },
  {
    id: 'ap-4',
    programId: 'ln-2',
    kind: 'loan',
    name: '지역신보 보증부 대출',
    amount: 30_000_000,
    appliedAt: '2026-02-20',
    receiptNo: 'DGCG-2026-02-0087',
    status: 'executed',
    steps: [],
  },
]

export const mockLoanSubmitDocs: SubmitDocument[] = [
  { id: 'd1', name: '부가세 과세표준증명원', status: 'passed', detail: '발급일 2026.08. 20·직인 확인·필수 필드 완료', source: '홈택스' },
  { id: 'd2', name: '재무제표', status: 'checking', detail: '서명 / 도장 / 발급 유효기간 / 필수 필드를 확인하고 있어요', source: '홈택스' },
  { id: 'd3', name: '등기부등본', status: 'failed', detail: '인감 도장이 확인되지 않아요. 날인 후 다시 올려주세요.', source: '인터넷등기소' },
  { id: 'd4', name: '국세 납세증명서', status: 'missing', detail: '홈택스·정부24에서 즉시 발급받을 수 있어요', source: '홈택스·정부24' },
]
export const mockLoanWriteDocs: WriteDocument[] = [{ id: 'w1', name: '자금 사용 계획서' }]

export const mockSupportSubmitDocs: SubmitDocument[] = [
  { id: 'd1', name: '사업자등록증명', status: 'passed', detail: '발급일 2026. 08. 22·필수 필드 확인 완료', source: '홈택스' },
  { id: 'd2', name: '부가세 과세표준증명원', status: 'checking', detail: '서명 / 도장 / 발급 유효기간 / 필수 필드를 확인하고 있어요', source: '홈택스' },
  { id: 'd3', name: '국세 납세증명서', status: 'failed', detail: '발급일이 3개월을 초과했어요. 재발급 후 다시 올려주세요.', source: '홈택스·정부24' },
  { id: 'd4', name: '통장 사본', status: 'missing', detail: '바우처 정산 계좌로 등록돼요', source: '직접 준비' },
]
export const mockSupportWriteDocs: WriteDocument[] = [{ id: 'w1', name: '사업계획서' }]
