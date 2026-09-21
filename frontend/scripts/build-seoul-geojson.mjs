/**
 * 전국 행정동 경계에서 서울만 뽑아 상권 분석 지도용 파일을 만든다.
 *
 * 원본   https://github.com/vuski/admdongkor  (CC BY 4.0)
 *        원본의 원본은 통계청 SGIS — 공공누리 1유형이라 출처 표기가 의무다.
 *        화면 하단에 한 줄 넣어야 한다.
 *
 * 실행   node frontend/scripts/build-seoul-geojson.mjs <내려받은 파일 경로>
 *
 * 이 스크립트를 저장소에 남기는 이유는 결과물만 커밋하면 출처와 가공 방법이
 * 사라지기 때문이다. 경계가 개편돼 파일을 갱신할 때 이 스크립트를 다시 돌리면 된다.
 *
 * ⚠️ 조인 키는 adm_cd2 의 앞 8자리다. 같은 파일에 adm_cd(통계청 8자리)도 있는데
 *    우리 seoul_commercial_data.dong_code 와 체계가 달라 425개 중 32개만 맞는다.
 *    adm_cd2 앞 8자리는 422개가 맞는다. 나머지 3개(강동구 상일동·강남구 일원2동·
 *    동대문구 용신동)는 행정동 개편 시차라 지도에 안 나온다.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const input = process.argv[2]

if (!input) {
  console.error('사용법: node frontend/scripts/build-seoul-geojson.mjs <HangJeongDong_*.geojson>')
  process.exit(1)
}

const OUTPUT = 'frontend/public/seoul-dong.geojson'

/** 서울시 sido 코드 */
const SEOUL = '11'

/**
 * 좌표 소수점 자리. 5 면 약 1m 다.
 * 행정동 경계를 화면 폭 1000px 안에 그리는 데는 넘치도록 충분하다.
 */
const PRECISION = 5

function round(value) {
  if (!Array.isArray(value)) return value
  if (typeof value[0] === 'number') {
    return [Number(value[0].toFixed(PRECISION)), Number(value[1].toFixed(PRECISION))]
  }
  return value.map(round)
}

const source = JSON.parse(readFileSync(input, 'utf8'))

const features = source.features
  .filter((feature) => feature.properties.sido === SEOUL)
  .map((feature) => ({
    type: 'Feature',
    properties: {
      // 우리 dong_code 와 같은 8자리로 맞춰 둔다. 화면에서 다시 자를 일이 없게
      dongCode: feature.properties.adm_cd2.slice(0, 8),
      dongName: feature.properties.adm_nm.split(' ').at(-1),
      districtName: feature.properties.sggnm,
    },
    geometry: {
      type: feature.geometry.type,
      coordinates: round(feature.geometry.coordinates),
    },
  }))

// 들여쓰기 없이 쓴다. 사람이 읽을 파일이 아니고, 들여쓰면 크기가 두 배가 된다
writeFileSync(OUTPUT, JSON.stringify({ type: 'FeatureCollection', features }))

const kb = Math.round(readFileSync(OUTPUT).length / 1024)

console.log(`행정동 ${features.length}개 → ${OUTPUT} (${kb} KB)`)

// 눈으로 확인할 수 있게 한 건만 찍는다. 11440660 이 서교동이어야 맞다
const seogyo = features.find((feature) => feature.properties.dongCode === '11440660')
console.log(`확인: 11440660 = ${seogyo ? seogyo.properties.dongName : '없음 ← 코드 체계 확인 필요'}`)
