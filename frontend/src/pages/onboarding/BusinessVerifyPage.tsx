import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingShell from './OnboardingShell'
import Input from '@/shared/ui/Input'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import { OrDivider } from '@/shared/ui/AuthCard'
import { setRole } from '@/shared/lib/session'
import { mockBusiness } from '@/mocks/user.mock'
import { formatDate } from '@/shared/lib/format'

type Result = 'idle' | 'success' | 'fail'

/** 06-1 · 06-2 · 06-3 사업자 인증 — 조회 결과에 따라 같은 화면이 바뀜 */
export default function BusinessVerifyPage() {
  const navigate = useNavigate()
  const [regNo, setRegNo] = useState('')
  const [owner, setOwner] = useState('')
  const [openedAt, setOpenedAt] = useState('')
  const [result, setResult] = useState<Result>('idle')

  const filled = regNo && owner && openedAt

  const verify = () => {
    // 목업 규칙: 대표자명에 "실패"가 들어가면 인증 실패 화면
    setResult(owner.includes('실패') ? 'fail' : 'success')
  }

  const startAsOwner = () => {
    setRole('owner')
    navigate('/business/phone')
  }
  const startAsPre = () => {
    setRole('pre')
    navigate('/dashboard')
  }

  return (
    <OnboardingShell
      title="사업자 인증 정보를 입력해 주세요"
      description={
        result === 'fail' ? (
          <>
            국세청 사업자등록 상태조회로 진위와 과세유형을 확인해요.
            <br />
            확인된 정보는 자격 판정의 기준이 됩니다.
          </>
        ) : (
          <>
            국세청 사업자등록 상태조회로 진위와 과세유형을 확인해요.
            <br />
            사업자등록번호·대표자명·개업연월일 세 가지가 모두 일치해야 인증돼요.
          </>
        )
      }
    >
      <Input label="사업자등록번호" placeholder="000-00-00000" value={regNo} onChange={(e) => setRegNo(e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="대표자명" placeholder="홍길동" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <Input label="개업연월일" placeholder="YYYY-MM-DD" value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} />
      </div>

      {result === 'idle' ? (
        <Button className="w-full" disabled={!filled} onClick={verify}>
          사업자 인증
        </Button>
      ) : (
        <Button variant="outline" className="w-full" onClick={verify}>
          다시 조회
        </Button>
      )}

      {/* 조회 결과 카드 */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between bg-surface-muted px-5 py-3">
          <span className="typo-label-sm">조회 결과</span>
          {result === 'idle' && <span className="h-6 w-14 rounded-full bg-border" aria-hidden="true" />}
          {result === 'success' && <Badge variant="solid">계속사업자</Badge>}
          {result === 'fail' && (
            <span className="inline-flex h-6 items-center rounded-full border border-danger px-3 typo-badge text-danger">
              인증 실패
            </span>
          )}
        </div>

        {result === 'idle' && (
          <div className="flex flex-col items-center gap-3 px-5 py-9 text-center">
            <span className="size-8 rounded-md bg-border" aria-hidden="true" />
            <p className="typo-label-sm">사업자 인증을 하면 조회 결과가 여기에 표시돼요</p>
            <p className="typo-caption text-text-muted">사업자 유형·과세유형·업종·사업장 주소·개업일</p>
          </div>
        )}

        {result === 'success' && (
          <>
            <dl className="grid grid-cols-2">
              {[
                ['사업자 유형', mockBusiness.type],
                ['업종', mockBusiness.industry],
                ['사업장 주소', mockBusiness.address],
                ['개업일', formatDate(mockBusiness.openedAt)],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  className={[
                    'space-y-1 px-5 py-4',
                    i % 2 === 1 ? 'border-l border-border-subtle' : '',
                    i >= 2 ? 'border-t border-border-subtle' : '',
                  ].join(' ')}
                >
                  <dt className="typo-caption text-text-muted">{k}</dt>
                  <dd className="typo-body1">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="bg-surface-muted px-5 py-3 typo-caption text-text-muted">
              입력한 대표자명·개업연월일이 국세청 등록 정보와 일치해요.
            </p>
          </>
        )}

        {result === 'fail' && (
          <>
            <dl className="space-y-4 px-5 py-4">
              <div>
                <dt className="typo-caption text-text-muted">상태</dt>
                <dd className="typo-body1">국세청 정보 불일치</dd>
              </div>
              <div>
                <dt className="typo-caption text-text-muted">확인 시각</dt>
                <dd className="typo-body1">2026. 09. 02 14:02</dd>
              </div>
            </dl>
            <p className="bg-surface-muted px-5 py-3 typo-caption text-text-muted">인증이 실패되었습니다. 다시 조회해주세요.</p>
          </>
        )}
      </div>

      <Button className="w-full" disabled={result !== 'success'} onClick={startAsOwner}>
        사업자로 시작하기
      </Button>

      {result === 'fail' ? (
        <div className="flex items-center justify-between gap-4 rounded-md bg-surface-muted p-5">
          <div>
            <p className="typo-label-sm">사업자 인증이 어렵다면</p>
            <p className="mt-1 typo-caption text-text-muted">인증 없이 예비 창업자로 시작하고, 나중에 다시 인증 수 있어요.</p>
          </div>
          <Button variant="outline" size="sm" onClick={startAsPre}>
            예비 창업자로 시작
          </Button>
        </div>
      ) : (
        <>
          <OrDivider />
          <Button variant="outline" className="w-full" onClick={startAsPre}>
            사업자 인증 없이 시작하기 (예비 창업자)
          </Button>
        </>
      )}

      <p className="text-center typo-caption text-text-disabled">목업 안내: 대표자명에 &quot;실패&quot;를 넣으면 인증 실패 화면이 보여요</p>
    </OnboardingShell>
  )
}
