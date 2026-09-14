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

/**
 * 항목 한 줄. 이름과 값을 위아래가 아니라 좌우로 놓는다.
 *
 * 위아래로 쌓으면 한 줄에 64px 을 쓴다. 다섯 항목이면 그것만 320px 이라 조회 결과가
 * 나오는 순간 화면 밖으로 밀린다. 좌우로 놓으면 36px 이고, 값이 짧아서 읽기도 낫다.
 */
function Row({
  term,
  description,
  className,
}: {
  term: string
  description: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-border-subtle flex items-baseline justify-between gap-3 border-b px-3.5 py-[5px]',
        className,
      )}
    >
      <dt className="text-caption text-text-muted shrink-0">{term}</dt>
      {/* 주소가 길면 자른다. 전체는 title 로 본다 */}
      <dd
        className="text-body2 text-text min-w-0 truncate font-medium tabular-nums"
        title={description}
      >
        {description}
      </dd>
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
        /*
         * 높이를 고정한다. 조회 전 45px 이던 상자가 결과가 뜨며 159px 로 커지면
         * 아래 버튼들이 그만큼 밀려 내려가 화면이 덜컹거린다. 성공 결과(다섯 줄)에
         * 맞춰 잡아두면 어떤 상태에서도 아래가 제자리에 있는다.
         */
        'flex h-[159px] flex-col overflow-hidden rounded-md border',
        status === 'error' ? 'border-danger/40' : 'border-border',
        className,
      )}
    >
      <div className="border-border bg-surface-muted text-body2 text-text flex shrink-0 items-center justify-between border-b px-3.5 py-1.5 font-medium">
        <span>조회 결과</span>

        {status === 'idle' && <Badge variant="outline">대기</Badge>}
        {status === 'error' && <Badge variant="danger">인증 실패</Badge>}
        {status === 'success' && data && (
          <Badge variant={data.isClose ? 'danger' : 'success'}>
            {data.isClose ? '휴·폐업' : '계속사업자'}
          </Badge>
        )}
      </div>

      {status === 'idle' && (
        <p className="text-caption text-text-muted flex flex-1 items-center justify-center px-3.5 text-center leading-[1.6]">
          인증하면 사업자 유형 · 업종 · 사업장 주소 · 개업일이 여기에 표시돼요
        </p>
      )}

      {status === 'success' && data && (
        /*
         * 성공 안내 문구('일치해요')를 따로 두지 않는다. 머리글의 '계속사업자' 배지와
         * 결과가 떴다는 사실 자체가 같은 말이라, 한 줄 더 쓰면 화면만 길어진다.
         *
         * 상자 높이가 고정이라 휴·폐업 안내가 붙으면 넘친다. 그때만 안에서 스크롤된다.
         */
        <dl className="grid min-h-0 flex-1 grid-cols-2 content-start overflow-y-auto">
          <Row term="상호명" description={data.businessName} className="col-span-2" />
          <Row term="사업자 유형" description={data.type} className="border-r" />
          <Row term="업종" description={data.businessType} />
          <Row term="사업장 주소" description={data.address} className="col-span-2" />
          <Row
            term="개업일"
            description={data.openDate}
            className={cn('col-span-2', !data.isClose && 'border-b-0')}
          />

          {/*
           * 휴·폐업 사유를 상자 안에 둔다. 바깥에 한 줄 더 붙이면 그만큼 아래 버튼이
           * 밀려 내려가 계속사업자일 때와 화면이 달라진다.
           */}
          {data.isClose && (
            <p className="bg-danger-soft text-caption text-danger col-span-2 flex flex-1 items-center px-3.5 leading-[1.6]">
              휴업·폐업 상태라 정책자금을 신청할 수 없어요. 예비 창업자로는 시작할 수 있어요.
            </p>
          )}
        </dl>
      )}

      {status === 'error' && (
        <>
          <dl className="grid grid-cols-2">
            <Row
              term="상태"
              description={errorSummary ?? '국세청 정보 불일치'}
              className="col-span-2"
            />
            <Row term="확인 시각" description={checkedAt ?? '-'} className="col-span-2" />
          </dl>

          {/*
           * 남는 높이를 위쪽 빈 자리가 받아 사유 박스를 상자 바닥에 붙인다.
           * 사유 박스에 flex-1 을 주면 빨간 면이 상자 절반을 덮어 실패가 실제보다
           * 커 보이고, 빈 자리를 아래에 두면 빨간 줄이 공중에 뜬다.
           */}
          <span aria-hidden="true" className="block flex-1" />

          <p className="bg-danger-soft text-caption text-danger px-3.5 py-2 leading-[1.6]">
            {errorMessage ??
              '대표자명 또는 개업연월일이 국세청 등록 정보와 달라요. 값을 확인하고 다시 조회해 주세요.'}
          </p>
        </>
      )}
    </div>
  )
}
