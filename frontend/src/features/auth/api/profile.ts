import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { getErrorStatus } from '@/shared/api/errors'
import type { ISODate } from '@/shared/types'

export interface ProfileSetupRequest {
  /** 실명. 백엔드 `@NotBlank @Size(max = 100)` — `SignupRequest.name` 과 같은 규칙 */
  name: string
  /** 'YYYY-MM-DD'. 백엔드 `@NotNull @Past` — 오늘은 안 된다 */
  birthDate: ISODate
}

/** 서버가 저장된 값을 되돌려 준다 */
type ProfileSetupResponse = ProfileSetupRequest

/**
 * 매핑이 없어서 실패했는가.
 *
 * ⚠️ 404 만으로는 안 된다. `GlobalExceptionHandler` 가 `@ExceptionHandler(Exception.class)`
 *    캐치올을 두고 있어서, 매핑 없는 경로가 던지는 `NoResourceFoundException` 까지 잡아
 *    **500 + 공통 봉투**로 만들어 낸다. 그래서 둘 다 본다.
 *
 *    400 은 여기 해당하지 않는다 — 그건 서버가 요청을 받았고 값이 틀렸다는 뜻이라
 *    폴백하면 안 되고 그대로 보여줘야 한다.
 */
function isNotImplemented(error: unknown): boolean {
  const status = getErrorStatus(error)
  return status === 404 || status === 405 || status === 500
}

/**
 * 구글 가입자의 이름·생년월일 저장.
 *
 * 구글은 생일을 주지 않아 `users.birth_date` 가 비어 있고(V23 마이그레이션 주석),
 * 이름은 구글 프로필 이름이 들어가 있다(`AuthServiceImpl` 의 `.name(googleUser.getName())`).
 * 로컬 가입은 `SignupRequest` 에서 이미 받으므로 이 흐름을 타지 않는다.
 *
 * ⚠️ **두 엔드포인트를 순서대로 시도한다.**
 *
 *    `PATCH /user/profile`(이름+생년월일)은 요청해 뒀지만 아직 백엔드에 없다.
 *    그것만 부르면 배포 환경에서 구글 온보딩이 통째로 막힌다 — 생년월일이 없으면
 *    자격 판정을 못 돌리므로 그 사용자는 서비스를 쓸 수가 없다.
 *
 *    그래서 없으면 `PATCH /user/birth-date`(생년월일만, 백엔드에 있음)로 떨어진다.
 *    이름은 구글이 준 값이 그대로 남는다 — 저장할 곳이 없다.
 *
 *    백엔드에 `/user/profile` 이 올라오면 **코드를 고치지 않아도** 첫 시도가 성공해서
 *    이름까지 저장된다. 그때 이 폴백과 `mocks/lib/serverFirst.ts` 의 `MOCK_ONLY` 줄을
 *    같이 지우면 된다.
 */
export async function updateProfile(body: ProfileSetupRequest) {
  try {
    const { data } = await api.patch<ProfileSetupResponse>(endpoints.user.profile, body)
    return data
  } catch (error) {
    if (!isNotImplemented(error)) throw error

    console.warn('[auth] /user/profile 이 없어 생년월일만 저장합니다. 이름은 구글 값을 유지합니다.')

    const { data } = await api.patch<{ birthDate: ISODate }>(endpoints.user.birthDate, {
      birthDate: body.birthDate,
    })

    // 서버가 이름을 안 돌려주므로 화면이 알고 있던 값을 그대로 쓴다
    return { name: body.name, birthDate: data.birthDate }
  }
}
