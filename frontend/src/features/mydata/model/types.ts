/** `POST /mydata/link` · `/mydata/refresh` 응답. 백엔드 `MydataLinkResponse` 와 1:1 */
export interface MydataLinkResult {
  totalCount: number
  eligibleCount: number
  /** 판정 근거가 부족해 보류된 건. 자격 없음과 다르다 */
  unknownCount: number
  ineligibleCount: number
}
