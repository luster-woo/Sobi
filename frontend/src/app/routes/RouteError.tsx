import { useRouteError } from 'react-router'

/**
 * 라우트 렌더 중 던져진 에러를 받는다.
 * 이게 없으면 react-router 기본 화면이 뜨는데 스택 트레이스가 사용자에게 그대로 보인다.
 * 화면은 168 이후에 만든다.
 */
export function RouteError() {
  const error = useRouteError()

  if (import.meta.env.DEV) console.error(error)

  return <div>error</div>
}
