/**
 * Button·Input·Select 가 공유하는 컨트롤 높이.
 *
 * 같은 size 이름이면 높이가 같아야 한다. 예전에는 컴포넌트마다 따로 적어서
 * sm 이 Button 34px · Select 30px 로 갈렸고, 필터 바에 둘을 나란히 놓으면 높이가 안 맞았다.
 *
 * 좌우 여백·글자 크기는 컴포넌트마다 다르다 (Select 는 화살표 자리를 비워야 한다).
 * 여기서 맞추는 것은 높이뿐이다.
 *
 * xl 은 Input·Select 만 쓴다 — 큰 창의 폼이고, 버튼에는 그만한 높이가 필요 없다.
 */
export const CONTROL_HEIGHT = {
  sm: 'h-[34px]',
  md: 'h-[42px]',
  lg: 'h-[48px]',
  xl: 'h-[56px]',
} as const

export type ControlSize = keyof typeof CONTROL_HEIGHT
