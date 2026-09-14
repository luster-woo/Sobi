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
/** 백엔드 `@Size(max = 20)`. 넘기면 서버가 COMMON_001 만 주고 어느 칸인지 안 알려준다 */
export const PASSWORD_MAX_LENGTH = 20

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
  /** 비밀번호 재설정에서 가입되지 않은 주소를 넣었을 때 */
  emailNotRegistered: '가입되지 않은 이메일이에요.',
  /**
   * resetToken 이 만료됐거나 이미 쓰였을 때(AUTH_011).
   *
   * 서버가 1회용으로 지우기 때문에 같은 토큰으로는 재시도가 안 된다 —
   * 인증번호부터 다시 받아야 한다.
   */
  resetSessionExpired: '인증이 만료됐어요. 인증번호를 다시 받아주세요.',
  /**
   * 로그인 실패(AUTH_009). 어느 칸이 틀렸는지 알려주지 않는다 — 서버가 계정 존재
   * 여부·소셜 계정 여부를 전부 이 하나로 뭉친다. 폼 아래 한 줄로 붙인다.
   */
  loginFailed: '이메일 또는 비밀번호가 올바르지 않아요.',
  /** 인증번호 재발송 1분 쿨다운. 남은 시간은 서버가 주지 않는다 */
  emailSendCooldown: '잠시 후 다시 시도해 주세요.',

  passwordTooShort: '8자 이상 입력해 주세요.',
  passwordTooLong: '20자 이하로 입력해 주세요.',
  passwordWeak: '영문·숫자·특수문자를 조합해 주세요.',
  passwordMismatch: '비밀번호가 일치하지 않아요',
  passwordMatched: '비밀번호가 일치해요',

  bizNoFormat: '000-00-00000 형식으로 입력해 주세요.',

  authCodeFormat: '인증번호 6자리를 입력해 주세요.',
  authCodeInvalid: '인증번호가 올바르지 않아요.',
  /**
   * 가입 요청 시 서버 쪽 인증 기록이 없을 때(AUTH_006). 인증은 통과했는데 시간이 지나
   * 기록이 사라진 경우라 "인증을 완료하라" 보다 "다시 받으라" 가 맞다.
   */
  authCodeRecordExpired: '인증 정보가 만료됐어요. 인증번호를 다시 받아주세요.',
  /** 인증번호 유효시간이 지났을 때. 다시 받으면 된다 */
  authCodeExpired: '인증 시간이 지났어요. 코드를 다시 받아주세요.',
  /**
   * 비밀번호 재설정에서 AUTH_003 을 받았을 때.
   *
   * 발송 전에 가입 여부를 확인하므로 여기 오는 AUTH_003 은 대부분 진짜 만료다.
   * 다만 발송 사이에 탈퇴한 계정도 같은 코드로 오니 단정하지 않는 문구로 둔다.
   */
  authCodeInvalidOrExpired: '인증번호가 올바르지 않거나 만료됐어요.',

  phoneFormat: '010-0000-0000 형식으로 입력해 주세요.',

  dateFormat: 'YYYY-MM-DD 형식으로 입력해 주세요.',
  dateFuture: '오늘 이전 날짜를 입력해 주세요.',
} as const
