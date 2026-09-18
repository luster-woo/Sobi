import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { LoginResponse, OAuthLoginRequest, SocialLinkResponse } from '@/shared/types'

/**
 * 소셜 로그인·회원가입. 응답은 이메일 로그인과 같은 모양이고,
 * 처음 가입한 계정이면 `isNewUser: true` 가 붙는다.
 */
export async function loginWithOAuth(provider: string, body: OAuthLoginRequest) {
  const { data } = await api.post<LoginResponse>(endpoints.auth.oauth(provider), body)
  return data
}

/** 로컬 계정을 소셜로 전환. **로그인 상태에서만** 부른다. 계정 이메일과 구글 이메일이 다르면 AUTH_016 */
export async function linkSocialAccount(provider: string, body: OAuthLoginRequest) {
  const { data } = await api.post<SocialLinkResponse>(endpoints.auth.social(provider), body)
  return data
}
