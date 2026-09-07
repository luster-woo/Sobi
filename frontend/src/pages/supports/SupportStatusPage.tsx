import { useNavigate, useParams } from 'react-router-dom'
import Card from '@/shared/ui/Card'
import Button from '@/shared/ui/Button'
import Stepper from '@/shared/ui/Stepper'
import StatCard from '@/shared/ui/StatCard'
import DefinitionList from '@/shared/ui/DefinitionList'
import { IconCheckCircle } from '@/shared/ui/Icon'
import { mockSupports } from '@/mocks/supports.mock'
import { formatWon } from '@/shared/lib/format'

/** 14-4. 지원금 진행 현황 (지급 완료) */
export default function SupportStatusPage() {
  const navigate = useNavigate()
  const { programId } = useParams()
  const s = mockSupports.find((x) => x.id === programId) ?? mockSupports[0]
  const amount = 5_000_000

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6">
      <div className="space-y-4">
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <IconCheckCircle size={26} className="text-primary" />
            <div>
              <p className="typo-h4">지원금이 입금되었어요</p>
              <p className="typo-caption text-text-muted">스마트상점 기술보급·지급일 2026. 9. 2</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading text-[26px] font-semibold">{formatWon(amount)}</p>
            <p className="typo-caption text-text-muted">지급 금액</p>
          </div>
        </Card>

        <Card className="space-y-6">
          <p className="typo-h4">지급 진행 상태</p>
          <Stepper
            className="px-10"
            steps={[
              { label: '선정', sub: '8.29', done: true },
              { label: '협약 체결', sub: '9.1', done: true },
              { label: '계좌 입금', sub: '9. 2', done: false },
            ]}
          />
        </Card>

        <Card className="space-y-4">
          <p className="typo-h4">입금 내역</p>
          <DefinitionList
            labelWidth={96}
            items={[
              { label: '입금 계좌', value: '대구은행 ****-3412 (신청 시 입력한 출금 계좌)' },
              { label: '입금 일시', value: '2026. 9. 2 14:20' },
              { label: '지급 금액', value: <span className="typo-h4 font-semibold">{formatWon(amount)}</span> },
              { label: '소관 기관', value: s.agency },
              { label: '협약 번호', value: 'GR-2026-0000117' },
            ]}
          />
        </Card>

        <section className="space-y-3">
          <p className="typo-h4">사용·정산 안내</p>
          <div className="grid grid-cols-4 gap-4">
            <StatCard value="2027. 3. 31" label="사용 기한" />
            <StatCard value="사용 후 30일 내" label="증빙 제출 기한" />
            <StatCard value="2027. 4. 30" label="정산 보고" />
            <StatCard value="목적 외 사용 시" label="환수 조건" />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <Card className="space-y-4">
          <p className="typo-h4">증빙 제출 안내</p>
          <p className="typo-body2 text-text-secondary">
            지급된 지원금은 공고 목적에 맞게 사용해야 해요, 세금계산서 ·영수증 등 증빙을 기한 내 제출하지 않으면 환수될 수
            있어요.
          </p>
          <Button className="w-full" onClick={() => navigate('/applications')}>
            신청 현황으로 이동
          </Button>
        </Card>
        <Card className="space-y-4">
          <p className="typo-h4">입금 계좌를 못 받으셨나요?</p>
          <p className="typo-body2 text-text-secondary">협약 계좌가 정지 상태면 입금이 보류돼요, 계좌 확인 후 재입금을 요청할 수 있어요.</p>
          <Button variant="outline" className="w-full">
            재입금 요청
          </Button>
        </Card>
      </div>
    </div>
  )
}
