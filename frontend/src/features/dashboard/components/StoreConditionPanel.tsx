import { useState } from 'react'
import { useNavigate } from 'react-router'

import MiniPanel from '@/features/dashboard/components/MiniPanel'
import type { StoreCondition } from '@/features/dashboard/model/types'
import { ROUTES } from '@/shared/constants/routes'
import { useBusinessTree, useRegionTree } from '@/shared/hooks/useCommonCodes'
import type { CodeItem } from '@/shared/types/commonCode'
import Button from '@/shared/ui/Button'
import Select from '@/shared/ui/Select'

interface StoreConditionPanelProps {
  condition: StoreCondition
}

/** Select 는 { value, label } 배열을 받는다 */
const toOptions = (items: readonly CodeItem[] | undefined) =>
  (items ?? []).map((item) => ({ value: item.code, label: item.name }))

/**
 * 창업 조건 입력 (시안 10-1 의 첫 패널을 오른쪽 열로 옮긴 것).
 *
 * 판정과 상권 분석이 전부 이 값 위에 선다. 다만 한 번 채우면 다시 볼 일이 없는
 * 입력이라 왼쪽 맨 위를 주지 않았다 — 매번 들어올 때마다 이걸 지나쳐야 카드를 보게 된다.
 *
 * 목록은 상권 분석 조건 모달과 같은 API 를 쓴다(GET /common/market/businesses · /regions).
 * 트리를 한 번씩만 받아 하위 셀렉트를 그 자리에서 좁히므로 단계마다 대기가 없고,
 * 정적 데이터라 두 화면이 같은 캐시를 공유한다.
 *
 * 고른 조건은 주소에 실어 상권 분석으로 넘긴다. 그 화면이 쿼리스트링을 읽어 바로
 * 조회하므로, 여기서 고른 사용자는 조건 입력 모달을 한 번 더 거치지 않는다.
 *
 * ⚠️ 저장은 아직 안 한다. 값이 갈 곳은 예비창업자용 `pre_business_info` 인데 저장
 *    API 가 없다. 새로고침하면 사라진다.
 */
export default function StoreConditionPanel({ condition }: StoreConditionPanelProps) {
  const navigate = useNavigate()
  const { data: businessTree } = useBusinessTree()
  const { data: regionTree } = useRegionTree()

  /*
   * 업종은 초기값을 복원하지 않는다. 대시보드 응답의 industryMinorId 는 minor_code.id
   * (숫자)인데 상권 분석 API 는 code 문자열(CS100001)을 받아, 둘을 이어줄 값이 없다.
   * 대시보드 응답에 code 가 들어오면 지역과 같은 방식으로 복원하면 된다.
   */
  const [majorCode, setMajorCode] = useState('')
  const [subCode, setSubCode] = useState('')
  const [minorCode, setMinorCode] = useState('')

  /*
   * 지역은 이름으로 와서 트리에서 같은 이름을 찾아 코드로 바꾼다.
   *
   * 고른 값(picked)이 있으면 그것을, 없으면 응답에서 찾은 값을 쓴다. 트리가 늦게
   * 도착해도 매 렌더에서 다시 계산하므로 도착하는 순간 셀렉트가 채워진다 — effect 로
   * 맞추면 한 프레임 빈 칸이 지나가고 set-state-in-effect 규칙에도 걸린다.
   *
   * null 은 '아직 안 골랐다'(초기값을 쓴다), 빈 문자열은 '비웠다' 는 뜻이다.
   * 시·군·구를 바꿀 때 읍·면·동을 ''로 비워야 초기값으로 되돌아가지 않는다.
   */
  const [pickedDistrict, setPickedDistrict] = useState<string | null>(null)
  const [pickedDong, setPickedDong] = useState<string | null>(null)

  const initialDistrict = regionTree?.districts.find((item) => item.name === condition.district)
  const initialDong = initialDistrict?.dongs.find((item) => item.name === condition.dong)

  const districtCode = pickedDistrict ?? initialDistrict?.code ?? ''
  const dongCode = pickedDong ?? initialDong?.code ?? ''

  const major = businessTree?.majors.find((item) => item.code === majorCode)
  const sub = major?.subs.find((item) => item.code === subCode)
  const district = regionTree?.districts.find((item) => item.code === districtCode)

  // 상권 분석이 동 단위라 읍·면·동까지 골라야 한다
  const canAnalyze = Boolean(minorCode && dongCode)

  const handleAnalyze = () => {
    if (!canAnalyze) return
    navigate({
      pathname: ROUTES.MARKET_ANALYSIS,
      search: new URLSearchParams({ dongCode, businessCode: minorCode }).toString(),
    })
  }

  return (
    <MiniPanel title="어떤 가게를 준비 중이세요?">
      {/*
       * 라벨을 밖으로 빼지 않고 placeholder 가 겸한다. 320px 열에 여섯 칸을 쌓으면
       * 라벨만으로 100px 을 더 먹어 오른쪽 열이 왼쪽보다 길어진다.
       * 대신 aria-label 을 붙여 낭독기에는 이름이 남는다.
       *
       * 업종 3단·지역 3단을 각각 2열로 눕혀 세 줄로 줄인다. 소분류와 읍·면·동은
       * 이름이 길어 한 칸을 다 쓴다.
       */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          size="sm"
          aria-label="업종 대분류"
          placeholder="업종 대분류"
          value={majorCode}
          onChange={(event) => {
            // 상위를 바꾸면 하위는 더 이상 맞지 않는다. 남겨두면 외식업에 네일숍이 붙는다
            setMajorCode(event.target.value)
            setSubCode('')
            setMinorCode('')
          }}
          options={toOptions(businessTree?.majors)}
        />

        <Select
          size="sm"
          aria-label="업종 중분류"
          placeholder={major ? '업종 중분류' : '대분류를 먼저 고르세요'}
          disabled={!major}
          value={subCode}
          onChange={(event) => {
            setSubCode(event.target.value)
            setMinorCode('')
          }}
          options={toOptions(major?.subs)}
        />

        <Select
          size="sm"
          className="col-span-2"
          aria-label="업종 소분류"
          placeholder={sub ? '업종 소분류' : '중분류를 먼저 고르세요'}
          disabled={!sub}
          value={minorCode}
          onChange={(event) => setMinorCode(event.target.value)}
          options={toOptions(sub?.minors)}
        />

        {/*
          상권 데이터가 서울뿐이라 선택지가 하나다. 비활성으로 막지 않고 열어 둔다 —
          눌러서 목록에 서울특별시만 있는 것을 보는 편이, 잠긴 칸을 보며 "왜 안 눌리지"
          하는 것보다 낫다.
        */}
        <Select
          size="sm"
          aria-label="시 · 도"
          value="seoul"
          onChange={() => {}}
          options={[{ value: 'seoul', label: regionTree?.cityName ?? '서울특별시' }]}
        />

        <Select
          size="sm"
          aria-label="시 · 군 · 구"
          placeholder="시 · 군 · 구"
          value={districtCode}
          onChange={(event) => {
            setPickedDistrict(event.target.value)
            setPickedDong('')
          }}
          options={toOptions(regionTree?.districts)}
        />

        <Select
          size="sm"
          className="col-span-2"
          aria-label="읍 · 면 · 동"
          placeholder={district ? '읍 · 면 · 동' : '시·군·구를 먼저 고르세요'}
          disabled={!district}
          value={dongCode}
          onChange={(event) => setPickedDong(event.target.value)}
          options={toOptions(district?.dongs)}
        />

        {/* 규모·예산은 받지 않는다. 상권 분석 API 가 받는 파라미터가 아니고,
            백엔드에서도 두 값이 제외됐다 */}
        <Button
          size="sm"
          disabled={!canAnalyze}
          onClick={handleAnalyze}
          className="col-span-2 mt-0.5 w-full"
        >
          상권 분석하기
        </Button>
      </div>
    </MiniPanel>
  )
}