/**
 * OCR 이 서류마다 무엇을 대조하는지.
 *
 * 근거는 AI 서버의 규칙표(`ai/app/ocr/rules.py` 의 RULES · classify)다. 서버는 항목별
 * 결과(checks)를 받지만 백엔드가 버리고 status·message 만 저장해서, 화면은 서류명으로
 * 항목을 다시 고른다. 규칙표가 바뀌면 여기도 같이 고친다.
 *
 * ⚠️ 판정 여부(WARN·SKIP)까지는 옮기지 않았다. 대조는 하지만 불일치해도 통과시키는
 *    항목(상호·주소·개업일)도 목록에 넣는다 — '읽고 대조한다' 는 사실은 같다.
 */

export type OcrCheckKey =
  | 'readable'
  | 'docTitle'
  | 'brn'
  | 'ownerName'
  | 'accountHolder'
  | 'personName'
  | 'birthDate'
  | 'validity'
  | 'businessFields'
  | 'openDate'

export const OCR_CHECK_LABEL: Record<OcrCheckKey, string> = {
  readable: '판독',
  docTitle: '서류 종류',
  brn: '사업자번호',
  ownerName: '대표자명',
  accountHolder: '예금주',
  personName: '본인 이름',
  birthDate: '생년월일',
  validity: '유효기간',
  businessFields: '상호·주소',
  openDate: '개업일',
}

const BUSINESS_REGISTRATION: OcrCheckKey[] = [
  'readable',
  'docTitle',
  'brn',
  'ownerName',
  'businessFields',
  'openDate',
]
const BUSINESS_CERTIFICATE: OcrCheckKey[] = [...BUSINESS_REGISTRATION, 'validity']
const VAT: OcrCheckKey[] = [
  'readable',
  'docTitle',
  'brn',
  'ownerName',
  'validity',
  'businessFields',
]
const NATIONAL_TAX: OcrCheckKey[] = ['readable', 'docTitle', 'brn', 'validity', 'businessFields']
const LOCAL_TAX: OcrCheckKey[] = [
  'readable',
  'docTitle',
  'brn',
  'ownerName',
  'birthDate',
  'validity',
  'businessFields',
]
const PERSONAL: OcrCheckKey[] = ['readable', 'docTitle', 'personName', 'birthDate', 'validity']
/** 신분증은 발급일이 유효성과 무관해서 유효기간을 보지 않는다 */
const ID_CARD: OcrCheckKey[] = ['readable', 'docTitle', 'personName', 'birthDate']
const BANKBOOK: OcrCheckKey[] = ['readable', 'docTitle', 'accountHolder']
const LEASE: OcrCheckKey[] = ['readable', 'docTitle', 'personName']
const THIRD_PARTY: OcrCheckKey[] = ['readable']
const DEFAULT: OcrCheckKey[] = ['readable', 'brn']

const THIRD_PARTY_WORDS = ['외주', '거래처', '광고주', '설치업체', '철거업체', '근로자', '직원']
const TAX_WORDS = ['납세', '완납', '납부증명', '납입증명']

/** 규칙표의 classify 순서를 따른다. 앞에서 걸리면 뒤는 보지 않는다 */
export function ocrChecksFor(documentName: string): OcrCheckKey[] {
  const n = documentName.replace(/\s/g, '')

  if (THIRD_PARTY_WORDS.some((w) => n.replace('상시근로자', '').includes(w))) return THIRD_PARTY

  if (n.includes('세') && TAX_WORDS.some((w) => n.includes(w))) {
    const local = n.includes('지방세')
    const national = n.includes('국세') || n.startsWith('국·')
    return local && !national ? LOCAL_TAX : NATIONAL_TAX
  }

  if (n.includes('사업자등록증명') || n.includes('사업자증명')) return BUSINESS_CERTIFICATE
  if (n.includes('사업자등록증')) return BUSINESS_REGISTRATION
  if (!n.includes('매출') && n.includes('부가') && (n.includes('과세') || n.includes('증명'))) {
    return VAT
  }
  if (n.includes('소상공인확인') || (n.includes('중소기업') && n.includes('확인'))) return VAT
  if (n.includes('통장')) return BANKBOOK
  // '주민등록증' 이 '주민등록' 에 먼저 걸리지 않게 신분증을 앞에 둔다
  if (['신분증', '운전면허', '주민등록증'].some((w) => n.includes(w))) return ID_CARD
  if (['주민등록', '주민증록', '가족관계', '등초본', '등·초본'].some((w) => n.includes(w))) {
    return PERSONAL
  }
  if (n.includes('임대차') || n.includes('임차계약')) return LEASE

  return DEFAULT
}

/**
 * 실패 문구 → 걸린 항목.
 *
 * AI 의 MESSAGES 문구가 항목마다 고정이라 거꾸로 짚을 수 있다. 모르는 문구(서버 오류
 * 등)면 null 이고, 화면은 어느 항목도 짚지 않고 문구만 보여준다.
 */
const FAILED_MESSAGE_PATTERNS: [string, OcrCheckKey][] = [
  ['읽을 수 없습니다', 'readable'],
  ['파일을 확인할 수 없습니다', 'readable'],
  ['아닌 것 같습니다', 'docTitle'],
  ['사업자등록번호가', 'brn'],
  ['대표자명이', 'ownerName'],
  ['예금주가', 'accountHolder'],
  ['생년월일이', 'birthDate'],
  ['유효기간이 지난', 'validity'],
]

export function failedCheckOf(message: string | null): OcrCheckKey | null {
  if (!message) return null
  return FAILED_MESSAGE_PATTERNS.find(([pattern]) => message.includes(pattern))?.[1] ?? null
}
