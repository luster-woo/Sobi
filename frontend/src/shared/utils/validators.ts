import {
  AUTH_CODE_REGEX,
  BIZ_NO_DIGITS_REGEX,
  BIZ_NO_REGEX,
  EMAIL_REGEX,
  ISO_DATE_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PHONE_DIGITS_REGEX,
  PHONE_REGEX,
  VALIDATION_MESSAGE,
} from '@/shared/constants/validation'

/**
 * 폼 검증 함수.
 *
 * 규약: 통과하면 null, 실패하면 에러 메시지 문자열을 반환합니다.
 * 반환값을 Input 의 error prop 에 그대로 넘길 수 있습니다.
 *   <Input error={validatePassword(pw) ?? undefined} />
 *
 * 서버에 물어봐야 하는 검증(이메일 중복, 인증번호 대조, 국세청 조회)은
 * 순수 함수로 표현할 수 없으므로 여기 두지 않고 화면의 상태로 관리합니다.
 */

/** 빈 값 검사. 필수 항목 앞단에 공통으로 씁니다. */
export function validateRequired(value: string): string | null {
  if (!value.trim()) return VALIDATION_MESSAGE.required
  return null
}

/** 형식만 검사합니다. 중복 여부는 서버 확인 결과를 화면에서 따로 관리하세요. */
export function validateEmail(value: string): string | null {
  if (!value.trim()) return VALIDATION_MESSAGE.required
  if (!EMAIL_REGEX.test(value)) return VALIDATION_MESSAGE.emailFormat
  return null
}

/** 백엔드 `@Size(min = 8, max = 20)` + 조합 규칙과 같다 */
export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) return VALIDATION_MESSAGE.passwordTooShort
  if (value.length > PASSWORD_MAX_LENGTH) return VALIDATION_MESSAGE.passwordTooLong
  if (!PASSWORD_REGEX.test(value)) return VALIDATION_MESSAGE.passwordWeak
  return null
}

export function validatePasswordConfirm(value: string, password: string): string | null {
  if (value !== password) return VALIDATION_MESSAGE.passwordMismatch
  return null
}

/** 하이픈이 있어도 없어도(10자리) 통과합니다. 표시용 변환은 formatBizNo 를 쓰세요. */
export function validateBizNo(value: string): string | null {
  if (!value.trim()) return VALIDATION_MESSAGE.required
  if (!BIZ_NO_REGEX.test(value) && !BIZ_NO_DIGITS_REGEX.test(value)) {
    return VALIDATION_MESSAGE.bizNoFormat
  }
  return null
}

export function validateAuthCode(value: string): string | null {
  if (!AUTH_CODE_REGEX.test(value)) return VALIDATION_MESSAGE.authCodeFormat
  return null
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) return VALIDATION_MESSAGE.required
  if (!PHONE_REGEX.test(value) && !PHONE_DIGITS_REGEX.test(value)) {
    return VALIDATION_MESSAGE.phoneFormat
  }
  return null
}

/** 개업연월일 — 형식 + 오늘 이전 */
export function validateOpenedAt(value: string): string | null {
  if (!value.trim()) return VALIDATION_MESSAGE.required
  if (!ISO_DATE_REGEX.test(value)) return VALIDATION_MESSAGE.dateFormat

  const input = new Date(`${value}T00:00:00`)
  if (Number.isNaN(input.getTime())) return VALIDATION_MESSAGE.dateFormat

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (input > today) return VALIDATION_MESSAGE.dateFuture

  return null
}

/**
 * 비밀번호 보안 강도 (0~4).
 * 05 비밀번호 변경 화면의 강도 바에 사용합니다. 검증과 별개로 표시용입니다.
 */
export function getPasswordStrength(value: string): number {
  let score = 0
  if (value.length >= PASSWORD_MIN_LENGTH) score += 1
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  if (value.length >= 12) score += 1
  return score
}
