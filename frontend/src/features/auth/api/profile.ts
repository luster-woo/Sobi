import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ISODate } from '@/shared/types'

export interface ProfileSetupRequest {
  /** 실명. 백엔드 `@NotBlank @Size(max = 100)` — `SignupRequest.name` 과 같은 규칙 */
  name: string
  /** 'YYYY-MM-DD'. 백엔드 `@NotNull @Past` — 오늘은 안 된다 */
  birthDate: ISODate
}

/** 저장된 값을 되돌려 준다. 보낸 값을 그대로 쓰지 않는 이유는 아래 주석 참고 */
type ProfileSetupResponse = ProfileSetupRequest

/**
 * 구글 가입자의 이름·생년월일 저장.
 *
 * 구글은 생일을 주지 않아 `users.birth_date` 가 비어 있고(V23 마이그레이션 주석),
 * 이름은 구글 프로필 이름이 들어가 있다(`AuthServiceImpl` 의 `.name(googleUser.getName())`).
 * 실명이 아닐 수 있어 둘 다 로그인 직후에 확인받는다. 로컬 가입은 `SignupRequest` 에서
 * 이미 받으므로 이 흐름을 타지 않는다.
 *
 * 둘을 한 요청으로 보낸다. 나눠 보내면 이름만 저장되고 생년월일은 실패하는 경우가
 * 생기는데, 화면에서 그 반쪽 상태를 사용자에게 설명할 방법이 없다.
 *
 * 응답으로 저장된 값을 받아 세션을 갱신한다 — 서버가 공백을 다듬는 등 손볼 여지를
 * 남겨두려는 것이다.
 *
 * ⚠️ **백엔드 작업 대기 중이다.** 지금 있는 것은 `PATCH /user/birth-date`(생년월일만)뿐이고,
 *    이름까지 받는 `PATCH /user/profile` 은 요청해 둔 상태다. 그때까지는 목이 받는다 —
 *    `mocks/lib/serverFirst.ts` 의 `MOCK_ONLY` 참고.
 */
export async function updateProfile(body: ProfileSetupRequest) {
  const { data } = await api.patch<ProfileSetupResponse>(endpoints.user.profile, body)
  return data
}
