import { useState } from 'react'

import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { getErrorMessage } from '@/shared/api/errors'
import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import type { EmailCheckResponse } from '@/shared/types'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'
import Input from '@/shared/ui/Input'
import Select from '@/shared/ui/Select'
import { formatBizNo, formatCountdown, formatIsoDate, formatPhone } from '@/shared/utils/formatters'
import {
  getPasswordStrength,
  validateBizNo,
  validateEmail,
  validateOpenedAt,
  validatePassword,
  validatePasswordConfirm,
  validatePhone,
} from '@/shared/utils/validators'

/**
 * S15P21D101-169 확인용 데모.
 *
 * 폼 컴포넌트 4종의 모든 상태와, 검증 전략 4가지 패턴을 실제로 동작시켜 봅니다.
 * 프로덕션 화면이 아니며, 확인 방식(Storybook / 임시 라우트)이 정해지면 정리 대상입니다.
 *
 * 서버 검증(③)은 패턴을 보여주기 위해 여기서 api 를 직접 부르지만, 실제 구현은
 * features/auth 의 api·hooks 로 들어갑니다. shared/ui 는 원래 표현만 담당합니다.
 *
 * 보는 방법: src/main.tsx 에서 App 대신 이 컴포넌트를 렌더 (그 변경은 커밋하지 마세요)
 */

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-border bg-surface p-card space-y-4 rounded-lg border">
      <div>
        <h2 className="text-h3">{title}</h2>
        {hint && <p className="text-body2 text-text-muted mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

const INDUSTRY_OPTIONS = [
  { value: 'food', label: '외식업' },
  { value: 'retail', label: '도소매업' },
  { value: 'service', label: '서비스업' },
]

export default function FormDemo() {
  /* ── ① 기본 필드 — onBlur 검증 ─────────────────── */
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  /* ── ② 필드 간 검증 — onChange 즉시 피드백 ─────── */
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const confirmError = passwordConfirm ? validatePasswordConfirm(passwordConfirm, password) : null

  /* ── ③ 서버 검증 — 버튼 트리거 (MSW) ───────────── */
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailChecked, setEmailChecked] = useState(false)
  const [checking, setChecking] = useState(false)

  const checkEmail = async () => {
    setEmailChecked(false)

    const formatError = validateEmail(email)
    if (formatError) {
      setEmailError(formatError)
      return
    }

    setChecking(true)
    try {
      const { data } = await api.get<EmailCheckResponse>(endpoints.auth.emailCheck, {
        params: { email },
      })
      setEmailChecked(data.available)
      setEmailError(data.available ? null : VALIDATION_MESSAGE.emailDuplicated)
    } catch (error) {
      // 문구는 화면이 정한다는 errors.ts 규칙에 따라 overrides 로 넘깁니다
      setEmailError(getErrorMessage(error, { 400: VALIDATION_MESSAGE.emailFormat }))
    } finally {
      setChecking(false)
    }
  }

  /* ── 그 외 필드 ─────────────────────────────────── */
  const [bizNo, setBizNo] = useState('')
  const [bizNoError, setBizNoError] = useState<string | null>(null)

  const [openedAt, setOpenedAt] = useState('')
  const [openedAtError, setOpenedAtError] = useState<string | null>(null)

  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [industry, setIndustry] = useState('')
  const [agreed, setAgreed] = useState(false)

  /* ── ④ 제출 버튼 — 전체가 유효할 때만 활성화 ───── */
  const canSubmit =
    emailChecked &&
    Boolean(password) &&
    !validatePassword(password) &&
    Boolean(passwordConfirm) &&
    !validatePasswordConfirm(passwordConfirm, password) &&
    agreed

  const strength = getPasswordStrength(password)

  return (
    <div className="bg-bg min-h-screen">
      <div className="gap-section mx-auto flex max-w-[880px] flex-col p-8">
        <header>
          <h1 className="text-h1">폼 컴포넌트 · 검증 전략 확인</h1>
          <p className="text-body1 text-text-secondary mt-2">
            S15P21D101-169 · Button / Input / Select / Checkbox + 검증 규약 4패턴
          </p>
        </header>

        {/* ───────────── Button ───────────── */}
        <Section title="Button — variant" hint="primary · secondary · outline · danger">
          <div className="flex flex-wrap items-center gap-3">
            <Button>사업자 인증</Button>
            <Button variant="secondary">검색</Button>
            <Button variant="outline">다시 조회</Button>
            <Button variant="danger">회원 탈퇴</Button>
          </div>
        </Section>

        <Section title="Button — size" hint="sm 36 · md 44 · lg 48 (px)">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">저장</Button>
            <Button size="md">저장하기</Button>
            <Button size="lg">무료로 시작하기</Button>
          </div>
        </Section>

        <Section title="Button — state" hint="loading 은 클릭이 막히고 스피너가 돕니다">
          <div className="flex flex-wrap items-center gap-3">
            <Button loading>처리 중</Button>
            <Button variant="outline" loading>
              조회 중
            </Button>
            <Button disabled>비활성</Button>
            <Button variant="outline" disabled>
              비활성
            </Button>
          </div>
        </Section>

        {/* ───────────── Input ───────────── */}
        <Section
          title="Input — 상태별"
          hint="error 에 문자열이 들어오면 helperText 대신 표시됩니다"
        >
          <div className="grid grid-cols-2 gap-5">
            <Input label="대표자명" placeholder="홍길동" />
            <Input
              label="사업자등록번호"
              placeholder="000-00-00000"
              helperText="숫자만 입력해도 돼요."
            />
            <Input
              label="비밀번호"
              type="password"
              defaultValue="1234"
              error="8자 이상 입력해 주세요."
            />
            <Input label="개업연월일 (비활성)" defaultValue="2023-04-10" disabled />
            <Input
              label="인증번호 (rightSlot)"
              placeholder="6자리 숫자"
              rightSlot={<span className="text-body2 text-danger">{formatCountdown(285)}</span>}
            />
          </div>
        </Section>

        {/* ───────────── Select ───────────── */}
        <Section title="Select" hint="네이티브 select 기반 · appearance-none + 커스텀 화살표">
          <div className="grid grid-cols-2 gap-5">
            <Select
              label="업종 대분류"
              placeholder="선택해 주세요"
              options={INDUSTRY_OPTIONS}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              helperText={industry ? `선택된 값: ${industry}` : undefined}
            />
            <Select label="업종 (비활성)" options={INDUSTRY_OPTIONS} disabled />
            <Select
              label="지역"
              options={[{ value: 'daegu-buk', label: '대구광역시 북구' }]}
              error="지역을 선택해 주세요."
            />
          </div>
        </Section>

        {/* ───────────── Checkbox ───────────── */}
        <Section title="Checkbox" hint="label 에 노드를 넣을 수 있어 약관 링크를 섞을 수 있습니다">
          <div className="space-y-3">
            <Checkbox label="로그인 유지" />
            <Checkbox
              label={
                <>
                  <span className="text-primary">[필수]</span> 서비스 이용약관 동의
                </>
              }
              description="약관 전문은 클릭 시 펼쳐집니다."
            />
            <Checkbox label="마케팅 정보 수신 (비활성)" disabled />
            <Checkbox label="이미 체크된 항목 (비활성)" defaultChecked disabled />
          </div>
        </Section>

        {/* ───────────── 검증 전략 라이브 ───────────── */}
        <Section
          title="검증 전략 ① 기본 필드 — onBlur"
          hint="입력 중에는 조용하고, 포커스를 벗어날 때 형식을 검사합니다"
        >
          <Input
            className="max-w-[420px]"
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordError(validatePassword(password))}
            error={passwordError ?? undefined}
            helperText="영문·숫자·특수문자 조합 8자 이상"
          />
          <div className="flex max-w-[420px] items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={
                    i < strength
                      ? 'bg-primary h-1 flex-1 rounded-full'
                      : 'bg-border h-1 flex-1 rounded-full'
                  }
                />
              ))}
            </div>
            <span className="text-caption text-text-secondary">
              {strength >= 3 ? '안전함' : strength === 2 ? '보통' : '약함'}
            </span>
          </div>
        </Section>

        <Section
          title="검증 전략 ② 필드 간 검증 — onChange"
          hint="렌더 중에 계산합니다. useState 로 에러를 따로 들지 않아 두 값이 어긋날 수 없습니다"
        >
          <Input
            className="max-w-[420px]"
            label="비밀번호 확인"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            error={confirmError ?? undefined}
            helperText={
              !confirmError && passwordConfirm ? VALIDATION_MESSAGE.passwordMatched : undefined
            }
          />
        </Section>

        <Section
          title="검증 전략 ③ 서버 검증 — 버튼 트리거"
          hint="MSW 핸들러 호출 · taken@sogong.com 을 넣으면 중복으로 응답합니다"
        >
          <div className="flex max-w-[520px] items-end gap-2">
            <Input
              className="flex-1"
              label="아이디 (이메일)"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailChecked(false)
                setEmailError(null)
              }}
              error={emailError ?? undefined}
              helperText={emailChecked ? '사용할 수 있는 이메일입니다.' : undefined}
            />
            <Button variant="outline" loading={checking} onClick={checkEmail}>
              중복 확인
            </Button>
          </div>
        </Section>

        <Section
          title="onBlur 포맷 변환"
          hint="하이픈 없이 숫자만 넣고 포커스를 옮기면 자동으로 하이픈이 채워집니다"
        >
          <div className="grid max-w-[800px] grid-cols-3 gap-5">
            <Input
              label="사업자등록번호"
              placeholder="000-00-00000"
              value={bizNo}
              onChange={(e) => setBizNo(e.target.value)}
              onBlur={() => {
                const formatted = formatBizNo(bizNo)
                setBizNo(formatted)
                setBizNoError(validateBizNo(formatted))
              }}
              error={bizNoError ?? undefined}
              helperText="1234567890 → 123-45-67890"
            />
            <Input
              label="개업연월일"
              placeholder="YYYY-MM-DD"
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
              onBlur={() => {
                const formatted = formatIsoDate(openedAt)
                setOpenedAt(formatted)
                setOpenedAtError(validateOpenedAt(formatted))
              }}
              error={openedAtError ?? undefined}
              helperText="20230410 → 2023-04-10"
            />
            <Input
              label="휴대폰 번호"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                const formatted = formatPhone(phone)
                setPhone(formatted)
                setPhoneError(validatePhone(formatted))
              }}
              error={phoneError ?? undefined}
              helperText="01012345678 → 010-1234-5678"
            />
          </div>
        </Section>

        <Section
          title="검증 전략 ④ 제출 버튼 — 전체 유효할 때만 활성화"
          hint="위 ①②③ 을 모두 통과하고 약관에 동의하면 버튼이 켜집니다"
        >
          <Checkbox
            label="[필수] 서비스 이용약관에 동의합니다"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <Button className="w-[220px]" type="submit" disabled={!canSubmit}>
            가입하기
          </Button>
          <ul className="text-caption text-text-muted space-y-1">
            <li>이메일 중복 확인 {emailChecked ? '✓' : '—'}</li>
            <li>비밀번호 형식 {password && !validatePassword(password) ? '✓' : '—'}</li>
            <li>비밀번호 일치 {passwordConfirm && !confirmError ? '✓' : '—'}</li>
            <li>약관 동의 {agreed ? '✓' : '—'}</li>
          </ul>
        </Section>
      </div>
    </div>
  )
}
