import { useState } from 'react'
import { useNavigate } from 'react-router'

import MiniPanel from '@/features/dashboard/components/MiniPanel'
import { INDUSTRY_TREE, REGION_TREE } from '@/features/dashboard/model/storeCondition'
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

/** 지역은 코드가 없어 이름을 값으로 쓴다. 코드 API 가 붙으면 id 로 바꾼다 */
const toNameOptions = (names: readonly string[]) =>
  names.map((name) => ({ value: name, label: name }))

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

  const [province, setProvince] = useState(condition.province)
  const [district, setDistrict] = useState(condition.district)
  const [dong, setDong] = useState(condition.dong)

  const major = INDUSTRY_TREE.find((item) => item.id === majorId) ?? null
  const sub = major?.subs.find((item) => item.id === subId) ?? null

  const provinceNode = REGION_TREE.find((item) => item.name === province) ?? null
  const districtNode = provinceNode?.districts.find((item) => item.name === district) ?? null

  // 상권 분석이 동 단위라 읍·면·동까지 골라야 한다
  const canAnalyze = minorId !== null && dong !== ''

  return (
    <MiniPanel title="어떤 가게를 준비 중이세요?">
      {/*
       * 라벨을 밖으로 빼지 않고 placeholder 가 겸한다. 320px 열에 네 칸을 쌓으면
       * 라벨만으로 100px 을 더 먹어 오른쪽 열이 왼쪽보다 길어진다.
       * 대신 aria-label 을 붙여 낭독기에는 이름이 남는다.
       */}
      {/*
       * 여섯 칸을 한 줄씩 쌓으면 오른쪽 열이 왼쪽보다 길어져 화면이 넘친다(실측 774px).
       * 업종 3단·지역 3단을 각각 2열로 눕혀 세 줄로 줄인다. 소분류와 읍·면·동은
       * 이름이 길어 한 칸을 다 쓴다.
       */}
      <div className="grid grid-cols-2 gap-2">
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
          className="col-span-2"
          aria-label="업종 소분류"
          placeholder={sub ? '업종 소분류' : '중분류를 먼저 고르세요'}
          disabled={!sub}
          value={minorId?.toString() ?? ''}
          onChange={(event) => setMinorId(Number(event.target.value))}
          options={toOptions(sub?.minors ?? [])}
        />

        <Select
          size="sm"
          aria-label="시 · 도"
          placeholder="시 · 도"
          value={province}
          onChange={(event) => {
            setProvince(event.target.value)
            setDistrict('')
            setDong('')
          }}
          options={toNameOptions(REGION_TREE.map((item) => item.name))}
        />

        <Select
          size="sm"
          aria-label="시 · 군 · 구"
          placeholder={provinceNode ? '시 · 군 · 구' : '시·도를 먼저 고르세요'}
          disabled={!provinceNode}
          value={district}
          onChange={(event) => {
            setDistrict(event.target.value)
            setDong('')
          }}
          options={toNameOptions(provinceNode?.districts.map((item) => item.name) ?? [])}
        />

        <Select
          size="sm"
          className="col-span-2"
          aria-label="읍 · 면 · 동"
          placeholder={districtNode ? '읍 · 면 · 동' : '시·군·구를 먼저 고르세요'}
          disabled={!districtNode}
          value={dong}
          onChange={(event) => setDong(event.target.value)}
          options={toNameOptions(districtNode?.dongs ?? [])}
        />

        {/* 규모·예산은 받지 않는다. business_info 에 담을 컬럼이 없고, 상권 분석도
            업종·지역만으로 돌아간다 */}
        <Button
          size="sm"
          disabled={!canAnalyze}
          onClick={() => navigate(ROUTES.MARKET_ANALYSIS)}
          className="col-span-2 mt-0.5 w-full"
        >
          상권 분석하기
        </Button>
      </div>
    </MiniPanel>
  )
}
