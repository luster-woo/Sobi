import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/** `POST /business/verify` 요청. 백엔드 `VerifyRequest` 와 1:1 이다 */
export interface BizVerifyRequest {
  /** 하이픈 없는 10자리. 백엔드 `verify.brn` 이 숫자만 저장한다 */
  brn: string
  /** 대표자명. 화면 라벨과 달리 백엔드 필드명은 `name` 이다 */
  name: string
  /** 'YYYY-MM-DD'. `LocalDate` 로 역직렬화된다 */
  openDate: string
}

/** `POST /business/verify` 응답. 백엔드 `VerifyResponse` 와 1:1 이다 */
export interface BizVerifyData {
  /** 사업자 유형. `verify.type` — '개인사업자' 등 */
  type: string
  /** 업종명. 백엔드가 `verify.business_code_name` 을 이 이름으로 내려준다 */
  businessType: string
  businessName: string
  address: string
  /** `LocalDate` 직렬화 결과라 'YYYY-MM-DD' */
  openDate: string
  /** 휴·폐업 여부. `verify.is_close`(NOT NULL) */
  isClose: boolean
}

/**
 * 국세청 사업자 진위확인.
 *
 * 실패는 두 갈래다 — 404 BUSINESS_001(번호 없음) · 400 BUSINESS_002(대표자명·개업일 불일치).
 * 어느 쪽인지 알려줘야 사용자가 무엇을 고칠지 알 수 있어 여기서 삼키지 않고 그대로 던진다.
 *
 * 휴·폐업(`isClose`)은 실패가 아니라 200 으로 온다. 판단은 화면이 한다.
 */
export async function verifyBusiness(body: BizVerifyRequest) {
  const { data } = await api.post<BizVerifyData>(endpoints.business.verify, body)
  return data
}
