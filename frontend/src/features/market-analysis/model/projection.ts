import type { DongBoundaryFeature, LngLat, Ring } from '@/features/market-analysis/model/boundaryTypes'
import { toPolygons } from '@/features/market-analysis/model/boundaryTypes'

/**
 * 위경도를 SVG 좌표로.
 *
 * 지도 라이브러리를 쓰지 않는다. 화면에 올리는 건 행정동 여덟 개뿐이고, 확대·이동도
 * 없어서 투영 한 줄이면 충분하다. 라이브러리를 들이면 번들이 커지고 팀이 새 API 를
 * 하나 더 배워야 한다.
 *
 * 경도 1도와 위도 1도는 길이가 다르다. 서울(북위 약 37.55도)에서 경도 1도는 위도
 * 1도의 cos(37.55°) ≈ 0.79 배다. 이 보정을 빼면 지도가 가로로 늘어나 보인다.
 * 서울 전체가 위도 0.25도 안에 들어가서 이 한 번의 보정으로 눈에 띄는 왜곡은 없다.
 *
 * y 를 뒤집는 이유는 SVG 의 y 가 아래로 자라기 때문이다. 위도는 위로 자란다.
 */
const SEOUL_LAT = 37.55
const LNG_SCALE = Math.cos((SEOUL_LAT * Math.PI) / 180)

export interface ProjectedDong {
  dongCode: string
  dongName: string
  /** SVG path 의 d 속성 */
  path: string
  /** 이름표를 놓을 자리 */
  labelX: number
  labelY: number
  /**
   * 투영 뒤 이 동이 차지하는 가로·세로 크기.
   *
   * 이름표를 넣을 자리가 되는지 판단하는 데 쓴다. 자치구에 따라 동 하나가 화면에서
   * 20px 도 안 되는 경우가 있는데, 거기에 이름과 값을 밀어 넣으면 옆 동 글자와
   * 뒤엉켜 무엇 하나도 읽히지 않는다.
   */
  width: number
  height: number
}

export interface Projection {
  width: number
  height: number
  dongs: ProjectedDong[]
}

/**
 * 지도 그림의 기준 크기. 실제 표시 크기는 CSS 가 정하고 여기서는 비율만 잡는다.
 *
 * 확대·축소가 viewBox 를 직접 옮기므로 화면 쪽도 같은 값을 알아야 한다. 두 곳에
 * 따로 적으면 한쪽만 고쳤을 때 지도가 어긋난 채로 잘린다.
 */
export const MAP_WIDTH = 560
export const MAP_HEIGHT = 380
const VIEW_WIDTH = MAP_WIDTH
const VIEW_HEIGHT = MAP_HEIGHT
/**
 * 테두리선과 이름표가 잘리지 않게 두는 여백.
 *
 * 좁은 동은 이름이 경계 밖으로 넘친다. 그 글자가 viewBox 를 벗어나면 잘리므로
 * 선 두께가 아니라 이름표 한 줄이 들어갈 만큼 잡는다.
 */
const PADDING = 22

/**
 * 링 하나의 무게중심.
 *
 * 이름표 자리로 쓴다. 단순히 사각 경계의 한가운데를 쓰면 ㄱ 자로 굽은 동에서 이름이
 * 동 바깥에 떨어진다. 넓이로 가중한 중심을 구하면 그 경우에도 안쪽에 들어온다.
 *
 * 넓이가 0 이면(점이 일직선이면) 나눗셈이 깨지므로 그때는 첫 점을 쓴다.
 */
function centroidOf(ring: Ring): LngLat {
  let twiceArea = 0
  let x = 0
  let y = 0

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    twiceArea += cross
    x += (ring[j][0] + ring[i][0]) * cross
    y += (ring[j][1] + ring[i][1]) * cross
  }

  if (twiceArea === 0) return ring[0]

  return [x / (3 * twiceArea), y / (3 * twiceArea)]
}

/** 여러 폴리곤 중 가장 넓은 것의 외곽선. 이름표는 본섬에 놓아야 한다 */
function mainRing(feature: DongBoundaryFeature): Ring {
  const outers = toPolygons(feature).map((polygon) => polygon[0])

  return outers.reduce((widest, ring) => (ring.length > widest.length ? ring : widest), outers[0])
}

/**
 * 고른 동들을 한 장의 그림으로.
 *
 * 축척을 동들의 전체 경계에 맞춰 잡는다. 서울 전체 기준으로 잡으면 마포구 여덟 개가
 * 화면 구석의 점이 된다. 가로·세로 중 더 빡빡한 쪽에 맞춰야 그림이 잘리지 않는다.
 *
 * 경계를 못 찾은 동은 그냥 빠진다. 행정동이 개편되면 상권 데이터(과거 분기)와 경계
 * 파일(최신)이 어긋나는데, 그때 화면 전체를 못 그리는 것보다 그 동만 없는 편이 낫다.
 */
export function projectDongs(
  dongCodes: readonly string[],
  boundaries: Map<string, DongBoundaryFeature>,
): Projection | null {
  const features = dongCodes
    .map((code) => boundaries.get(code))
    .filter((feature): feature is DongBoundaryFeature => feature !== undefined)

  if (features.length === 0) return null

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  const toXY = ([lng, lat]: LngLat): LngLat => [lng * LNG_SCALE, -lat]

  for (const feature of features) {
    for (const polygon of toPolygons(feature)) {
      for (const ring of polygon) {
        for (const point of ring) {
          const [x, y] = toXY(point)
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
  }

  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = Math.min((VIEW_WIDTH - PADDING * 2) / spanX, (VIEW_HEIGHT - PADDING * 2) / spanY)

  // 남는 쪽은 가운데로 민다. 한쪽에 몰리면 지도가 치우쳐 보인다
  const offsetX = (VIEW_WIDTH - spanX * scale) / 2
  const offsetY = (VIEW_HEIGHT - spanY * scale) / 2

  const place = (point: LngLat): LngLat => {
    const [x, y] = toXY(point)
    return [(x - minX) * scale + offsetX, (y - minY) * scale + offsetY]
  }

  /** 소수점은 한 자리면 충분하다. 다 쓰면 path 문자열만 길어진다 */
  const round = (value: number) => Math.round(value * 10) / 10

  const dongs = features.map((feature) => {
    const path = toPolygons(feature)
      .flat()
      .map((ring) => {
        const points = ring.map(place).map(([x, y]) => `${round(x)},${round(y)}`)
        return `M${points.join('L')}Z`
      })
      .join('')

    const [labelX, labelY] = place(centroidOf(mainRing(feature)))

    /* 이름표 자리를 재려면 이 동만의 경계가 필요하다. 전체 bbox 로는 알 수 없다 */
    let left = Infinity
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity

    for (const polygon of toPolygons(feature)) {
      for (const ring of polygon) {
        for (const point of ring) {
          const [x, y] = place(point)
          if (x < left) left = x
          if (x > right) right = x
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }

    return {
      dongCode: feature.properties.dongCode,
      dongName: feature.properties.dongName,
      path,
      labelX: round(labelX),
      labelY: round(labelY),
      width: round(right - left),
      height: round(bottom - top),
    }
  })

  return { width: VIEW_WIDTH, height: VIEW_HEIGHT, dongs }
}
