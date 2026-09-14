import type { HttpHandler } from 'msw'

import { createServerFirstProbes } from '@/mocks/lib/serverFirst'

import { accountHandlers } from './account'
import { applicationHandlers } from './application'
import { authHandlers } from './auth'
import { businessHandlers } from './business'
import { fundingHandlers } from './funding'
import { loanHandlers } from './loan'
import { marketHandlers } from './market'
import { notificationHandlers } from './notification'
import { repaymentHandlers } from './repayment'
import { supportHandlers } from './support'

/** 새 도메인이 생기면 `handlers/{도메인}.ts` 를 만들고 여기에 추가한다 */
const HANDLERS_BY_DOMAIN = {
  account: accountHandlers,
  application: applicationHandlers,
  auth: authHandlers,
  business: businessHandlers,
  funding: fundingHandlers,
  loan: loanHandlers,
  market: marketHandlers,
  notification: notificationHandlers,
  repayment: repaymentHandlers,
  support: supportHandlers,
} as const

export type MockDomain = keyof typeof HANDLERS_BY_DOMAIN

const ALL_DOMAINS = Object.keys(HANDLERS_BY_DOMAIN) as MockDomain[]

function isMockDomain(value: string): value is MockDomain {
  return value in HANDLERS_BY_DOMAIN
}

function parseDomains(raw: string | undefined): MockDomain[] {
  const requested = (raw ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

  const unknown = requested.filter((name) => !isMockDomain(name))
  if (unknown.length > 0) {
    console.warn(`[MSW] 알 수 없는 도메인: ${unknown.join(', ')} — 환경변수를 확인하세요.`)
  }

  return requested.filter(isMockDomain)
}

interface CreateHandlersOptions {
  /** 목을 등록할 도메인. 비어 있으면 전부 */
  domains?: string
  /** 실서버가 응답해도 무조건 목을 쓸 도메인 */
  force?: string
}

/**
 * MSW 핸들러를 만든다.
 *
 * 기본은 **실서버 우선**이다. 백엔드에 있는 엔드포인트는 실서버가 응답하고,
 * 아직 없는 것만 목이 받는다. 연동이 끝나면 따로 설정을 고칠 필요 없이 자동으로
 * 목에서 빠진다 (`lib/serverFirst.ts`).
 *
 * 두 가지 경우에만 손으로 개입한다.
 *   - `VITE_MOCK_DOMAINS` — 목을 아예 등록하지 않을 도메인을 고를 때
 *   - `VITE_MOCK_FORCE`   — 서버가 응답하는데도 목을 쓰고 싶을 때.
 *     백엔드는 있는데 응답 모양이 아직 화면과 안 맞는 시기에 쓴다
 */
export function createHandlers({
  domains = import.meta.env.VITE_MOCK_DOMAINS,
  force = import.meta.env.VITE_MOCK_FORCE,
}: CreateHandlersOptions = {}): HttpHandler[] {
  const selected = domains?.trim() ? parseDomains(domains) : ALL_DOMAINS
  const forced = parseDomains(force)

  const serverFirst = selected.filter((domain) => !forced.includes(domain))

  console.info(
    `[MSW] 실서버 우선: ${serverFirst.join(', ') || '없음'}` +
      (forced.length > 0 ? ` / 목 강제: ${forced.join(', ')}` : ''),
  )

  const serverFirstHandlers = serverFirst.flatMap<HttpHandler>(
    (domain) => HANDLERS_BY_DOMAIN[domain],
  )
  const forcedHandlers = forced.flatMap<HttpHandler>((domain) => HANDLERS_BY_DOMAIN[domain])

  /*
   * 순서가 중요하다. MSW 는 먼저 등록된 핸들러부터 본다.
   *   1. 목 강제 도메인 — 실서버를 아예 안 물어본다
   *   2. 탐지 핸들러    — 실서버에 쏴보고, 없으면 undefined 로 다음에 넘긴다
   *   3. 목 핸들러      — 2 가 넘긴 것만 받는다
   */
  return [
    ...forcedHandlers,
    ...createServerFirstProbes(serverFirstHandlers),
    ...serverFirstHandlers,
  ]
}
