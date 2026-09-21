/**
 * 행정동 경계 파일(`public/seoul-dong.geojson`)의 타입.
 *
 * GeoJSON 표준 전체를 받지 않고 이 파일이 실제로 담고 있는 모양만 적는다.
 * 파일은 `scripts/build-seoul-geojson.mjs` 가 만들고, 속성 이름도 거기서 정한다 —
 * 원본(vuski/admdongkor)의 adm_cd2 앞 8자리를 dongCode 로 바꿔 둔 상태다.
 */

/** [경도, 위도] */
export type LngLat = [number, number]

/** 폴리곤 하나. 첫 번째가 외곽선, 나머지는 구멍 */
export type Ring = LngLat[]

export interface DongBoundaryProperties {
  /** seoul_commercial_data.dong_code 와 같은 8자리 */
  dongCode: string
  dongName: string
  districtName: string
}

export interface DongBoundaryFeature {
  type: 'Feature'
  properties: DongBoundaryProperties
  geometry:
    | { type: 'Polygon'; coordinates: Ring[] }
    | { type: 'MultiPolygon'; coordinates: Ring[][] }
}

export interface DongBoundaryCollection {
  type: 'FeatureCollection'
  features: DongBoundaryFeature[]
}

/** 한 동의 모든 폴리곤을 같은 모양으로 꺼낸다. Polygon 과 MultiPolygon 을 안 가리려고 */
export function toPolygons(feature: DongBoundaryFeature): Ring[][] {
  return feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates
}
