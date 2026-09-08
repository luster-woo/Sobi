/**
 * 폼 검증에 쓰는 값(정규식·에러 문구)을 모아둡니다.
 *
 * 검증 "동작"은 utils/validators.ts, 입력값 "변환"은 utils/formatters.ts 에 있습니다.
 * 규칙을 바꿀 때는 이 파일만 수정하면 됩니다. 화면에 정규식을 직접 쓰지 마세요.
 */

/** 000-00-00000 */
export const BIZ_NO_REGEX = /^\d{3}-\d{2}-\d{5}$/

/** 하이픈 없이 10자리로 입력한 경우도 허용합니다 (formatBizNo 로 변환) */
export const BIZ_NO_DIGITS_REGEX = /^\d{10}$/

/** 영문·숫자·특수문자를 각각 1개 이상 포함 */
export const PASSWORD_REGEX = /(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])/

export const PASSWORD_MIN_LENGTH = 8

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 숫자 6자리 */
export const AUTH_CODE_REGEX = /^\d{6}$/

/** 010-0000-0000 (011·016·017·018·019 포함) */
export const PHONE_REGEX = /^01[016789]-\d{3,4}-\d{4}$/

/** 하이픈 없이 입력한 경우도 허용합니다 (formatPhone 으로 변환) */
export const PHONE_DIGITS_REGEX = /^01[016789]\d{7,8}$/

/** YYYY-MM-DD */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const VALIDATION_MESSAGE = {
  required: '필수 입력 항목이에요.',

  emailFormat: '이메일 형식이 올바르지 않아요.',
  emailDuplicated: '이미 사용 중인 이메일이에요.',
  emailNotChecked: '이메일 중복 확인을 해주세요.',

  passwordTooShort: '8자 이상 입력해 주세요.',
  passwordWeak: '영문·숫자·특수문자를 조합해 주세요.',
  passwordMismatch: '비밀번호가 일치하지 않아요',
  passwordMatched: '비밀번호가 일치해요',

  bizNoFormat: '000-00-00000 형식으로 입력해 주세요.',

  authCodeFormat: '인증번호 6자리를 입력해 주세요.',
  authCodeInvalid: '인증번호가 올바르지 않아요.',

  phoneFormat: '010-0000-0000 형식으로 입력해 주세요.',

  dateFormat: 'YYYY-MM-DD 형식으로 입력해 주세요.',
  dateFuture: '오늘 이전 날짜를 입력해 주세요.',
} as const
