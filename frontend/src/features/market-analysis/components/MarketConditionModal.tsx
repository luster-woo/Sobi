import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  EMPTY_CONDITION,
  isSubmittable,
  toSearchParams,
} from '@/features/market-analysis/model/condition'
import type { MarketCondition } from '@/features/market-analysis/model/conditionTypes'
import { ROUTES } from '@/shared/constants/routes'
import { useBusinessTree, useRegionTree } from '@/shared/hooks/useCommonCodes'
import type { BusinessTree, CodeItem, RegionTree } from '@/shared/types/commonCode'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import Select from '@/shared/ui/Select'

interface MarketConditionModalProps {
  /**
   * 사용자가 그냥 닫았을 때(X · 바깥 클릭 · ESC).
   * 제출과 갈라둔 이유: 빈 화면에서 취소하면 이전 화면으로 돌려보내야 하는데,
   * 제출까지 같은 콜백을 쓰면 분석을 시작하자마자 그 화면을 떠나버린다.
   */
  onClose: () => void
  /** 분석을 시작했을 때. 주소 이동은 이 컴포넌트가 이미 했고, 닫기만 하면 된다 */
  onSubmitted: () => void
  /** 조건 재설정으로 열 때 이전 값. 처음이면 EMPTY_CONDITION */
  initial: MarketCondition
}

/** Select 는 children 을 받지 않고 { value, label } 배열을 받는다 */
function toOptions(items: CodeItem[] | undefined) {
  return (items ?? []).map((item) => ({ value: item.code, label: item.name }))
}

/**
 * URL 에는 소분류·행정동 코드만 있고 상위 코드가 없다. 조건 재설정으로 열 때 대분류·
 * 중분류·자치구 셀렉트를 채우려면 트리를 뒤져 부모를 찾아야 한다.
 */
function fillParents(
  condition: MarketCondition,
  businessTree?: BusinessTree,
  regionTree?: RegionTree,
): MarketCondition {
  const filled = { ...condition }

  if (businessTree && condition.minorCode && !condition.majorCode) {
    for (const major of businessTree.majors) {
      for (const sub of major.subs) {
        if (sub.minors.some((minor) => minor.code === condition.minorCode)) {
          filled.majorCode = major.code
          filled.subCode = sub.code
        }
      }
    }
  }

  if (regionTree && condition.dongCode && !condition.districtCode) {
    const found = regionTree.districts.find((district) =>
      district.dongs.some((dong) => dong.code === condition.dongCode),
    )
    if (found) filled.districtCode = found.code
  }

  return filled
}

/**
 * 상권 분석 조건 입력 모달 (S15P21D101-251)
 *
 * 업종 대/중/소와 지역 시도/시군구/읍면동을 고른다. 목록은 트리 하나씩으로 받아두고
 * 하위 셀렉트를 그 자리에서 좁힌다 — 단계마다 서버를 부르지 않아 대기가 없다.
 *
 * 상위를 바꾸면 하위를 비운다. '외식업 > 음식점 > 한식' 에서 대분류만 '소매업' 으로
 * 바꾸면 중·소분류가 남아 있는 조합은 존재하지 않는 업종이 된다.
 *
 * 고른 조건은 서버로 바로 보내지 않고 주소로 넘긴다. 결과 화면이 쿼리스트링을 읽어
 * 조회하는 구조라 모달은 navigate 만 하면 끝이다. 덕분에 분석 결과를 링크로 공유할 수
 * 있고 뒤로가기로 이전 조건에 돌아갈 수 있다.
 *
 * 열려 있을 때만 마운트된다(페이지가 `{open && <Modal/>}` 로 그린다). 그래서 열 때마다
 * useState 가 그 시점의 URL 값으로 초기화되고, 바깥 값과 맞추는 동기화 코드가 필요 없다.
 */
export default function MarketConditionModal({
  onClose,
  onSubmitted,
  initial,
}: MarketConditionModalProps) {
  const navigate = useNavigate()
  const { data: businessTree } = useBusinessTree()
  const { data: regionTree } = useRegionTree()

  const [condition, setCondition] = useState(initial)

  // 트리가 늦게 도착해도 매 렌더에서 다시 계산하므로 상위 셀렉트가 알아서 채워진다
  const filled = fillParents(condition, businessTree, regionTree)

  const major = businessTree?.majors.find((item) => item.code === filled.majorCode)
  const sub = major?.subs.find((item) => item.code === filled.subCode)
  const district = regionTree?.districts.find((item) => item.code === filled.districtCode)

  const pick = (patch: Partial<MarketCondition>) =>
    setCondition((prev) => ({ ...fillParents(prev, businessTree, regionTree), ...patch }))

  const handleSubmit = () => {
    if (!isSubmittable(filled)) return
    navigate({ pathname: ROUTES.MARKET_ANALYSIS, search: toSearchParams(filled).toString() })
    onSubmitted()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="어떤 가게를 준비 중이세요?"
      description="입력한 조건으로 상권을 분석하고 필요한 지원금을 안내해요."
      footer={
        <>
          <Button variant="outline" onClick={() => setCondition(EMPTY_CONDITION)}>
            초기화
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isSubmittable(filled)}
            className="min-w-[132px]"
          >
            상권 분석하기
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="업종 대분류"
          placeholder="선택"
          options={toOptions(businessTree?.majors)}
          value={filled.majorCode}
          onChange={(event) => pick({ majorCode: event.target.value, subCode: '', minorCode: '' })}
        />

        <Select
          label="업종 중분류"
          placeholder="선택"
          options={toOptions(major?.subs)}
          value={filled.subCode}
          disabled={!major}
          onChange={(event) => pick({ subCode: event.target.value, minorCode: '' })}
        />

        <Select
          label="업종 소분류"
          placeholder="선택"
          options={toOptions(sub?.minors)}
          value={filled.minorCode}
          disabled={!sub}
          onChange={(event) => pick({ minorCode: event.target.value })}
        />

        {/*
          상권 데이터가 서울뿐이라 선택지가 하나다. 비활성으로 막지 않고 열어 둔다 —
          눌러서 목록에 서울특별시만 있는 것을 직접 보는 편이, 회색으로 잠긴 칸을
          보며 "왜 안 눌리지" 하는 것보다 낫다. 고를 것이 하나라 값은 바뀌지 않는다.
          다른 시·도가 들어오면 options 를 서버 값으로 바꾸기만 하면 된다.
        */}
        <Select
          label="시 · 도"
          options={[{ value: 'seoul', label: regionTree?.cityName ?? '서울특별시' }]}
          value="seoul"
          onChange={() => {}}
        />

        <Select
          label="시 · 군 · 구"
          placeholder="선택"
          options={toOptions(regionTree?.districts)}
          value={filled.districtCode}
          onChange={(event) => pick({ districtCode: event.target.value, dongCode: '' })}
        />

        <Select
          label="읍 · 면 · 동"
          placeholder="선택"
          options={toOptions(district?.dongs)}
          value={filled.dongCode}
          disabled={!district}
          onChange={(event) => pick({ dongCode: event.target.value })}
        />
      </div>
    </Modal>
  )
}
