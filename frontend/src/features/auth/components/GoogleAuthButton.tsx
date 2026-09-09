interface GoogleAuthButtonProps {
  /** '계속하기'(로그인) · '가입'(회원가입) 처럼 화면마다 다르다 */
  label: string
  onClick?: () => void
  disabled?: boolean
}

/**
 * 로고는 브랜드 자산이라 currentColor 를 쓰지 않는다. Google 지침이 원색 유지를 요구한다.
 * 그래서 shared/ui/icons 에 두지 않고 이 파일에 붙여둔다.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.5h11.9c-.2 2-1.5 5-4.4 7l6.8 5.3C42.3 36.2 45 30.7 45 24z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.3-5.3l-6.8-5.3c-1.9 1.3-4.4 2.2-7.5 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 40.6 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z"
      />
      <path
        fill="#EA4335"
        d="M24 10.3c4.1 0 6.9 1.8 8.5 3.3l6-5.9C34.9 4.3 29.9 2 24 2 15.4 2 8 7.4 4.4 14l7.1 5.5C13.3 14.1 18.2 10.3 24 10.3z"
      />
    </svg>
  )
}

/**
 * 공용 Button 을 쓰지 않았다. outline variant 는 텍스트만 가운데 두는데, 여기는
 * 로고와 문구를 함께 중앙 정렬해야 하고 로고 색이 토큰을 따르지 않는다.
 */
export default function GoogleAuthButton({ label, onClick, disabled }: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-border-strong bg-surface text-text hover:bg-surface-muted font-heading text-body1 flex h-[42px] w-full items-center justify-center gap-2 rounded-sm border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GoogleMark />
      Google로 {label}
    </button>
  )
}
