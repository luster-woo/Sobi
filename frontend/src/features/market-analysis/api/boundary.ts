import type {
  DongBoundaryCollection,
  DongBoundaryFeature,
} from '@/features/market-analysis/model/boundaryTypes'

/**
 * 행정동 경계 파일.
 *
 * `public/` 에 있는 정적 파일이라 axios 인스턴스를 쓰지 않는다. 그쪽은 baseURL 이
 * `/api` 이고 토큰·재발급 인터셉터가 붙어 있어서, 로그인 없이 받을 수 있는 파일에
 * 인증 흐름을 태울 이유가 없다.
 *
 * 450KB 다. 상권 분석 화면에 들어올 때만 받고, 한 번 받으면 캐시에 남긴다
 * (useDongBoundaries 의 staleTime: Infinity).
 */
const BOUNDARY_URL = '/seoul-dong.geojson'

/**
 * dongCode 로 바로 찾을 수 있게 Map 으로 바꿔서 준다.
 *
 * 배열로 두면 화면이 동 하나를 그릴 때마다 427개를 훑는다. 이웃이 7개면 한 번
 * 그리는 데 3천 번이라, 지표를 바꿀 때마다 그 비용을 다시 낸다.
 */
export async function getDongBoundaries(): Promise<Map<string, DongBoundaryFeature>> {
  const response = await fetch(BOUNDARY_URL)

  if (!response.ok) {
    throw new Error(`행정동 경계를 불러오지 못했습니다 (${response.status})`)
  }

  const collection: DongBoundaryCollection = await response.json()

  return new Map(collection.features.map((feature) => [feature.properties.dongCode, feature]))
}
