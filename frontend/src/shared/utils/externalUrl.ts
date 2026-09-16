/**
 * 바깥에서 온 URL 을 열기 전에 거르는 곳.
 *
 * 서버가 준 값이라고 안전한 게 아니다. 서류 양식·초안 주소(`templateUrl`·`draftUrl`)는
 * 공공데이터에서 흘러온 값이라 우리도 내용을 보증하지 못한다.
 */

/**
 * 브라우저에 넘겨도 되는 스킴.
 *
 * `javascript:` 가 핵심이다 — `window.open('javascript:...')` 이나 `<a href>` 에 들어가면
 * **우리 출처 권한으로 실행된다.** 토큰이 메모리에 있어도 같은 페이지의 스크립트라
 * 그대로 꺼내 갈 수 있다.
 *
 * `data:` 도 막는다. `data:text/html,<script>...` 로 페이지를 통째로 만들어 띄울 수 있다.
 * `blob:` 은 우리가 만든 것만 유효하지만, 지금 쓰는 곳이 없어 열어둘 이유가 없다.
 */
const SAFE_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * 열어도 되는 주소면 절대 URL 로, 아니면 null.
 *
 * 문자열을 직접 검사하지 않고 `URL` 에게 파싱을 맡긴다. 손으로 `startsWith('http')` 를
 * 보면 `java\tscript:` · `JaVaScRiPt:` · `%6Aavascript:` 같은 변형을 놓친다 —
 * 브라우저가 해석하는 방식과 같은 파서를 써야 같은 결론이 난다.
 *
 * **상대경로도 통과시킨다.** 서류 서식은 같은 출처에 올라가 있을 수 있다
 * (목 데이터가 `/mock/자금사용계획서_서식.hwpx` 형태다). `window.location.origin` 을
 * 기준으로 붙여서 절대 URL 로 만든다 — 막으려는 것은 '바깥 주소' 가 아니라
 * **'코드를 실행시키는 스킴'** 이라, 같은 출처 파일까지 막을 이유가 없다.
 *
 * 상대경로를 붙일 때도 스킴 검사를 건너뛰지 않는다. `javascript:...` 는 base 를 줘도
 * 그대로 `javascript:` 로 파싱돼서 아래 검사에 걸린다.
 *
 * ⚠️ '이 주소가 안전한가' 가 아니라 '이 스킴이 코드를 실행시킬 수 있는가' 만 본다.
 *    http 로 시작하는 피싱 주소는 여기서 막지 못한다 — 그건 서버가 출처를 검증할 몫이다.
 */
export function toSafeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null

  try {
    // base 를 주면 상대경로도 해석된다. 절대 URL 이면 base 는 무시된다
    const parsed = new URL(raw, window.location.origin)
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null
  } catch {
    // URL 로 해석되지 않는 값
    return null
  }
}
