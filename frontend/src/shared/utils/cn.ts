import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * index.css 의 @theme 토큰을 tailwind-merge 에 알려준다.
 *
 * 이게 없으면 text-body2(글자 크기)를 색으로 오인해 text-danger 와 같은 그룹으로 묶고
 * 둘 중 하나를 버린다. 키 이름은 Tailwind v4 의 @theme 네임스페이스와 같다
 * (--text-* → text, --spacing-* → spacing, --shadow-* → shadow, --font-* → font).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['h1', 'h2', 'h3', 'h4', 'body1', 'body2', 'caption'],
      spacing: ['card', 'section', 'header', 'sidebar', 'sidebar-rail'],
      shadow: ['card', 'modal', 'dropdown'],
      font: ['heading', 'sans'],
    },
  },
})

/**
 * 조건부 className 을 합칩니다.
 * 같은 속성이 겹치면 **뒤에 오는 쪽**이 이깁니다 — 바깥에서 넘긴 className 으로
 * 컴포넌트 기본값을 덮을 수 있습니다.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes))
}
