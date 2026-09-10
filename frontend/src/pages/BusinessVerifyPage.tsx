import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { BizVerifyData } from '@/features/auth/components/BizVerifyResult'
import BizVerifyResult from '@/features/auth/components/BizVerifyResult'
import PreOwnerBranchCard from '@/features/auth/components/PreOwnerBranchCard'
import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'
import DatePicker from '@/shared/ui/DatePicker'
import Input from '@/shared/ui/Input'
import { formatBizNo } from '@/shared/utils/formatters'
import { validateBizNo, validateOpenedAt, validateRequired } from '@/shared/utils/validators'

/**
 * TODO(139): `POST /business/verify` 가 붙으면 이 블록을 통째로 지운다.
 *
 * `backend/.../db/seed/local/R__verify_dummy.sql` 의 시드 3건을 그대로 옮겼다.
 * 같은 값을 쓰면 API 연결 후에도 동일한 입력으로 동작한다.
 * 마지막 한 건은 시드에 없는 휴·폐업 확인용이라 시드가 추가되면 지워야 한다.
 */
const MOCK_VERIFY: Record<string, { name: string; openDate: string } & BizVerifyData> = {
  '1234567890': {
    name: '박성현',
    type: '개인사업자',
    businessType: '한식음식점',
    businessName: '맛있는 한상',
    address: '서울특별시 강남구 테헤란로 123',
    openDate: '2022-03-15',
    isClose: false,
  },
  '2345678901': {
    name: '황문규',
    type: '개인사업자',
    businessType: '분식전문점',
    businessName: '서울분식',
    address: '서울특별시 마포구 양화로 45',
    openDate: '2021-08-20',
    isClose: false,
  },
  '3456789012': {
    name: '권병수',
    type: '개인사업자',
    businessType: '커피-음료',
    businessName: '카페 하루',
    address: '서울특별시 성동구 성수이로 78',
    openDate: '2023-01-10',
    isClose: false,
  },
  '9999999999': {
    name: '폐업자',
    type: '개인사업자',
    businessType: '한식음식점',
    businessName: '옛날국밥',
    address: '대구광역시 북구 산격동 12',
    openDate: '2019-05-02',
    isClose: true,
  },
}

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
    message: '대표자명 또는 개업연월일이 국세청 등록 정보와 달라요. 값을 확인하고 다시 조회해 주세요.',
  },
} as const

type VerifyErrorKind = keyof typeof VERIFY_ERROR

export function BusinessVerifyPage() {
  const navigate = useNavigate()

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
   * 번호로 업체가 등록된다.
   */
  const [verifiedBrn, setVerifiedBrn] = useState<string | null>(null)

  /** 휴·폐업 사업자는 정책자금 신청 대상이 아니라 사업자로 시작할 수 없다 */
  const canStartAsOwner = status === 'success' && data?.isClose === false

  const clearError = (field: keyof Errors) =>
    setErrors((previous) => ({ ...previous, [field]: undefined }))

  const handleVerify = () => {
    const next: Errors = {
      brn: validateBizNo(brn) ?? undefined,
      ownerName: validateRequired(ownerName) ?? undefined,
      openDate: validateOpenedAt(openDate) ?? undefined,
    }

    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    // TODO(139): POST /business/verify { brn, name: ownerName, openDate }
    //   실패는 error.code 로 갈린다 — BUSINESS_001(404) 번호 없음 / BUSINESS_002(400) 정보 불일치.
    //   아래 목이 그 두 갈래를 그대로 흉내낸다.
    const found = MOCK_VERIFY[brn.replace(/\D/g, '')]

    setCheckedAt(
      new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }),
    )

    if (!found) {
      setStatus('error')
      setErrorKind('NOT_FOUND')
      setData(undefined)
      setVerifiedBrn(null)
      return
    }

    if (found.name !== ownerName || found.openDate !== openDate) {
      setStatus('error')
      setErrorKind('MISMATCH')
      setData(undefined)
      setVerifiedBrn(null)
      return
    }

    setStatus('success')
    setData(found)
    setVerifiedBrn(brn)
  }

  const handleStartAsOwner = () => {
    if (verifiedBrn === null) return

    // TODO(139): POST /business { brn: verifiedBrn } → 성공 시 role 이 ENTREPRENEUR 가 된다.
    //   명세에는 `bsn` 으로 적혀 있지만 실제 `BusinessRequest` 필드는 `brn` 이다
    navigate(ROUTES.MYDATA_IDENTITY)
  }

  const handleStartAsPreOwner = () => {
    // 업체를 등록하지 않는 것이 곧 예비 창업자다. 호출할 API 가 없다
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-text text-[23px] font-bold tracking-[-0.02em]">
          사업자 인증 정보를 입력해 주세요
        </h1>
        <p className="text-body2 text-text-secondary mt-2.5 leading-[1.7]">
          국세청 사업자등록 상태조회로 진위를 확인해요.
          <br />
          사업자등록번호·대표자명·개업연월일 세 가지가 모두 일치해야 인증돼요.
        </p>
      </div>

      <div className="border-border bg-surface w-full max-w-[560px] rounded-md border px-7 pt-6.5 pb-7">
        <Input
          label="사업자등록번호"
          required
          inputMode="numeric"
          placeholder="000-00-00000"
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

        <div className="mt-5 grid grid-cols-2 gap-3.5">
          <Input
            label="대표자명"
            required
            placeholder="홍길동"
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

        {status !== 'error' && (
          <Button
            variant={status === 'success' ? 'outline' : 'primary'}
            onClick={handleVerify}
            className="mt-5 w-full"
          >
            {status === 'success' ? '다시 조회' : '사업자 인증'}
          </Button>
        )}

        <BizVerifyResult
          className="mt-4.5"
          status={status}
          data={data}
          checkedAt={checkedAt}
          errorSummary={VERIFY_ERROR[errorKind].summary}
          errorMessage={VERIFY_ERROR[errorKind].message}
        />

        {status === 'error' ? (
          // 실패했을 때 할 수 있는 건 다시 조회뿐이다. 비활성 버튼을 같이 두면
          // 누를 수 없는 것을 계속 보여주는 셈이라 지웠다
          <Button variant="outline" onClick={handleVerify} className="mt-5.5 w-full">
            다시 조회
          </Button>
        ) : (
          <>
            <Button
              disabled={!canStartAsOwner}
              onClick={handleStartAsOwner}
              className="mt-5.5 w-full"
            >
              사업자로 시작하기
            </Button>

            {/* 휴·폐업이면 사업자로 못 가니 예비 창업자 경로만 남는다 */}
            {!(status === 'success' && data?.isClose) && (
              <PreOwnerBranchCard variant="inline" onStart={handleStartAsPreOwner} />
            )}
          </>
        )}
      </div>

      {status === 'error' && (
        <PreOwnerBranchCard
          variant="panel"
          onStart={handleStartAsPreOwner}
          className="mt-3.5 w-full max-w-[560px]"
        />
      )}

      {status === 'success' && data?.isClose && (
        <PreOwnerBranchCard
          variant="panel"
          onStart={handleStartAsPreOwner}
          title="휴업·폐업 상태예요"
          description="정책자금은 영업 중인 사업자만 신청할 수 있어요. 예비 창업자로 시작할 수 있습니다."
          className="mt-3.5 w-full max-w-[560px]"
        />
      )}
    </>
  )
}
