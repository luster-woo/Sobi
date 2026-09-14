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
}
