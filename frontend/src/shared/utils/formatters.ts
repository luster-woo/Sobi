/**
 * 입력값 표시 형식 변환.
 *
 * 검증(validators.ts)과 분리한 이유: 변환은 값을 바꾸고, 검증은 값을 판단합니다.
 * onChange 중에 변환하면 커서 위치가 튀므로 onBlur 시점에 적용하세요.
 *   onBlur={() => setBizNo(formatBizNo(bizNo))}
 */

/** '1234567890' → '123-45-67890' (10자리가 아니면 원본을 그대로 돌려줍니다) */
export function formatBizNo(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 10) return value
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/** '01012345678' → '010-1234-5678' (10~11자리가 아니면 원본 그대로) */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return value
}

/** '20230410' → '2023-04-10' (8자리가 아니면 원본 그대로) */
export function formatIsoDate(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

/** 남은 초 → 'M:SS' (인증번호 타이머 표시용) */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
