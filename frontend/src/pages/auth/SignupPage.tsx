import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard, { OrDivider } from '@/shared/ui/AuthCard'
import Input from '@/shared/ui/Input'
import Button from '@/shared/ui/Button'

/** 04. 회원가입 */
export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('sajang@example.com')
  const [codeSent, setCodeSent] = useState(true)
  const [code, setCode] = useState('482913')
  const [verified, setVerified] = useState(false)
  const [pw, setPw] = useState('password1!')
  const [pw2, setPw2] = useState('password1!')

  const pwOk = pw.length >= 8
  const matchOk = pw2.length > 0 && pw === pw2

  return (
    <AuthCard title="회원가입">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          navigate('/business/verify')
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
          <Button type="button" variant="outline" size="md" className="shrink-0" onClick={() => setCodeSent(true)}>
            인증 코드 발송
          </Button>
        </div>
        <p className="-mt-3 typo-caption text-primary">사용할 수 있는 이메일입니다.</p>

        {codeSent && (
          <div className="flex items-end gap-2">
            <Input
              className="flex-1"
              label="인증 코드 확인"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rightSlot={<span className="typo-body2 text-danger">4:45</span>}
            />
            <Button type="button" variant="outline" className="shrink-0" onClick={() => setVerified(true)}>
              {verified ? '확인됨' : '확인'}
            </Button>
          </div>
        )}

        <Input
          label="비밀번호"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          helperText="영문·숫자·특수문자 조합 8자 이상"
          error={pw.length > 0 && !pwOk ? '8자 이상 입력해 주세요.' : undefined}
        />
        <Input
          label="비밀번호 확인"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          helperText={matchOk ? '비밀번호가 일치해요' : undefined}
          error={pw2.length > 0 && !matchOk ? '비밀번호가 일치하지 않아요' : undefined}
        />

        <Button type="submit" className="w-full" disabled={!pwOk || !matchOk}>
          가입하기
        </Button>
      </form>

      <OrDivider />
      <Button variant="outline" className="w-full" onClick={() => navigate('/business/verify')}>
        Google로 가입
      </Button>
    </AuthCard>
  )
}
