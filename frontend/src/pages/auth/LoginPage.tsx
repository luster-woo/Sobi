import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard, { OrDivider } from '@/shared/ui/AuthCard'
import Input from '@/shared/ui/Input'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'

/** 02. 로그인 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('sajang@example.com')
  const [password, setPassword] = useState('password1!')
  const [keep, setKeep] = useState(true)

  return (
    <AuthCard
      title="로그인"
      footer={
        <div className="flex items-center justify-between">
          <span className="typo-body2 text-text-muted">아직 계정이 없으신가요?</span>
          <Link to="/signup/terms" className="typo-label-sm text-text hover:underline">
            회원가입
          </Link>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          navigate('/dashboard')
        }}
      >
        <Input label="아이디 (이메일)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="flex items-center justify-between pt-1">
          <Checkbox label="로그인 유지" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          <Link to="/password/reset" className="typo-body2 text-text hover:underline">
            비밀번호 찾기
          </Link>
        </div>

        <Button type="submit" className="mt-2 w-full">
          로그인
        </Button>
      </form>

      <OrDivider />
      <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
        Google로 계속하기
      </Button>
    </AuthCard>
  )
}
