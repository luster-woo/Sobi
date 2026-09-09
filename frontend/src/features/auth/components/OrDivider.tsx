/** 기본 제출 버튼과 소셜 버튼 사이의 "또는" 구분선 */
export default function OrDivider() {
  return (
    <div className="text-caption text-text-muted my-[18px] flex items-center gap-3">
      <span className="bg-border h-px flex-1" />
      또는
      <span className="bg-border h-px flex-1" />
    </div>
  )
}
