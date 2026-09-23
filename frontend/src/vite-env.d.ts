/// <reference types="vite/client" />

/**
 * 직접 정의한 환경변수. vite/client 의 `ImportMetaEnv` 에 병합된다.
 *
 * Vite 는 값을 문자열로만 주입하므로 boolean 이 아니라 `'true'` 문자열로 비교한다.
 */
interface ImportMetaEnv {
  /** MSW 를 켤지. `'true'` 일 때만 켜진다 */
  readonly VITE_USE_MOCK?: string

  /**
   * 목을 등록할 도메인. 쉼표로 구분하고, 비어 있으면 전부 등록한다.
   *
   * 등록해도 실서버가 응답하면 실서버가 이긴다 — 목은 백엔드에 없는 엔드포인트만 받는다.
   * 값은 `mocks/handlers/index.ts` 의 `MockDomain` 과 같아야 한다.
   */
  readonly VITE_MOCK_DOMAINS?: string

  /**
   * 실서버가 응답해도 목을 쓸 도메인.
   *
   * 백엔드는 있는데 응답 모양이 아직 화면과 안 맞는 시기에만 쓴다.
   */
  readonly VITE_MOCK_FORCE?: string

  /**
   * 마이데이터 갱신 쿨다운(분). 비어 있으면 1440 — 백엔드 기본값 `24h` 와 같다.
   *
   * ⚠️ 실제로 막는 것은 서버(`mydata.refresh-cooldown`)다. 이 값은 '지금 갱신' 버튼을
   *    미리 잠그는 데만 쓰므로 **서버 설정과 같은 값이어야 한다.**
   */
  readonly VITE_MYDATA_REFRESH_COOLDOWN_MINUTES?: string

  /**
   * 구글 OAuth 클라이언트 ID. 비어 있으면 구글 버튼이 비활성화된다.
   *
   * 공개값이라 빌드에 박혀도 된다 — 비밀은 clientSecret 이고 서버만 가진다.
   */
  readonly VITE_GOOGLE_CLIENT_ID?: string

  /**
   * 구글이 인가 코드를 돌려보낼 주소.
   *
   * ⚠️ 구글 콘솔의 '승인된 리디렉션 URI' 와 글자 하나까지 같아야 한다.
   *    생략하면 `{현재 origin}/oauth/google` 을 쓴다.
   */
  readonly VITE_GOOGLE_REDIRECT_URI?: string
}
