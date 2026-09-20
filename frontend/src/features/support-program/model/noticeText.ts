/**
 * 공고 본문을 읽을 수 있는 줄로 나눈다.
 *
 * 공공데이터가 개요·신청방법을 줄바꿈 없이 한 덩어리로 준다. 원문에는 글머리표가
 * 남아 있어서 그 자리를 줄의 시작으로 본다.
 *
 *   ※ ☞ ▶ ○ □ ●   안내·주의 문단의 시작
 *   앞뒤가 띄어쓰기인 -   상위 항목 아래 딸린 세부 항목
 *
 * 하이픈은 앞뒤 공백을 같이 봐야 한다. 그냥 '-' 로 자르면 전화번호(1600-6185),
 * 우편번호, '고용ㆍ산재' 같은 값이 가운데서 끊긴다.
 *
 * 내용은 건드리지 않는다. 글머리표도 지우지 않는다 — 원문에 있던 기호라 사용자가
 * 공고문 원본과 대조할 때 같은 모양이어야 한다.
 */

/** 문단을 여는 기호. 이 앞에서 줄을 끊는다 */
const BLOCK_MARKER = /(?=[※☞▶◆○□●■])/g

/** 앞뒤가 공백인 하이픈. 세부 항목의 시작으로 본다 */
const SUB_ITEM = /\s+-\s+/g

export interface NoticeLine {
  text: string
  /** 1 이면 세부 항목. 들여쓴다 */
  depth: 0 | 1
}

export function toNoticeLines(raw: string): NoticeLine[] {
  const withBreaks = raw
    // 원문에 줄바꿈이 이미 있으면 그것도 살린다
    .replace(/\r\n?/g, '\n')
    .replace(SUB_ITEM, '\n- ')
    .replace(BLOCK_MARKER, '\n')

  return withBreaks
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .map((text) => ({ text, depth: text.startsWith('- ') ? 1 : 0 }))
}
