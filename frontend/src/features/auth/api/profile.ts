import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
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
 * 구글 가입자의 이름·생년월일 저장.
 *
 * 구글은 생일을 주지 않아 `users.birth_date` 가 비어 있고(V23 마이그레이션 주석),
 * 이름은 구글 프로필 이름이 들어가 있다(`AuthServiceImpl` 의 `.name(googleUser.getName())`).
 * 실명이 아닐 수 있어 둘 다 로그인 직후에 확인받는다. 로컬 가입은 `SignupRequest` 에서
 * 이미 받으므로 이 흐름을 타지 않는다.
 *
 * ⚠️ 경로 이름이 `birth-date` 인데 **이름도 같이 받는다.** 백엔드가 생년월일만 받던
 *    엔드포인트에 `name` 을 더한 것이라(`BirthDateRequest`) 이름과 실제가 어긋나 있다.
 *    서버는 `User.updateProfile(name, birthDate)` 로 둘을 함께 저장한다.
 *
 * 응답으로 저장된 값을 받아 세션을 갱신한다 — 서버가 공백을 다듬는 등 손볼 여지를
 * 남겨두려는 것이다.
 */
export async function updateProfile(body: ProfileSetupRequest) {
  const { data } = await api.patch<ProfileSetupResponse>(endpoints.user.birthDate, body)
  return data
}
