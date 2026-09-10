import Badge from '@/shared/ui/Badge'
import { cn } from '@/shared/utils/cn'

/**
 * `POST /business/verify` 응답. 백엔드 `VerifyResponse` 와 1:1 이다.
 */
export interface BizVerifyData {
  /** 사업자 유형. `verify.type` — '개인사업자' 등 */
  type: string
  /** 업종명. 백엔드가 `verify.business_code_name` 을 이 이름으로 내려준다 */
  businessType: string
  businessName: string
  address: string
  /** `LocalDate` 직렬화 결과라 'YYYY-MM-DD' */
  openDate: string
  /** 휴·폐업 여부. `verify.is_close`(NOT NULL) */
  isClose: boolean
}

interface BizVerifyResultProps {
  /** idle 조회 전 · success 일치 · error 불일치 */
  status: 'idle' | 'success' | 'error'
  data?: BizVerifyData
  /** status 가 error 일 때 '상태' 칸에 넣을 한 줄 요약 */
  errorSummary?: string
  /** status 가 error 일 때 하단에 표시할 사유 */
  errorMessage?: string
  /** 실패 화면의 '확인 시각' */
  checkedAt?: string
  className?: string
}

function Row({ term, description }: { term: string; description: string }) {
  return (
    <div className="border-border-subtle border-b px-3.5 py-2.5 odd:border-r">
      <dt className="text-caption text-text-muted">{term}</dt>
      <dd className="text-body1 text-text mt-0.5 font-medium tabular-nums">{description}</dd>
    </div>
  )
}

/**
 * 국세청 조회 결과. 06-1(대기) · 06-2(성공) · 06-3(실패)가 같은 자리의 다른 상태라
 * 한 컴포넌트로 둔다.
 *
 * 과세유형은 표시하지 않는다 — DB `verify` 테이블에도 컬럼이 없어 채울 소스가 없다.
 * 디자인의 `개인사업자 · 일반과세자` 중 앞부분만 그린다.
 *
 * ⚠️ 139(사업자 인증 화면)에서 처리할 것: `isClose` 가 true 면 휴·폐업 사업자이므로
 *    정책자금 신청 대상이 아니다. 배지만 빨갛게 두지 말고 '사업자로 시작하기' 버튼을
 *    막아야 한다 (팀 결정). 이 경우 예비 창업자로도 시작할 수 없어 사용자가 갇히므로,
 *    안내 문구로 다음 행동을 알려줄 필요가 있다.
 */
export default function BizVerifyResult({
  status,
  data,
  errorSummary,
  errorMessage,
  checkedAt,
  className,
}: BizVerifyResultProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border',
        status === 'error' ? 'border-danger/40' : 'border-border',
        className,
      )}
    >
      <div className="border-border bg-surface-muted text-body2 text-text flex items-center justify-between border-b px-3.5 py-2.5 font-medium">
        <span>{status === 'idle' ? '국세청 조회 결과' : '조회 결과'}</span>

        {status === 'idle' && <Badge variant="outline">대기</Badge>}
        {status === 'error' && <Badge variant="danger">인증 실패</Badge>}
        {status === 'success' && data && (
          <Badge variant={data.isClose ? 'danger' : 'success'}>
            {data.isClose ? '휴·폐업' : '계속사업자'}
          </Badge>
        )}
      </div>

      {status === 'idle' && (
        <div className="bg-surface-muted px-4 py-6.5 text-center">
          <span
            aria-hidden="true"
            className="bg-bg-canvas mx-auto mb-2.5 block size-6.5 rounded-sm"
          />
          <b className="text-body2 text-text-secondary block font-medium">
            사업자 인증을 하면 조회 결과가 여기에 표시돼요
          </b>
          <span className="text-caption text-text-muted mt-1 block">
            사업자 유형 · 업종 · 사업장 주소 · 개업일
          </span>
        </div>
      )}

      {status === 'success' && data && (
        <>
          <div className="border-border-subtle border-b px-3.5 py-2.5">
            <p className="text-caption text-text-muted">상호명</p>
            <p className="text-body1 text-text mt-0.5 font-medium">{data.businessName}</p>
          </div>

          {/* 2열 그리드. Row 의 odd:border-r 이 왼쪽 칸에만 세로선을 넣는다 */}
          <dl className="grid grid-cols-2 [&>div:nth-last-child(-n+2)]:border-b-0">
            <Row term="사업자 유형" description={data.type} />
            <Row term="업종" description={data.businessType} />
            <Row term="사업장 주소" description={data.address} />
            <Row term="개업일" description={data.openDate} />
          </dl>

          <p className="bg-primary-soft text-caption text-primary px-3.5 py-2.5">
            입력한 대표자명·개업연월일이 국세청 등록 정보와 일치해요
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <dl className="grid grid-cols-2 [&>div:nth-last-child(-n+2)]:border-b-0">
            <Row term="상태" description={errorSummary ?? '국세청 정보 불일치'} />
            <Row term="확인 시각" description={checkedAt ?? '-'} />
          </dl>

          <p className="bg-danger-soft text-caption text-danger px-3.5 py-2.5">
            {errorMessage ??
              '대표자명 또는 개업연월일이 국세청 등록 정보와 달라요. 값을 확인하고 다시 조회해 주세요.'}
          </p>
        </>
      )}
    </div>
  )
}
