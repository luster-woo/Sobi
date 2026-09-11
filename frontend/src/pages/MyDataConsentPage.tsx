import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  REQUIRED_TRANSFER_IDS,
  TRANSFER_FULL_TEXT,
  TRANSFER_ITEMS,
  TRANSFER_TERMS,
} from '@/features/auth/model/mydataConsent'
import { ROUTES } from '@/shared/constants/routes'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'
import Modal from '@/shared/ui/Modal'
import { cn } from '@/shared/utils/cn'

/**
 * 화면 08. 마이데이터 전송요구 동의.
 *
 * 동의 자체를 저장하는 API 는 없다. 동의하면 `POST /mydata/link` 를 부르고, 그 호출이
 * 곧 전송요구다 — 그래서 이 화면의 체크박스는 서버로 따로 나가지 않는다.
 */
export function MyDataConsentPage() {
  const navigate = useNavigate()

  /** 전송을 요구할 항목. 기본은 전부 선택 — 빼고 싶은 것만 끄게 한다 */
  const [selected, setSelected] = useState<string[]>(TRANSFER_ITEMS.map((item) => item.id))
  const [agreed, setAgreed] = useState(false)
  const [fullTextOpen, setFullTextOpen] = useState(false)

  const allSelected = selected.length === TRANSFER_ITEMS.length
  const requiredMet = REQUIRED_TRANSFER_IDS.every((id) => selected.includes(id))

  const toggleAll = () => setSelected(allSelected ? [] : TRANSFER_ITEMS.map((item) => item.id))

  const toggleOne = (id: string) =>
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    )

  const handleLink = () => {
    // TODO(143): POST /mydata/link
    //   지금은 동기 1회 호출이라 응답이 `data: null` 이다. 비동기(jobId + 폴링)로
    //   바뀌면 여기서 jobId 를 받아 수집 화면으로 넘긴다.
    //   동기로 남으면 이 호출만 timeout 을 60초로 따로 줘야 한다 — 전역이 10초다.
    navigate(ROUTES.MYDATA_COLLECT)
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-text text-[23px] font-bold tracking-[-0.02em]">
          마이데이터를 연동하면 가능한 상품만 보여드려요
        </h1>
        <p className="text-body2 text-text-secondary mt-2.5 leading-[1.7]">
          연동하면 매출·대출 잔액을 바탕으로 받을 수 있는 자금을 자동으로 찾아드려요.
          <br />
          동의하지 않으면 대시보드의 자금 진단 기능을 이용할 수 없어요.
        </p>
      </div>

      <div className="border-border bg-surface w-full max-w-[560px] overflow-hidden rounded-md border">
        <div className="border-border-subtle flex items-baseline justify-between gap-3 border-b px-4 py-3">
          <h2 className="font-heading text-body1 text-text font-bold">전송을 요구하는 정보</h2>
          <Badge variant="neutral">신용정보법 고지</Badge>
        </div>

        <div className="border-border-subtle bg-surface-muted border-b px-4 py-2.5">
          <Checkbox
            label={<span className="text-body2 font-medium">전체 선택</span>}
            checked={allSelected}
            onChange={toggleAll}
          />
        </div>

        <ul>
          {TRANSFER_ITEMS.map((item) => (
            <li
              key={item.id}
              className="border-border-subtle flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
            >
              <Checkbox
                className="min-w-0 flex-1"
                label={
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-caption rounded-[3px] px-1.5 py-px font-medium',
                        item.required
                          ? 'bg-primary-soft text-primary'
                          : 'bg-border-subtle text-text-muted',
                      )}
                    >
                      {item.required ? '필수' : '선택'}
                    </span>
                    {item.label}
                  </span>
                }
                checked={selected.includes(item.id)}
                onChange={() => toggleOne(item.id)}
              />

              <span className="text-caption text-text-muted shrink-0 text-right">{item.scope}</span>
            </li>
          ))}
        </ul>
      </div>

      {!requiredMet && (
        <p className="text-body2 text-danger mt-2.5 w-full max-w-[560px]">
          모든 항목에 동의해야 연동할 수 있어요. 하나라도 빠지면 자격 판정과 자금 조합을 계산할 수
          없습니다.
        </p>
      )}

      <div className="border-border bg-surface mt-3.5 w-full max-w-[560px] overflow-hidden rounded-md border">
        <div className="border-border-subtle border-b px-4 py-3">
          <h2 className="font-heading text-body1 text-text font-bold">이용 목적 및 보유 기간</h2>
        </div>

        <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3.5 gap-y-2.5 px-4 py-3.5">
          {TRANSFER_TERMS.map(({ term, description }) => (
            <div key={term} className="contents">
              <dt className="text-body2 text-text-muted">{term}</dt>
              <dd className="text-body2 text-text">{description}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 flex w-full max-w-[560px] items-center gap-2.5">
        <Checkbox
          className="min-w-0 flex-1"
          label={
            <span className="flex items-center gap-1.5">
              <span className="bg-primary-soft text-primary text-caption rounded-[3px] px-1.5 py-px font-medium">
                필수
              </span>
              전송요구 내용을 확인했으며, 위 항목의 전송에 동의합니다
            </span>
          }
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />

        <button
          type="button"
          onClick={() => setFullTextOpen(true)}
          className="text-caption text-primary shrink-0 font-medium hover:underline"
        >
          전문 보기
        </button>
      </div>

      <Button
        size="lg"
        disabled={!agreed || !requiredMet}
        onClick={handleLink}
        className="mt-4 w-full max-w-[560px]"
      >
        연동하기
      </Button>

      {/* 전문은 길어서 인라인 아코디언 대신 창을 띄운다. 아코디언이면 동의 체크박스가
          화면 밖으로 밀린다 */}
      {fullTextOpen && (
        <Modal
          open
          size="lg"
          title="개인신용정보 전송요구서"
          onClose={() => setFullTextOpen(false)}
          footer={
            <Button variant="outline" onClick={() => setFullTextOpen(false)} className="w-full">
              닫기
            </Button>
          }
        >
          <p className="text-body2 text-text-secondary leading-[1.8] whitespace-pre-line">
            {TRANSFER_FULL_TEXT}
          </p>
        </Modal>
      )}
    </>
  )
}
