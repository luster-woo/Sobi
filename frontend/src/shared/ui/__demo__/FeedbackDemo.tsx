import { type ReactNode, useState } from 'react'

import { useUiStore } from '@/shared/lib/store/useUiStore'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Modal from '@/shared/ui/Modal'
import Skeleton from '@/shared/ui/Skeleton'
import Spinner from '@/shared/ui/Spinner'
import Toast from '@/shared/ui/Toast'
import ToastViewport from '@/shared/ui/ToastViewport'

/**
 * S15P21D101-170 확인용 데모.
 *
 * 피드백 컴포넌트 5종의 상태를 실제로 동작시켜 봅니다.
 * 프로덕션 화면이 아니며, 확인 방식(Storybook / 임시 라우트)이 정해지면 정리 대상입니다.
 *
 * ToastViewport 를 이 데모 안에서도 렌더하는 이유: 보는 방법이 main.tsx 에서 App 대신
 * 이 컴포넌트를 렌더하는 것이라, App.tsx 에 붙인 ToastViewport 가 마운트되지 않습니다.
 *
 * 보는 방법: src/main.tsx 에서 App 대신 이 컴포넌트를 렌더 (그 변경은 커밋하지 마세요)
 */

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-border bg-surface p-card space-y-4 rounded-lg border">
      <div>
        <h2 className="text-h3">{title}</h2>
        {hint && <p className="text-body2 text-text-muted mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** 아이콘 세트가 아직 없어서 데모에서만 쓰는 임시 아이콘 */
function BookmarkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  )
}

type OpenModal = 'md' | 'lg' | 'confirm' | 'long' | null

export default function FeedbackDemo() {
  const showToast = useUiStore((state) => state.showToast)
  const clearToasts = useUiStore((state) => state.clearToasts)
  const toastCount = useUiStore((state) => state.toasts.length)

  const [openModal, setOpenModal] = useState<OpenModal>(null)
  const close = () => setOpenModal(null)

  return (
    <div className="bg-bg min-h-screen">
      {/* 데모에서 토스트를 보려면 여기에도 뷰포트가 필요합니다 (위 주석 참고) */}
      <ToastViewport />

      <div className="gap-section mx-auto flex max-w-[880px] flex-col p-8">
        <header>
          <h1 className="text-h1">피드백 컴포넌트 확인</h1>
          <p className="text-body1 text-text-secondary mt-2">
            S15P21D101-170 · Spinner / Skeleton / EmptyState / Toast / Modal
          </p>
        </header>

        {/* ───────────── Spinner ───────────── */}
        <Section title="Spinner" hint="화면·영역 전체가 대기 중일 때. 진행률을 모를 때 씁니다">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <Spinner size={16} />
              <span className="text-caption text-text-muted">16</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size={24} />
              <span className="text-caption text-text-muted">24</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner />
              <span className="text-caption text-text-muted">48 (기본)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size={64} thickness={8} />
              <span className="text-caption text-text-muted">64 · thickness 8</span>
            </div>
          </div>

          <div className="border-border-subtle flex flex-col items-center border-t pt-6">
            <Spinner />
            <p className="text-h4 mt-6">금융 데이터를 안전하게 가져오는 중이에요</p>
            <p className="text-caption text-text-muted mt-1">09 · 12 화면에서 쓰이는 형태</p>
          </div>
        </Section>

        {/* ───────────── Skeleton ───────────── */}
        <Section title="Skeleton — variant" hint="rect · text · circle 세 가지 원시 블록">
          <div className="flex items-center gap-6">
            <Skeleton width={120} height={60} />
            <Skeleton variant="text" width={160} />
            <Skeleton variant="circle" width={44} />
          </div>
        </Section>

        <Section
          title="Skeleton — 조합 예시"
          hint="들어올 내용의 모양대로 쌓습니다. 로딩이 끝나도 레이아웃이 튀지 않습니다"
        >
          <div role="status" className="space-y-3">
            <span className="sr-only">대출 상품을 불러오는 중</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-border bg-surface p-card rounded-lg border">
                <Skeleton variant="text" width="40%" height={16} />
                <Skeleton variant="text" width="24%" height={12} className="mt-2" />
                <div className="mt-3 flex gap-2">
                  <Skeleton width={64} height={22} className="rounded-full" />
                  <Skeleton width={80} height={22} className="rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ───────────── EmptyState ───────────── */}
        <Section
          title="EmptyState — md"
          hint="화면·목록 전체가 비었을 때. 왜 비었는지 + 다음 행동을 함께 줍니다"
        >
          <EmptyState
            icon={<BookmarkIcon />}
            title="관심 목록이 비어 있어요"
            description="마음에 드는 상품을 저장하면 여기에 모아서 보여드려요."
            action={<Button variant="outline">대출 둘러보기</Button>}
          />
        </Section>

        <Section title="EmptyState — 아이콘·버튼 없이" hint="검색 결과 0건처럼 안내만 필요할 때">
          <EmptyState
            title="'키오스크' 검색 결과가 없어요"
            description="다른 키워드로 검색하거나 필터를 넓혀보세요."
          />
        </Section>

        <Section title="EmptyState — sm" hint="알림 패널(380px)처럼 좁은 영역">
          <div className="border-border mx-auto w-[380px] rounded-lg border">
            <EmptyState size="sm" title="새 알림이 없어요" />
          </div>
        </Section>

        {/* ───────────── Toast ───────────── */}
        <Section
          title="Toast — 스토어를 통해 띄우기"
          hint="useUiStore.showToast() 호출 → 우측 하단에 쌓이고 자동으로 사라집니다"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => showToast('계정 정보를 저장했어요')}>success (3초)</Button>
            <Button variant="secondary" onClick={() => showToast('마감이 3일 남았어요', 'warning')}>
              warning (4초)
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                showToast('요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.', 'danger')
              }
            >
              danger (5초)
            </Button>
            <Button variant="outline" onClick={clearToasts} disabled={toastCount === 0}>
              전체 닫기 ({toastCount})
            </Button>
          </div>
          <p className="text-caption text-text-muted">
            여러 번 눌러 쌓아보세요. 각 토스트가 자기 타이머로 따로 사라지고, X 로 먼저 닫아도
            타이머가 남지 않습니다.
          </p>
        </Section>

        <Section
          title="Toast — 모양만 확인"
          hint="스토어 없이 컴포넌트만 렌더한 것. 실제 배치는 ToastViewport 가 담당합니다"
        >
          <div className="flex flex-col items-start gap-3">
            <Toast
              message="계정 정보를 저장했어요"
              variant="success"
              duration={999_999}
              onDismiss={() => {}}
            />
            <Toast
              message="마감이 3일 남았어요"
              variant="warning"
              duration={999_999}
              onDismiss={() => {}}
            />
            <Toast
              message="요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."
              variant="danger"
              duration={999_999}
              onDismiss={() => {}}
            />
          </div>
        </Section>

        {/* ───────────── Modal ───────────── */}
        <Section
          title="Modal"
          hint="ESC · 오버레이 클릭 · X 로 닫힙니다. Tab 을 눌러도 모달 밖으로 나가지 않습니다"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setOpenModal('md')}>md (440)</Button>
            <Button variant="secondary" onClick={() => setOpenModal('lg')}>
              lg (720)
            </Button>
            <Button variant="danger" onClick={() => setOpenModal('confirm')}>
              오버레이 클릭 잠금
            </Button>
            <Button variant="outline" onClick={() => setOpenModal('long')}>
              본문이 긴 경우
            </Button>
          </div>
          <p className="text-caption text-text-muted">
            열고 나서 Tab 을 계속 눌러보세요. 마지막 요소에서 첫 요소로 돌아옵니다. 닫으면 열었던
            버튼으로 포커스가 되돌아갑니다.
          </p>
        </Section>
      </div>

      <Modal
        open={openModal === 'md'}
        onClose={close}
        title="연동을 해제하시겠어요?"
        description="해제하면 자금 진단 기능을 이용할 수 없어요."
        footer={
          <>
            <Button variant="outline" onClick={close}>
              취소
            </Button>
            <Button variant="danger" onClick={close}>
              해제하기
            </Button>
          </>
        }
      >
        <p className="text-body1">연동 해제 즉시 저장된 금융 정보가 파기되고,</p>
        <p className="text-body1">자격 판정 · 자금 조합 결과도 함께 삭제돼요.</p>
      </Modal>

      <Modal
        open={openModal === 'lg'}
        onClose={close}
        title="어떤 가게를 준비 중이세요?"
        description="입력한 조건으로 상권을 분석하고 필요한 지원금을 안내해요."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={close}>
              초기화
            </Button>
            <Button onClick={close}>상권 분석하기</Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-4">
          {['업종 대분류', '업종 중분류', '업종 소분류', '지역', '규모', '예산'].map((label) => (
            <div key={label} className="space-y-2">
              <p className="text-body2 font-semibold">{label}</p>
              <Skeleton height={44} />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={openModal === 'confirm'}
        onClose={close}
        title="정말 탈퇴하시겠어요?"
        description="탈퇴하면 아래 정보가 모두 삭제되고 복구할 수 없어요."
        closeOnOverlayClick={false}
        footer={
          <>
            <Button variant="outline" onClick={close}>
              돌아가기
            </Button>
            <Button variant="danger" onClick={close}>
              탈퇴하기
            </Button>
          </>
        }
      >
        <p className="text-body2 text-text-secondary">
          오버레이를 눌러도 닫히지 않습니다. 되돌릴 수 없는 작업이라 명시적으로 버튼을 눌러야
          합니다. (ESC 와 X 는 동작합니다)
        </p>
      </Modal>

      <Modal
        open={openModal === 'long'}
        onClose={close}
        title="서비스 이용약관"
        description="본문만 스크롤되고 제목·버튼은 자리에 남습니다."
        footer={<Button onClick={close}>확인</Button>}
      >
        <div className="space-y-4">
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} className="text-body2 text-text-secondary">
              제{i + 1}조 이 약관은 소상공인 도우미가 제공하는 서비스의 이용 조건과 절차, 이용자와
              회사의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          ))}
        </div>
      </Modal>
    </div>
  )
}
