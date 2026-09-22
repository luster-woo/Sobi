interface ClosingCtaProps {
  onStart: () => void
}

/**
 * 랜딩 마지막 전환 배너.
 * primary 면 위라 흰 버튼이 필요해서 공용 Button 을 쓰지 않았다.
 */
export default function ClosingCta({ onStart }: ClosingCtaProps) {
  return (
    <section className="bg-primary px-6 py-9 text-center">
      <h2 className="text-h2 text-text-inverse tracking-[-0.02em]">
        지금 받을 수 있는 정책자금부터 확인해 보세요
      </h2>

      <p className="text-body2 mt-2.5 mb-5 text-white/75">수수료 0원 · 마이데이터 연동만 하면 끝</p>

      <button
        type="button"
        onClick={onStart}
        className="font-heading text-primary text-body1 inline-flex h-[42px] items-center justify-center rounded-sm bg-white px-4 font-medium transition-opacity hover:opacity-90"
      >
        무료로 시작하기
      </button>
    </section>
  )
}
