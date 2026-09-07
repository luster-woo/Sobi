/**
 * 디자인 토큰 확인용 임시 화면입니다.
 * 실제 페이지 작업(127 라우팅)이 시작되면 교체됩니다.
 */
function App() {
  return (
    <div className="p-section flex min-h-screen items-center justify-center">
      <div className="bg-surface p-card shadow-card w-full max-w-md rounded-lg">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-h2">자동 이체 기록</h1>
          <span className="bg-primary-soft text-caption text-primary rounded-full px-2.5 py-1">
            등록됨
          </span>
        </div>

        <p className="text-body1 text-text-secondary">대구은행 ****-3412 · 매월 15일 출금</p>
        <p className="text-body2 text-text-muted">잔액 부족 시 재출금 3회</p>

        <div className="border-border my-4 border-t" />

        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-body2 text-text-muted">출금일</dt>
            <dd className="text-body2">2026. 8. 15</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-body2 text-text-muted">금액</dt>
            <dd className="text-h4">92만 원</dd>
          </div>
        </dl>

        <div className="mt-5 flex gap-2">
          <button className="bg-primary text-body1 text-text-inverse hover:bg-primary-hover active:bg-primary-active h-11 flex-1 rounded-md font-semibold">
            전체 보기
          </button>
          <button className="border-border-strong bg-surface text-body1 hover:bg-surface-muted h-11 flex-1 rounded-md border font-semibold">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
