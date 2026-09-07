import { useState } from 'react'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import Card, { CardHeader, CardDivider, CardRow } from '@/shared/ui/Card'
import Input from '@/shared/ui/Input'
import Modal from '@/shared/ui/Modal'

export default function GalleryPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="p-10 space-y-8">
      <section className="space-y-3">
        <h2 className="typo-h3">variants</h2>
        <div className="flex gap-3">
          <Button>사업자 인증</Button>
          <Button variant="secondary">검색</Button>
          <Button variant="outline">다시 조회</Button>
          <Button variant="danger">회원 탈퇴</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="typo-h3">sizes</h2>
        <div className="flex items-center gap-3">
          <Button size="sm">저장</Button>
          <Button size="md">저장하기</Button>
          <Button size="lg">무료로 시작하기</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="typo-h3">states</h2>
        <div className="flex gap-3">
          <Button loading>처리 중</Button>
          <Button disabled>비활성</Button>
          <Button variant="outline" disabled>비활성</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="typo-h3">Badge</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>연동 중</Badge>
          <Badge tone="warning">마감 임박 D-3</Badge>
          <Badge tone="danger">반려</Badge>
          <Badge tone="neutral">운전자금</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="solid">연동 중</Badge>
          <Badge variant="solid" tone="warning">마감 임박 D-3</Badge>
          <Badge variant="solid" tone="danger">반려</Badge>
          <Badge variant="solid" tone="neutral">전체 52건</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="dot" tone="danger">연체</Badge>
          <Badge variant="dot" tone="neutral">심사 중</Badge>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="typo-h3">Card</h2>
        <div className="flex flex-wrap items-start gap-5">
          <Card className="w-[400px] space-y-3">
            <CardHeader title="자동 이체 기록" right={<Badge>등록됨</Badge>} />
            <div className="space-y-1">
              <p className="typo-body1">대구은행 ****-3412 · 매월 15일 출금</p>
              <p className="typo-body2 text-text-secondary">잔액 부족 시 재출금 3회</p>
            </div>
            <CardDivider />
            <div className="space-y-2">
              <CardRow label="출금일" value="2026. 8. 15" />
              <CardRow label="금액" value="92만 원" strong />
            </div>
            <Button variant="outline" size="sm">전체 보기</Button>
          </Card>

          <div className="space-y-4">
            <Card variant="flat" className="w-[250px]">
              <p className="typo-label-sm text-text-secondary">flat</p>
              <p className="typo-caption text-text-muted">표 헤더 · 안내 박스 · 요약 스트립</p>
            </Card>
            <Card variant="soft" className="w-[250px]">
              <p className="typo-label-sm text-primary-active">soft</p>
              <p className="typo-caption text-primary-active">성공 안내 · 활성 상태 배경</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="typo-h3">Input</h2>
        <div className="flex flex-wrap gap-5">
          <Input
            className="w-[320px]"
            label="사업자등록번호"
            placeholder="000-00-00000"
            helperText="숫자만 입력해도 돼요."
          />
          <Input
            className="w-[320px]"
            label="비밀번호"
            type="password"
            defaultValue="12345"
            error="8자 이상 입력해 주세요."
          />
          <Input className="w-[320px]" label="대표자명" defaultValue="김사장" />
          <Input
            className="w-[320px]"
            label="개업연월일 (비활성)"
            defaultValue="2023-04-10"
            disabled
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="typo-h3">Modal</h2>
        <Button variant="outline" onClick={() => setModalOpen(true)}>
          모달 열기
        </Button>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="연동을 해제하시겠어요?"
          description="해제하면 자금 진단 기능을 이용할 수 없어요."
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                취소
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                해제하기
              </Button>
            </>
          }
        >
          <p className="typo-body1">연동 해제 즉시 저장된 금융 정보가 파기되고,</p>
          <p className="typo-body1">자격 판정 · 자금 조합 결과도 함께 삭제돼요.</p>

          <Card variant="flat" className="mt-5 rounded-md p-4">
            <p className="typo-body2 text-text-secondary">다시 연동하면 처음부터 정보를 가져와요.</p>
            <p className="typo-body2 text-text-secondary">가져오기에는 1~2분이 걸려요.</p>
          </Card>
        </Modal>
      </section>
    </div>
  )
}
