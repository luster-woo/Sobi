import { useSearchParams } from 'react-router'

const DEFAULT_PAGE = 1

interface UseListParamsOptions<K extends string> {
  /**
   * 필터·검색에 쓰는 쿼리 키. reset 대상과 activeCount 기준이 된다.
   * 'page' 는 넣지 않는다 — 페이지는 필터가 아니다.
   *
   * ⚠️ 컴포넌트 밖에 `const FILTER_KEYS = [...] as const` 로 두고 넘긴다.
   *    JSX 안에서 배열 리터럴을 만들면 렌더마다 새 배열이 된다.
   */
  keys: readonly K[]
}

/**
 * 목록 화면의 필터·검색어·페이지를 URL 쿼리스트링으로 다룬다.
 *
 * useState 대신 URL 을 쓰는 이유: 새로고침·뒤로가기·링크 공유가 그대로 동작하고,
 * 상세 화면 다녀와도 필터가 살아 있다. 주소가 곧 상태다.
 *
 * page 는 화면 기준 1-base 다. 서버(Spring Data)는 0 부터 세므로 요청을 만들 때
 * `toServerPage(page)` 로 변환한다 — 그 변환을 여기서 하지 않는 이유는
 * 주소창에 page=0 이 보이면 사용자가 혼란스럽기 때문이다.
 */
export function useListParams<K extends string>({ keys }: UseListParamsOptions<K>) {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawPage = Number(searchParams.get('page'))
  // '?page=abc' · '?page=0' · '?page=-1' 을 그대로 요청에 실으면 안 된다
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : DEFAULT_PAGE

  const values = Object.fromEntries(
    keys.map((key) => [key, searchParams.get(key) ?? '']),
  ) as Record<K, string>

  const activeCount = keys.filter((key) => searchParams.get(key)).length

  /** 페이지 이동. 필터·검색어는 유지한다 */
  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(next))
    setSearchParams(params)
  }

  /**
   * 필터·검색어 변경. page 를 항상 1 로 되돌린다.
   *
   * 리셋이 필요한 이유: 5페이지를 보다가 필터를 걸면 page=5 로 요청이 나가고,
   * 필터 결과가 2페이지뿐이면 빈 배열이 와서 "결과 없음"이 뜬다. 실제로는 있는데도.
   *
   * 빈 문자열·null 은 키를 지운다. '?bankName=' 이 남으면 서버가 빈 문자열로
   * 필터링을 시도한다.
   */
    const setValues = (patch: Partial<Record<K, string | null>>) => {
    const params = new URLSearchParams(searchParams)

    // Object.entries 는 제네릭 Partial<Record<K, ...>> 에서 값 타입을 {} 로 추론한다.
    // 키를 K 로 단정하고 patch[key] 로 꺼내면 string | null | undefined 로 좁혀진다.
    const patchedKeys = Object.keys(patch) as K[]

    patchedKeys.forEach((key) => {
      const value = patch[key]
      if (value) params.set(key, value)
      else params.delete(key)
    })

    params.set('page', String(DEFAULT_PAGE))
    setSearchParams(params)
  }

  /** 필터·검색어 전부 해제. keys 에 없는 쿼리(탭 등)는 건드리지 않는다 */
  const reset = () => {
    const params = new URLSearchParams(searchParams)
    keys.forEach((key) => params.delete(key))
    params.set('page', String(DEFAULT_PAGE))
    setSearchParams(params)
  }

  return { page, values, activeCount, setPage, setValues, reset }
}