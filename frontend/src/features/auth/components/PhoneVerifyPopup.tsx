import { useId, useRef, useState } from 'react'

import AuthCodeField from '@/features/auth/components/AuthCodeField'
import { useCountdown } from '@/features/auth/hooks/useCountdown'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'
import Input from '@/shared/ui/Input'
import Modal from '@/shared/ui/Modal'
import { cn } from '@/shared/utils/cn'
import { formatPhone } from '@/shared/utils/formatters'
import { validateAuthCode, validatePhone, validateRequired } from '@/shared/utils/validators'

/** 디자인의 '유효 시간 3:00' */
const CODE_TTL_SECONDS = 180
/** '재전송은 1분 후 가능' */
const RESEND_BLOCK_SECONDS = 60

const STEPS = ['통신사', '약관 동의', '정보 입력'] as const

const MAIN_CARRIERS = [
  { value: 'SKT', label: 'SKT' },
  { value: 'KT', label: 'KT' },
  { value: 'LGU', label: 'LG U+' },
]

/** 알뜰폰은 쓰는 통신망 기준으로 고른다 — 실제 본인확인 팝업과 같은 분류다 */
const MVNO_CARRIERS = [
  { value: 'SKT_MVNO', label: 'SKT 망' },
  { value: 'KT_MVNO', label: 'KT 망' },
  { value: 'LGU_MVNO', label: 'LG U+ 망' },
]

/**
 * 실제 본인확인 팝업이 받는 네 가지 동의. 전부 필수다.
 * 본문은 서버에서 내려오지 않고 화면과 같이 배포된다 — 연출이라 실제 법적 효력은 없다.
 */
const CONSENTS = [
  {
    id: 'privacy',
    label: '개인정보 수집·이용 동의',
    body: `1. 수집 항목
이름, 생년월일, 성별, 내·외국인 구분, 통신사, 휴대폰 번호, 인증 일시

2. 수집·이용 목적
휴대폰 명의자 본인확인, 마이데이터 전송요구 자격 확인, 부정 이용 방지

3. 보유 및 이용 기간
본인확인 절차가 끝나면 즉시 파기합니다. 인증 이력(성공 여부·일시)은 분쟁 대응을 위해 6개월간 보관합니다.

4. 동의를 거부할 권리
동의를 거부할 수 있습니다. 다만 거부하면 본인확인을 진행할 수 없어 마이데이터 연동과 자격 판정 기능을 이용할 수 없습니다.`,
  },
  {
    id: 'unique',
    label: '고유식별정보 처리 동의',
    body: `1. 처리하는 고유식별정보
주민등록번호 앞 7자리 (생년월일 6자리 + 뒷자리 첫 자리)

2. 처리 목적
동명이인 구분 및 명의자 본인 여부 확인

3. 처리 방식
주민등록번호 뒷자리 나머지 여섯 자리는 입력받지 않으며 저장하지 않습니다. 앞 7자리는 본인확인 요청 시점에만 사용하고 절차 종료와 함께 파기합니다.

4. 동의를 거부할 권리
동의를 거부할 수 있으나, 거부 시 본인확인이 불가능합니다.`,
  },
  {
    id: 'carrier',
    label: '통신사 이용약관 동의',
    body: `1. 통신사에 제공하는 정보
이름, 생년월일, 성별, 내·외국인 구분, 휴대폰 번호

2. 제공받는 자
SK텔레콤, KT, LG유플러스 및 해당 통신망을 사용하는 알뜰폰 사업자 중 이용자가 선택한 통신사

3. 제공 목적
통신사가 보유한 가입자 정보와 대조해 휴대폰 명의자가 본인인지 확인

4. 보유 기간
통신사의 본인확인 서비스 정책에 따릅니다.

5. 유의 사항
법인 명의 휴대폰, 선불폰, 개통 후 일정 기간이 지나지 않은 번호는 본인확인이 제한될 수 있습니다.`,
  },
  {
    id: 'service',
    label: '본인확인 서비스 이용약관 동의',
    body: `제1조 (목적)
이 약관은 본인확인 서비스의 이용 조건과 절차, 이용자와 사업자의 권리·의무를 정합니다.

제2조 (서비스의 내용)
휴대폰 문자 인증을 통해 이용자가 본인임을 확인하고, 그 결과를 소상공인 도우미에 전달합니다.

제3조 (인증 결과의 효력)
본인확인 결과는 확인 시점의 통신사 가입자 정보를 기준으로 합니다. 명의 변경·해지 등으로 정보가 달라진 경우 결과가 실제와 다를 수 있습니다.

제4조 (서비스 이용 제한)
동일 명의로 단시간에 반복 요청하거나 부정한 방법으로 인증을 시도하는 경우 이용이 제한될 수 있습니다.

제5조 (면책)
통신사 시스템 장애, 문자 수신 환경 등 사업자의 통제 범위를 벗어난 사유로 인증이 지연되거나 실패한 경우 책임을 지지 않습니다.`,
  },
]

type Errors = Partial<Record<'name' | 'rrn' | 'phone' | 'code', string>>

interface PhoneVerifyPopupProps {
  onClose: () => void
  /** 인증이 끝났을 때. 다음 화면으로 보내는 건 부르는 쪽이 정한다 */
  onVerified: () => void
  /**
   * 부르는 쪽이 `onVerified` 에서 서버 요청을 하고 있는 중.
   *
   * 이 팝업 자체는 서버에 아무것도 보내지 않지만, '인증 완료' 뒤에 업체 등록이
   * 붙으면서 응답을 기다리는 동안 버튼이 멀쩡해 보이면 두 번 눌리게 된다.
   */
  submitting?: boolean
}

function CarrierTile({
  label,
  active,
  onSelect,
}: {
  label: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <label
      className={cn(
        /*
         * 낮은 창에서는 타일을 줄인다. 100px 짜리 두 줄이 팝업 본문의 절반을 먹는다.
         * 가로(xl:)가 아니라 세로 기준이어야 한다 — 1366×660 처럼 넓고 낮은 창이 문제다.
         */
        'text-h3 flex h-16 cursor-pointer items-center justify-center rounded-lg border text-center transition-colors',
        '[@media(min-height:820px)]:text-h2 [@media(min-height:820px)]:h-25',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border-strong bg-surface text-text hover:bg-surface-muted',
      )}
    >
      <input
        type="radio"
        name="carrier"
        value={label}
        checked={active}
        onChange={onSelect}
        className="sr-only"
      />
      {label}
    </label>
  )
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-5 flex items-center justify-center gap-3 [@media(min-height:820px)]:mb-9">
      {STEPS.map((label, index) => {
        const reached = index <= current

        return (
          // flex-1 을 주면 단계들이 창 폭만큼 벌어진다. 내용 폭만 차지하게 두고
          // 부모의 justify-center 가 묶음째 가운데로 보낸다
          <li key={label} className="flex items-center gap-3">
            <span
              className={cn(
                'text-body1 flex size-8.5 shrink-0 items-center justify-center rounded-full font-medium',
                reached ? 'bg-primary text-text-inverse' : 'bg-bg-canvas text-text-muted',
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                'text-h4 truncate',
                index === current ? 'text-text' : 'text-text-muted font-normal',
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  'h-px w-10 [@media(min-height:820px)]:w-20',
                  index < current ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * 휴대폰 본인확인 팝업. **연출 UI 다.**
 *
 * `POST /business/phone` · `/business/phone/verify` 가 보류이고, 실제 문자 발송과 명의
 * 확인은 SMS 게이트웨이·본인확인기관 계약이 필요해 비용 때문에 하지 않기로 했다.
 * `users.phone_number` 도 V3 마이그레이션에서 DROP 돼 저장할 컬럼이 없다.
 * 서버로 나가는 요청이 없고, 인증번호는 6자리 숫자면 통과한다 — 136·138 과 같은 규칙.
 *
 * 실제 본인확인처럼 통신사 → 약관 → 정보 입력 세 단계로 나눴다.
 *
 * ⚠️ 주민등록번호 뒷자리는 **입력받지 않는다.** 첫 자리만 받아 성별·내외국인을 구분하고
 *    나머지 여섯 자리는 자리 표시만 그린다. 실제로 수집하면 고유식별정보라 별도 근거와
 *    암호화 보관 의무가 생기는데, 이 서비스에는 쓸 곳이 없다.
 *
 * ⚠️ 인증 결과를 어디에도 저장하지 않는다. 부모가 조건부 렌더로 띄우므로 닫으면
 *    컴포넌트가 언마운트되고 입력값이 전부 사라진다 — 다시 열면 1단계부터 시작한다.
 */
export default function PhoneVerifyPopup({
  onClose,
  onVerified,
  submitting = false,
}: PhoneVerifyPopupProps) {
  const rrnFrontId = useId()
  const phoneFieldId = useId()
  const rrnBackRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [carrier, setCarrier] = useState('')
  const [agreed, setAgreed] = useState<string[]>([])
  const [name, setName] = useState('')
  const [rrnFront, setRrnFront] = useState('')
  const [rrnBack, setRrnBack] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')

  const [codeSent, setCodeSent] = useState(false)
  const [openConsentId, setOpenConsentId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  const { remaining, running, start, stop } = useCountdown()

  const allAgreed = agreed.length === CONSENTS.length
  const canResend = !running || remaining <= CODE_TTL_SECONDS - RESEND_BLOCK_SECONDS

  const clearError = (field: keyof Errors) =>
    setErrors((previous) => ({ ...previous, [field]: undefined }))

  const validateRrn = () => {
    if (rrnFront.length !== 6) return '생년월일 6자리를 입력해 주세요.'
    if (rrnBack.length !== 1) return '주민등록번호 뒷자리 첫 자리를 입력해 주세요.'

    const month = Number(rrnFront.slice(2, 4))
    const day = Number(rrnFront.slice(4, 6))
    if (month < 1 || month > 12 || day < 1 || day > 31) return '생년월일이 올바르지 않아요.'

    // 1~4 내국인, 5~8 외국인. 0·9 는 1900년대 이전이라 실무에서 거의 없다
    if (!/^[1-8]$/.test(rrnBack)) return '주민등록번호 뒷자리 첫 자리가 올바르지 않아요.'

    return null
  }

  const handleSendCode = () => {
    const next: Errors = {
      name: validateRequired(name) ?? undefined,
      rrn: validateRrn() ?? undefined,
      phone: validatePhone(phone) ?? undefined,
    }

    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    setCodeSent(true)
    setCode('')
    start(CODE_TTL_SECONDS)
  }

  const handleConfirm = () => {
    const codeError = validateAuthCode(code)
    setErrors((previous) => ({ ...previous, code: codeError ?? undefined }))
    if (codeError) return

    stop()
    onVerified()
  }

  const footer = (
    <div className="flex w-full gap-2.5">
      {step > 0 && (
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => setStep(step - 1)}
          className="w-[112px] shrink-0"
        >
          이전
        </Button>
      )}

      {step === 0 && (
        <Button disabled={!carrier} onClick={() => setStep(1)} className="flex-1">
          다음
        </Button>
      )}

      {step === 1 && (
        <Button disabled={!allAgreed} onClick={() => setStep(2)} className="flex-1">
          다음
        </Button>
      )}

      {step === 2 &&
        (codeSent ? (
          <Button loading={submitting} onClick={handleConfirm} className="flex-1">
            인증 완료
          </Button>
        ) : (
          <Button onClick={handleSendCode} className="flex-1">
            인증번호 요청
          </Button>
        ))}
    </div>
  )

  return (
    <Modal
      open
      size="xl"
      title="휴대폰 본인확인"
      description="마이데이터 연동을 위해 명의자 본인 확인이 필요해요."
      onClose={onClose}
      // 인증 도중 오버레이를 잘못 눌러 닫히면 처음부터 다시 해야 한다
      closeOnOverlayClick={false}
      footer={footer}
    >
      {/*
       * 단계마다 내용 길이가 달라 높이가 널뛰면 팝업이 덜컹거리므로 높이를 잡아둔다.
       *
       * min-h 가 아니라 h 다. min-h 면 내용이 짧은 단계는 그만큼 줄어들어 1·2·3 단계
       * 높이가 제각각이 된다(596/565/581 실측).
       *
       * 고정 660px 을 쓰지 않는 이유: 창이 그보다 낮으면 팝업 안에 스크롤이 생긴다.
       * 화면에 남는 높이를 넘지 않는 선에서만 잡는다. 빼는 값은 실측이다 —
       * 오버레이 여백 32 + 머리글 78 + 푸터 83 + 본문 상하 패딩 48 = 241,
       * 여기에 Modal 자체의 max-h(100vh-4rem) 여유 32 를 더해 273px.
       *
       * 약관 전문을 펼치면 그 안(max-h)에서 스크롤되므로 이 높이는 그대로다.
       */}
      <div className="flex h-[min(660px,100vh-273px)] flex-col">
        <StepIndicator current={step} />

        {step === 0 && (
          <div className="flex flex-1 flex-col">
            {/* mb-4 가 최소 간격이다. 아래 안내 상자의 mt-auto 가 남는 자리를 더 벌린다 */}
            <fieldset className="mb-4">
              <legend className="font-heading text-h3 text-text [@media(min-height:820px)]:text-h2">
                가입하신 통신사를 선택해 주세요
              </legend>
              {/* 낮은 창에서는 접는다. 아래 안내 상자가 같은 내용을 더 자세히 말한다 */}
              <p className="text-body1 text-text-secondary mt-2 hidden [@media(min-height:820px)]:block">
                본인 명의의 휴대폰만 인증할 수 있어요.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3 [@media(min-height:820px)]:mt-7 [@media(min-height:820px)]:gap-4">
                {MAIN_CARRIERS.map((option) => (
                  <CarrierTile
                    key={option.value}
                    label={option.label}
                    active={carrier === option.value}
                    onSelect={() => setCarrier(option.value)}
                  />
                ))}
              </div>

              <p className="text-body1 text-text-secondary mt-4 mb-2.5 font-medium [@media(min-height:820px)]:mt-8 [@media(min-height:820px)]:mb-4">
                알뜰폰
              </p>

              <div className="grid grid-cols-3 gap-3 [@media(min-height:820px)]:gap-4">
                {MVNO_CARRIERS.map((option) => (
                  <CarrierTile
                    key={option.value}
                    label={option.label}
                    active={carrier === option.value}
                    onSelect={() => setCarrier(option.value)}
                  />
                ))}
              </div>
            </fieldset>

            {/* mt-auto 로 푸터 구분선 바로 위까지 내린다.
              fieldset 에 flex 를 걸면 legend 처리가 브라우저마다 달라 바깥 div 로 감쌌다 */}
            <div className="bg-surface-muted border-border-subtle mt-auto mb-1 flex gap-3 rounded-lg border px-4 py-3 [@media(min-height:820px)]:gap-3.5 [@media(min-height:820px)]:px-5 [@media(min-height:820px)]:py-4">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="text-text-muted mt-0.5 size-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 7.5h.01" />
              </svg>

              <ul className="text-body2 text-text-secondary space-y-1 [@media(min-height:820px)]:space-y-1.5">
                <li>알뜰폰은 실제 사용 중인 통신망을 골라 주세요.</li>
                <li>법인 명의 휴대폰과 선불폰은 본인확인이 되지 않을 수 있어요.</li>
                <li>입력한 정보는 본인확인 용도로만 쓰이고 따로 저장하지 않아요.</li>
              </ul>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="border-border overflow-hidden rounded-lg border">
            <div className="border-border bg-surface-muted border-b px-5 py-4">
              <Checkbox
                label={<span className="text-h4">전체 동의</span>}
                checked={allAgreed}
                onChange={() => setAgreed(allAgreed ? [] : CONSENTS.map((consent) => consent.id))}
              />
            </div>

            <ul>
              {CONSENTS.map((consent) => {
                const open = openConsentId === consent.id

                return (
                  <li key={consent.id} className="border-border-subtle border-b last:border-b-0">
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <Checkbox
                        className="min-w-0 flex-1"
                        label={
                          <span className="text-body1 flex items-center gap-2">
                            <span className="bg-primary-soft text-primary text-body2 rounded-sm px-2 py-0.5 font-medium">
                              필수
                            </span>
                            {consent.label}
                          </span>
                        }
                        checked={agreed.includes(consent.id)}
                        onChange={() =>
                          setAgreed((previous) =>
                            previous.includes(consent.id)
                              ? previous.filter((value) => value !== consent.id)
                              : [...previous, consent.id],
                          )
                        }
                      />

                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`${consent.label} 전문 ${open ? '접기' : '보기'}`}
                        onClick={() => setOpenConsentId(open ? null : consent.id)}
                        className="text-text-muted hover:text-text text-body2 hover:bg-surface-muted shrink-0 rounded-sm px-3 py-1.5 transition-colors"
                      >
                        {open ? '접기' : '전문 보기'}
                      </button>
                    </div>

                    {/* 본문이 길어 스크롤로 가둔다. 안 그러면 팝업이 화면을 넘어간다 */}
                    {open && (
                      <div className="border-border-subtle bg-surface-muted max-h-[150px] overflow-y-auto border-t px-5 py-4 [@media(min-height:820px)]:max-h-[260px]">
                        <p className="text-body2 text-text-secondary leading-[1.8] whitespace-pre-line">
                          {consent.body}
                        </p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/*
         * 입력칸이 size="xl"(56px)라 낮은 창에서 3단계가 넘친다. size 는 prop 이라
         * 미디어쿼리로 못 바꾸므로 여기서 높이만 눌러준다 — 820px 이상에서는 원래대로.
         */}
        {step === 2 && (
          <div className="contents [@media(max-height:819px)]:[&_input]:h-[46px]">
            <Input
              size="xl"
              label="이름"
              required
              autoComplete="name"
              placeholder="휴대폰 명의자 이름"
              disabled={codeSent}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearError('name')
              }}
              error={errors.name}
            />

            <div className="mt-7">
              <label
                htmlFor={rrnFrontId}
                className="font-heading text-body1 text-text mb-2.5 block font-semibold"
              >
                주민등록번호
                <span className="text-danger ml-0.5">*</span>
              </label>

              <div className="flex items-center gap-2">
                <Input
                  id={rrnFrontId}
                  size="xl"
                  className="min-w-0 flex-1"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  placeholder="생년월일 6자리"
                  disabled={codeSent}
                  value={rrnFront}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '')
                    setRrnFront(digits)
                    clearError('rrn')
                    // 여섯 자리를 채우면 뒷자리로 넘어간다. 실제 팝업이 그렇게 동작한다
                    if (digits.length === 6) rrnBackRef.current?.focus()
                  }}
                />

                <span aria-hidden="true" className="text-text-muted shrink-0">
                  –
                </span>

                <input
                  ref={rrnBackRef}
                  aria-label="주민등록번호 뒷자리 첫 자리"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  disabled={codeSent}
                  value={rrnBack}
                  onChange={(event) => {
                    setRrnBack(event.target.value.replace(/\D/g, ''))
                    clearError('rrn')
                  }}
                  className={cn(
                    'text-h4 text-text border-border-strong bg-surface focus:border-primary h-14 w-16 shrink-0 rounded-sm border text-center transition-colors',
                    'disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed',
                  )}
                />

                {/* 뒷자리 나머지는 받지 않는다. 자리만 표시한다 */}
                <span
                  aria-hidden="true"
                  className="text-text-disabled shrink-0 text-[26px] tracking-[0.25em] select-none"
                >
                  ●●●●●●
                </span>
              </div>

              {errors.rrn ? (
                <p className="text-body2 text-danger mt-2.5">{errors.rrn}</p>
              ) : (
                <p className="text-body2 text-text-muted mt-2.5">
                  뒷자리는 첫 자리만 입력해요. 나머지는 수집하지 않습니다.
                </p>
              )}
            </div>

            <div className="mt-7">
              <label
                htmlFor={phoneFieldId}
                className="font-heading text-body1 text-text mb-2.5 block font-semibold"
              >
                휴대폰 번호
                <span className="text-danger ml-0.5">*</span>
              </label>

              <Input
                id={phoneFieldId}
                size="xl"
                inputMode="tel"
                autoComplete="tel"
                placeholder="숫자만 입력"
                disabled={codeSent}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  clearError('phone')
                }}
                onBlur={() => setPhone(formatPhone(phone))}
                error={errors.phone}
              />
            </div>

            {codeSent && (
              <>
                <div className="bg-primary-soft mt-5 flex flex-wrap items-center justify-between gap-3 rounded-sm px-3.5 py-2.5">
                  <span className="text-body2 text-primary font-medium">
                    인증번호를 보냈어요. 문자를 확인해 주세요
                  </span>
                  <span className="text-caption text-text-muted tabular-nums">
                    {canResend ? '재전송할 수 있어요' : '재전송은 1분 후 가능'}
                  </span>
                </div>

                <AuthCodeField
                  className="mt-3.5"
                  value={code}
                  onChange={(next) => {
                    setCode(next)
                    clearError('code')
                  }}
                  remaining={remaining}
                  actionLabel="재전송"
                  onAction={handleSendCode}
                  actionDisabled={!canResend}
                  error={errors.code}
                />
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
