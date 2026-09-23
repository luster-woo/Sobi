/**
 * 화면에 그대로 띄우면 안 되는 값을 가린다 (S15P21D101-395).
 *
 * 로그인한 본인 화면이라도 전체를 보여줄 이유가 거의 없다. 데모·화면 공유·어깨너머로
 * 새어 나가고, 스크린샷이 채팅방에 그대로 올라간다.
 *
 * ⚠️ **표시만 가린다.** 원본은 그대로 들고 있고 서버로도 원본을 보낸다 — 계좌 선택처럼
 *    값을 골라 제출해야 하는 자리가 있어서다. 가린 문자열을 서버에 보내지 말 것.
 *
 * 왜 `shared` 인가: 원래 `features/loan-repayment/model/format.ts` 에만 있어서 상환
 * 화면 세 곳에서만 쓰였고, 신청 화면은 계좌번호를 통째로 노출하고 있었다. 한 군데
 * 두면 새 화면을 만들 때 찾아 쓰게 된다.
 */

/**
 * 계좌번호 뒷자리만. `'0324003842129948'` → `'****-9948'`
 *
 * 뒤 4자리를 남기는 건 본인이 어느 계좌인지 알아볼 최소한이다. 은행 앱·영수증도
 * 같은 관행이라 사용자가 따로 배울 것이 없다.
 */
export function maskAccountNo(accountNo: string | null | undefined): string {
  if (!accountNo) return '-'

  /*
   * 짧으면 가리는 의미가 없다. 4자리 이하를 그대로 통과시키면 `****-1234` 가 되어
   * 마스킹한 모양으로 원본을 전부 보여주게 된다 — 가렸다고 착각하기 쉬운 자리다.
   */
  if (accountNo.length <= 4) return '-'

  return `****-${accountNo.slice(-4)}`
}

/**
 * 사업자등록번호 가운데를 가린다. `'1234567890'` · `'123-45-67890'` → `'123-**-*7890'`
 *
 * 앞 세 자리(청 코드)와 뒤 네 자리만 남기고 **가운데 세 자리**를 가린다. 그 자리는
 * 개인/법인 구분 코드와 일련번호 앞부분이라 가려도 본인 확인에 지장이 없다.
 *
 * ⚠️ 사업자등록번호는 공개 정보로 오해하기 쉬운데, 이름·개업일과 함께 있으면
 *    국세청 진위확인을 그대로 통과하는 조합이 된다(`/business/verify` 가 셋을 받는다).
 *    한 화면에 셋이 같이 뜨는 자리에서는 반드시 가릴 것.
 */
export function maskBizNo(brn: string | null | undefined): string {
  if (!brn) return '-'

  const digits = brn.replace(/\D/g, '')
  if (digits.length !== 10) return '-'

  return `${digits.slice(0, 3)}-**-*${digits.slice(6)}`
}

/**
 * 이메일 아이디 부분을 줄인다. `'moongye2001a@gmail.com'` → `'moo****@gmail.com'`
 *
 * 도메인은 남긴다 — 어느 계정으로 가입했는지 본인이 알아보는 단서가 대개 그쪽이다.
 * 아이디가 세 글자 이하면 첫 글자만 남긴다.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '-'

  const at = email.lastIndexOf('@')
  if (at <= 0) return '-'

  const id = email.slice(0, at)
  const domain = email.slice(at)

  /*
   * 두 글자 이하는 한 글자도 안 남긴다. 한 글자만 남겨도 아이디의 절반 이상이
   * 그대로 보여서, 가린 모양만 갖추고 실제로는 가리지 못한다
   * (`maskAccountNo` 가 4자리 이하를 '-' 로 막는 것과 같은 기준).
   */
  const head = id.length <= 2 ? '' : id.slice(0, id.length > 3 ? 3 : 1)

  return `${head}****${domain}`
}
