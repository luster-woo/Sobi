import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Select from '@/components/common/Select'

import OnboardingShell from './OnboardingShell'

/** 07. 휴대폰 본인 인증 */
export default function BusinessPhonePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('김사장')
  const [birth, setBirth] = useState('1988-03-02')
  const [carrier, setCarrier] = useState('SKT')
  const [phone, setPhone] = useState('010-1234-5678')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')

  return (
    <OnboardingShell
      title="휴대폰으로 본인 인증을 해주세요"
      description={
        <>
          마이데이터 연동을 위해 명의자 본인 확인이 필요해요.
          <br />
          입력한 정보는 인증 용도로만 사용돼요.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="생년월일" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </div>

      <div className="grid grid-cols-[150px_1fr_auto] items-end gap-3">
        <Select
          label="통신사"
          options={['SKT', 'KT', 'LG U+', '알뜰폰']}
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
        />
        <Input label="휴대폰 번호" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button onClick={() => setSent(true)}>인증번호 받기</Button>
      </div>

      {sent && (
        <>
          <div className="bg-surface-muted flex items-center justify-between rounded-md px-4 py-3">
            <span className="typo-body2">인증번호를 보냈어요. 문자를 확인해 주세요.</span>
            <span className="typo-caption text-text-muted">
              유효 시간 03:00·재전송은 1분 후 가능
            </span>
          </div>
          <div className="flex items-end gap-3">
            <Input
              className="flex-1"
              value={code}
              placeholder="인증번호 6자리"
              onChange={(e) => setCode(e.target.value)}
              rightSlot={<span className="typo-body2 text-danger">02:31</span>}
            />
            <Button variant="outline">재전송</Button>
          </div>
        </>
      )}

      <Button
        className="w-full"
        disabled={!sent || code.length < 6}
        onClick={() => navigate('/mydata/consent')}
      >
        인증 완료
      </Button>
      {!sent && (
        <p className="typo-caption text-text-disabled text-center">
          목업 안내: 인증번호 받기 → 6자리 입력 → 인증 완료
        </p>
      )}
    </OnboardingShell>
  )
}
