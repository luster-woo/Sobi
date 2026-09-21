import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { BizVerifyData } from '@/features/auth/api/businessVerify'
import BizVerifyResult from '@/features/auth/components/BizVerifyResult'
import PhoneVerifyPopup from '@/features/auth/components/PhoneVerifyPopup'
import PreOwnerBranchCard from '@/features/auth/components/PreOwnerBranchCard'
import { useBusinessRegister } from '@/features/auth/hooks/useBusinessRegister'
import { useBusinessVerify } from '@/features/auth/hooks/useBusinessVerify'
import { useBusinessSummary } from '@/features/business/hooks/useBusinessSummary'
import { ERROR_CODE, getErrorCode, getErrorMessage, getErrorStatus } from '@/shared/api/errors'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import Button from '@/shared/ui/Button'
import DatePicker from '@/shared/ui/DatePicker'
import Input from '@/shared/ui/Input'
import { formatBizNo } from '@/shared/utils/formatters'
import { validateBizNo, validateOpenedAt, validateRequired } from '@/shared/utils/validators'

type Status = 'idle' | 'success' | 'error'
type Errors = Partial<Record<'brn' | 'ownerName' | 'openDate', string>>

/**
 * 백엔드 `ErrorCode` 의 business 영역. 응답은 `error: { code }` 형태로 온다.
 * 두 실패를 구분해야 사용자에게 뭘 고쳐야 하는지 알려줄 수 있다.
 */
const VERIFY_ERROR = {
  /** BUSINESS_001 · 404 — 사업자등록번호 자체가 국세청에 없다 */
  NOT_FOUND: {
    summary: '등록되지 않은 번호',
    message: '국세청에 등록된 사업자등록번호가 아니에요. 번호를 다시 확인해 주세요.',
  },
  /** BUSINESS_002 · 400 — 번호는 있으나 대표자명·개업연월일이 다르다 */
  MISMATCH: {
    summary: '국세청 정보 불일치',
    message:
      '대표자명 또는 개업연월일이 국세청 등록 정보와 달라요. 값을 확인하고 다시 조회해 주세요.',
  },
} as const

type VerifyErrorKind = keyof typeof VERIFY_ERROR

/**
 * 등록 단계의 500.
 *
 * 서버에 중복 검사가 없어 이미 등록된 번호를 또 보내면 `business_info.brn` 유니크
 * 제약에 걸려 500 이 난다. 진짜 장애와 구분할 코드가 없어서, 이 화면에서 제일 그럴듯한
 * 원인을 먼저 말해준다.
 */
const REGISTER_CONFLICT_MESSAGE =
  '이미 등록된 사업자등록번호이거나 서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'

/** 하이픈을 떼고 보낸다. `verify.brn` 은 숫자 10자리로만 저장돼 있다 */
const toDigits = (value: string) => value.replace(/\D/g, '')

const now = () => new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

export function BusinessVerifyPage() {
  const navigate = useNavigate()
  const showToast = useUiStore((state) => state.showToast)
  const { mutate: verify, isPending } = useBusinessVerify()
  const { mutate: register, isPending: isRegistering } = useBusinessRegister()

  const [brn, setBrn] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [openDate, setOpenDate] = useState('')

  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<BizVerifyData | undefined>()
  const [errorKind, setErrorKind] = useState<VerifyErrorKind>('MISMATCH')
  const [checkedAt, setCheckedAt] = useState<string>()
  const [errors, setErrors] = useState<Errors>({})

  /**
   * 조회에 성공한 사업자등록번호.
   *
   * 조회 결과는 '다시 조회' 를 누를 때까지 남는다. 그 사이 입력칸을 고칠 수 있으므로
   * 등록할 때는 지금 입력값이 아니라 이 값을 보내야 한다 — 아니면 조회하지 않은
   * 번호로 업체가 등록된다. 입력칸과 달리 하이픈이 없는 값이다.
   */
  const [verifiedBrn, setVerifiedBrn] = useState<string | null>(null)

  /** 본인확인 팝업. 실제 본인확인처럼 페이지를 옮기지 않고 이 화면 위에 띄운다 */
  const [identityOpen, setIdentityOpen] = useState(false)

  /**
   * 휴·폐업 사업자는 정책자금 신청 대상이 아니라 사업자로 시작할 수 없다.
   * 재조회 중에도 막는다 — 직전 결과가 화면에 남아 있어 그대로 두면 곧 뒤집힐 값으로 등록된다.
   */
  const canStartAsOwner = status === 'success' && data?.isClose === false && !isPending

  const clearError = (field: keyof Errors) =>
    setErrors((previous) => ({ ...previous, [field]: undefined }))

  /** 직전 조회 결과를 버린다. 남겨두면 지금 입력값과 다른 결과가 화면에 서 있게 된다 */
  const clearResult = () => {
    setStatus('idle')
    setData(undefined)
    setVerifiedBrn(null)
  }

  const handleVerify = () => {
    const next: Errors = {
      brn: validateBizNo(brn) ?? undefined,
      ownerName: validateRequired(ownerName) ?? undefined,
      openDate: validateOpenedAt(openDate) ?? undefined,
    }

    setErrors(next)

    if (Object.values(next).some(Boolean)) {
      clearResult()
      return
    }

    verify(
      { brn: toDigits(brn), name: ownerName, openDate },
      {
        onSuccess: (result) => {
          setStatus('success')
          setData(result)
          setVerifiedBrn(toDigits(brn))
        },
        onError: (error) => {
          clearResult()

          const code = getErrorCode(error)

          /*
           * 결과 상자에는 사용자가 고칠 수 있는 두 실패만 그린다. 그 외(네트워크·5xx·
           * 검증 오류)까지 '인증 실패' 로 보이면 멀쩡한 번호를 의심하게 된다.
           * 인터셉터 토스트는 5xx·네트워크만 잡아서 나머지는 여기서 띄운다.
           */
          if (code !== ERROR_CODE.BUSINESS_NOT_FOUND && code !== ERROR_CODE.BUSINESS_MISMATCH) {
            const httpStatus = getErrorStatus(error)
            if (httpStatus !== undefined && httpStatus < 500) {
              showToast(getErrorMessage(error), 'danger')
            }
            return
          }

          setCheckedAt(now())
          setStatus('error')
          setErrorKind(code === ERROR_CODE.BUSINESS_NOT_FOUND ? 'NOT_FOUND' : 'MISMATCH')
        },
      },
    )
  }

  /**
   * 이미 업체가 등록된 계정인지.
   *
   * ⚠️ **두 번 등록되면 계정을 못 쓰게 된다.** 백엔드 `BusinessServiceImpl.business()`
   *    에 user 당 1건 제약이 없어서, 다른 사업자번호로 등록하면 `business_info` 행이
   *    둘 생긴다. 그러면 `BusinessReporitory.findByUserId` 가 단건을 못 골라
   *    `GET /business/me` 와 `GET /insurance` 가 **영구 500** 이 된다.
   *
   *    같은 번호면 unique 제약(500)에 걸려 되돌릴 수는 있지만, 다른 번호는 되돌릴
   *    방법이 없다. 서버가 막아주지 않으므로 화면에서 먼저 막는다.
   *
   *    토큰 role 로는 판단할 수 없다. 등록 직후 재발급이 실패하면 role 이
   *    PREENTREPRENEUR 로 남은 채 이 화면에 다시 올 수 있고, 그게 정확히 두 번째
   *    등록이 일어나는 경로다 — 서버에 직접 물어본다(`useBusinessSummary`).
   */
  const {
    data: registeredBusiness,
    isLoading: isCheckingBusiness,
    error: businessError,
  } = useBusinessSummary()

  /*
   * 404 는 '미등록' 이라는 정상 응답이라 통과시킨다. 이걸 막으면 정작 등록해야 할
   * 사람이 전부 막힌다. 그 외의 실패(500·타임아웃)는 등록 여부를 모르는 상태라
   * 막는다 — 모르는 채로 보내면 두 번째 업체가 생겨 계정이 영구 500 이 된다.
   */
  const businessUnknown = businessError !== null && getErrorStatus(businessError) !== 404

  const handleStartAsOwner = () => {
    if (verifiedBrn === null || isCheckingBusiness) return

    if (businessUnknown) {
      showToast('등록된 업체가 있는지 확인하지 못했어요. 잠시 후 다시 시도해 주세요.', 'danger')
      return
    }

    if (registeredBusiness) {
      showToast('이미 등록된 업체가 있어요. 변경이 필요하면 문의해 주세요.', 'warning')
      return
    }

    setIdentityOpen(true)
  }

  /**
   * 본인확인을 마친 시점에 업체를 등록한다.
   *
   * 버튼을 누를 때 바로 부르지 않는 이유는 순서다. 본인확인을 중간에 닫으면 등록만
   * 되어 있는 계정이 남고, 같은 번호로 다시 등록하면 유니크 제약에 걸려 500 이 난다.
   *
   * 명세에는 `bsn` 으로 적혀 있지만 실제 `BusinessRequest` 필드는 `brn` 이다.
   */
  const handleIdentityVerified = () => {
    if (verifiedBrn === null) return

    register(verifiedBrn, {
      onSuccess: () => {
        setIdentityOpen(false)
        navigate(ROUTES.MYDATA_CONSENT)
      },
      onError: (error) => {
        /*
         * 팝업은 열어둔다. 인증번호가 그대로 있어 '인증 완료' 를 다시 누르면 재시도된다.
         *
         * 500 은 여기서 직접 띄운다 — 인터셉터의 일반 문구('서버에 문제가 생겼습니다')
         * 보다 `REGISTER_CONFLICT_MESSAGE`(이미 등록된 번호) 가 훨씬 구체적이라, 이
         * 자리에서는 중복이 아깝지 않다. 같은 파일 `handleVerify` 가 5xx 를 거르는 것과
         * 다른 판단이고, 그 이유가 이것이다.
         */
        showToast(getErrorMessage(error, { 500: REGISTER_CONFLICT_MESSAGE }), 'danger')
      },
    })
  }

  /*
   * 가입 흐름이 여기로 보내려고 남겨둔 예약을 거둔다. 도착했으니 볼일이 끝났다.
   *
   * 안 지우면 나중에 로그아웃 없이 로그인 화면이나 랜딩에 들렀을 때 PublicOnlyRoute 가
   * 대시보드 대신 여기로 또 보낸다. 이미 인증을 마친 사람에게는 엉뚱한 화면이다.
   */
  const setPostAuthRedirect = useAuthStore((s) => s.setPostAuthRedirect)

  useEffect(() => {
    setPostAuthRedirect(null)
  }, [setPostAuthRedirect])

  const handleStartAsPreOwner = () => {
    // 업체를 등록하지 않는 것이 곧 예비 창업자다. 호출할 API 가 없다
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <>
      {/*
       * 제목과 설명을 한 줄로 합쳤다. 설명이 하던 말('세 가지가 일치해야 한다')은
       * 바로 아래 필수 표시 세 개가 이미 하고 있어서, 따로 두면 45px 을 쓰고
       * 같은 말을 반복한다.
       */}
      <h1 className="font-heading text-text mb-4 text-[20px] font-bold tracking-[-0.02em]">
        사업자 인증 정보를 입력해 주세요
      </h1>

      <div className="border-border bg-surface w-full max-w-[560px] rounded-md border px-7 py-5">
        <Input
          label="사업자등록번호"
          required
          inputMode="numeric"
          placeholder="숫자 10자리"
          className="tabular-nums"
          value={brn}
          // 조회 결과는 여기서 지우지 않는다. '다시 조회' 를 누를 때까지 남긴다
          onChange={(event) => {
            setBrn(event.target.value)
            clearError('brn')
          }}
          // 입력 중에 변환하면 커서가 튄다. 포커스가 빠질 때만 형식을 맞춘다
          onBlur={() => setBrn(formatBizNo(brn))}
          error={errors.brn}
        />

        <div className="mt-3.5 grid grid-cols-2 gap-3.5">
          <Input
            label="대표자명"
            required
            placeholder="사업자등록증상 대표자명"
            value={ownerName}
            onChange={(event) => {
              setOwnerName(event.target.value)
              clearError('ownerName')
            }}
            error={errors.ownerName}
          />

          <DatePicker
            label="개업연월일"
            required
            value={openDate}
            onChange={(next) => {
              setOpenDate(next)
              clearError('openDate')
            }}
            error={errors.openDate}
          />
        </div>

        {/*
         * 상태가 바뀌어도 이 아래 요소들이 제자리에 있어야 한다. 조회 버튼을 숨겼다
         * 보였다 하면 결과 상자와 시작 버튼이 42px 씩 위아래로 튄다.
         * 항상 그리고 문구만 바꾼다.
         */}
        <Button
          variant={status === 'idle' ? 'primary' : 'outline'}
          loading={isPending}
          onClick={handleVerify}
          className="mt-3.5 w-full"
        >
          {status === 'idle' ? '사업자 인증' : '다시 조회'}
        </Button>

        <BizVerifyResult
          className="mt-3.5"
          status={status}
          data={data}
          checkedAt={checkedAt}
          errorSummary={VERIFY_ERROR[errorKind].summary}
          errorMessage={VERIFY_ERROR[errorKind].message}
        />

        {/* 등록 여부를 아직 모르는 동안 누르면 가드가 통과해 버린다 */}
        <Button
          disabled={!canStartAsOwner || isCheckingBusiness || businessUnknown}
          onClick={handleStartAsOwner}
          className="mt-3.5 w-full"
        >
          사업자로 시작하기
        </Button>

        <PreOwnerBranchCard variant="inline" onStart={handleStartAsPreOwner} />
      </div>

      {/* 조건부 렌더라 닫으면 언마운트된다 — 다시 열면 1단계부터 시작한다 */}
      {identityOpen && (
        <PhoneVerifyPopup
          onClose={() => setIdentityOpen(false)}
          onVerified={handleIdentityVerified}
          submitting={isRegistering}
        />
      )}
    </>
  )
}
