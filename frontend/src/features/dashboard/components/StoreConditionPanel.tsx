import { useState } from 'react'
import { useNavigate } from 'react-router'

import MiniPanel from '@/features/dashboard/components/MiniPanel'
import { INDUSTRY_TREE, REGIONS } from '@/features/dashboard/model/storeCondition'
import type { StoreCondition } from '@/features/dashboard/model/types'
import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'
import Select from '@/shared/ui/Select'

interface StoreConditionPanelProps {
  condition: StoreCondition
}

/** 소분류 id 로 대·중분류를 되짚는다. 저장된 값은 소분류 하나뿐이라 매번 찾아야 한다 */
function findPath(minorId: number | null) {
  for (const major of INDUSTRY_TREE) {
    for (const sub of major.subs) {
      const minor = sub.minors.find((item) => item.id === minorId)
      if (minor) return { majorId: major.id, subId: sub.id, minorId: minor.id }
    }
  }
  return { majorId: null, subId: null, minorId: null }
}

const toOptions = (nodes: readonly { id: number; name: string }[]) =>
  nodes.map((node) => ({ value: String(node.id), label: node.name }))

/**
 * 창업 조건 입력 (시안 10-1 의 첫 패널을 오른쪽 열로 옮긴 것).
 *
 * 판정과 상권 분석이 전부 이 두 값 위에 선다. 다만 한 번 채우면 다시 볼 일이 없는
 * 입력이라 왼쪽 맨 위를 주지 않았다 — 매번 들어올 때마다 이걸 지나쳐야 카드를 보게 된다.
 *
 * 같은 폼이 상권 분석 화면(11-1)에도 모달로 있다. 여기서 미리 받아두면 그 화면은
 * 결과부터 보여주면 된다.
 *
 * ⚠️ 저장은 아직 안 한다. 값이 갈 곳은 `business_info` 의 `business_code_id`·`region`
 *    인데 저장 API 가 없고, 같은 행의 brn·상호·주소·개업일을 예비창업자에게 무엇으로
 *    채울지도 안 정해졌다. 지금은 화면 안에서만 바뀐다.
 */
export default function StoreConditionPanel({ condition }: StoreConditionPanelProps) {
  const navigate = useNavigate()

  const initial = findPath(condition.industryMinorId)
  const [majorId, setMajorId] = useState<number | null>(initial.majorId)
  const [subId, setSubId] = useState<number | null>(initial.subId)
  const [minorId, setMinorId] = useState<number | null>(initial.minorId)
  const [region, setRegion] = useState(condition.region)

  const major = INDUSTRY_TREE.find((item) => item.id === majorId) ?? null
  const sub = major?.subs.find((item) => item.id === subId) ?? null

  // 소분류까지 골라야 판정이 된다. 나머지는 상권 분석 정확도를 올리는 값이라 선택이다
  const canAnalyze = minorId !== null && region !== ''

  return (
    <MiniPanel label="업종과 지역만 있으면 돼요" title="어떤 가게를 준비 중이세요?">
      {/*
       * 라벨을 밖으로 빼지 않고 placeholder 가 겸한다. 320px 열에 네 칸을 쌓으면
       * 라벨만으로 100px 을 더 먹어 오른쪽 열이 왼쪽보다 길어진다.
       * 대신 aria-label 을 붙여 낭독기에는 이름이 남는다.
       */}
      <div className="flex flex-col gap-2">
        <Select
          size="sm"
          aria-label="업종 대분류"
          placeholder="업종 대분류"
          value={majorId?.toString() ?? ''}
          onChange={(event) => {
            // 상위를 바꾸면 하위는 더 이상 맞지 않는다. 남겨두면 외식업에 네일숍이 붙는다
            setMajorId(Number(event.target.value))
            setSubId(null)
            setMinorId(null)
          }}
          options={toOptions(INDUSTRY_TREE)}
        />

        <Select
          size="sm"
          aria-label="업종 중분류"
          placeholder={major ? '업종 중분류' : '대분류를 먼저 고르세요'}
          disabled={!major}
          value={subId?.toString() ?? ''}
          onChange={(event) => {
            setSubId(Number(event.target.value))
            setMinorId(null)
          }}
          options={toOptions(major?.subs ?? [])}
        />

        <Select
          size="sm"
          aria-label="업종 소분류"
          placeholder={sub ? '업종 소분류' : '중분류를 먼저 고르세요'}
          disabled={!sub}
          value={minorId?.toString() ?? ''}
          onChange={(event) => setMinorId(Number(event.target.value))}
          options={toOptions(sub?.minors ?? [])}
        />

        <Select
          size="sm"
          aria-label="지역"
          placeholder="지역"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          options={REGIONS.map((name) => ({ value: name, label: name }))}
        />

        {/* 규모·예산은 받지 않는다. business_info 에 담을 컬럼이 없고, 상권 분석도
            업종·지역만으로 돌아간다 */}
        <Button
          size="sm"
          disabled={!canAnalyze}
          onClick={() => navigate(ROUTES.MARKET_ANALYSIS)}
          className="mt-0.5 w-full"
        >
          상권 분석하기
        </Button>
      </div>
    </MiniPanel>
  )
}
