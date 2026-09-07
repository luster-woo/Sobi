import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import AuthCard from '@/components/common/AuthCard'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { cn } from '@/utils/format'

function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (pw.length >= 12) s++
  return s
}

/** 05. 비밀번호 변경 (이메일 인증 + 새 비밀번호) */
export default function PasswordResetPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('sajang@example.com')
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [pw, setPw] = useState('password1!')
  const [pw2, setPw2] = useState('password1!')

  const level = strength(pw)
  const matchOk = pw2.length > 0 && pw === pw2
  const canSubmit = verified && level >= 2 && matchOk

  return (
    <AuthCard title="새 비밀번호 설정">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          navigate('/login')
        }}
      >
        <div className="flex items-end gap-2">
          <Input
            className="flex-1"
            label="아이디 (이메일)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="button" variant="outline" className="shrink-0">
            코드 발송
          </Button>
        </div>

        <div className="flex items-end gap-2">
          <Input
            className="flex-1"
            label="인증 코드"
            placeholder="6자리 숫자"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rightSlot={<span className="typo-body2 text-danger">4:12</span>}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={code.length < 6}
            onClick={() => setVerified(true)}
          >
            {verified ? '확인됨' : '확인'}
          </Button>
        </div>

        <div className="space-y-2">
          <Input
            label="새 비밀번호"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            helperText="영문·숫자·특수문자 조합 8자 이상"
          />
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn('h-1 flex-1 rounded-full', i < level ? 'bg-primary' : 'bg-border')}
                />
              ))}
            </div>
            <span className="typo-caption text-text-secondary">
              {level >= 3 ? '안전함' : level === 2 ? '보통' : '약함'}
            </span>
          </div>
        </div>

        <Input
          label="새 비밀번호 확인"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          helperText={matchOk ? '비밀번호가 일치해요.' : undefined}
          error={pw2.length > 0 && !matchOk ? '비밀번호가 일치하지 않아요' : undefined}
        />

        <div className="space-y-3 pt-4">
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            비밀번호 변경
          </Button>
          <p className="typo-caption text-text-muted text-center">
            이메일이 오지 않았나요? 스팸함을 확인해 주세요
          </p>
        </div>
      </form>
    </AuthCard>
  )
}
