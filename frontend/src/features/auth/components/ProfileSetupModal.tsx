import { useState } from 'react'

import { useProfileSetup } from '@/features/auth/hooks/useProfileSetup'
import { getErrorMessage, getErrorStatus } from '@/shared/api/errors'
import Button from '@/shared/ui/Button'
import DatePicker from '@/shared/ui/DatePicker'
import Input from '@/shared/ui/Input'
import Modal from '@/shared/ui/Modal'
import { yesterdayIso } from '@/shared/utils/date'
import { validateBirthDate, validateRequired } from '@/shared/utils/validators'

interface ProfileSetupModalProps {
  open: boolean
  /**
   * 이름 칸의 초깃값. 구글 프로필 이름이 들어온다.
   *
   * 빈 칸으로 두지 않는 이유: 대부분은 구글 이름이 곧 실명이라, 비워두면 같은 값을
   * 다시 치게 만든다. 채워두면 고칠 사람만 고친다.
   */
  defaultName: string
  /** 저장을 마쳤을 때. 원래 가려던 곳으로 보내면 된다 */
  onDone: () => void
}

type Errors = Partial<Record<'name' | 'birthDate', string>>

/**
 * 구글 가입자에게 이름·생년월일을 받는 창.
 *
 * 구글 로그인은 두 값이 다 미덥지 않다. 생년월일은 구글이 주지 않아 **비어 있고**
 * (V23 마이그레이션 주석), 이름은 구글 프로필 이름이라 **실명이 아닐 수 있다**
 * (`AuthServiceImpl` 이 `.name(googleUser.getName())` 으로 넣는다).
 * 로컬 가입은 `SignupRequest` 에서 둘 다 받으므로, 여기서 메우지 않으면 가입 경로에
 * 따라 데이터가 갈린다.
 *
 * 로그인 직후(`OAuthCallbackPage`)에 띄운다. 나중에 마이페이지 어딘가에서 묻는 것보다
 * 이때가 낫다 — 사용자가 가입 절차를 밟고 있다고 느끼는 유일한 구간이라, 같은 흐름에
 * 붙이면 한 단계로 읽힌다.
 *
 * ⚠️ **닫을 수 없다.** 입력을 마쳐야 다음으로 간다. X 버튼과 Escape 는 창을 닫는 대신
 *    경고 문구를 띄운다 — `Modal` 은 항상 닫기 버튼을 그리고 Escape 를 받으므로,
 *    없애는 대신 `onClose` 를 경고로 돌렸다.
 *
 *    버튼을 지우지 않은 이유: 누를 데가 없으면 사용자는 창이 고장난 줄 안다. 눌렀을 때
 *    "왜 못 닫는지" 를 말해주는 편이 낫다.
 *
 *    갇히는 것이 걱정된다면 — 브라우저 뒤로가기는 살아 있다. 이 화면은 구글에서
 *    돌아온 자리라 뒤로 가면 로그인 전으로 빠진다.
 */
export default function ProfileSetupModal({ open, defaultName, onDone }: ProfileSetupModalProps) {
  // 초기화 함수는 첫 렌더에만 돈다. 창이 열려 있는 동안 구글 이름이 바뀔 일은 없다
  const [name, setName] = useState(() => defaultName)
  const [birthDate, setBirthDate] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  /** 닫으려고 시도했는지. 경고 문구를 띄울지 정한다 */
  const [dismissed, setDismissed] = useState(false)

  const { mutate: submit, isPending } = useProfileSetup()

  const handleSubmit = () => {
    const validated: Errors = {
      name: validateRequired(name) ?? undefined,
      birthDate: validateBirthDate(birthDate) ?? undefined,
    }

    setErrors(validated)
    if (Object.values(validated).some(Boolean)) return

    submit(
      { name: name.trim(), birthDate },
      {
        onSuccess: onDone,
        /*
         * 4xx 만 칸 아래에 붙인다. 네트워크 끊김·5xx 는 `client.ts` 인터셉터가 이미
         * 토스트를 띄운다 (`notifyUnrecoverable` 주석). 창은 열린 채라 다시 누르면 된다.
         *
         * 어느 칸의 문제인지 서버가 알려주지 않으므로 생년월일 아래에 붙인다 — 이름은
         * 값이 채워져 있고 생년월일이 직접 고른 값이라 그쪽이 의심스럽다.
         */
        onError: (error) => {
          const status = getErrorStatus(error)
          if (status === undefined || status >= 500) return

          setErrors({
            birthDate: getErrorMessage(error, { 401: '다시 로그인한 뒤 시도해 주세요.' }),
          })
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      // 닫지 않는다. X·Escape 둘 다 여기로 오고, 대신 왜 못 닫는지 알린다
      onClose={() => setDismissed(true)}
      title="시작하기 전에 확인해주세요"
      description="이름은 서류에 들어가고,
          생년월일은 나이 조건이 걸린 지원사업을 찾는 데 써요."
      closeOnOverlayClick={false}
      footer={
        <Button className="w-full" onClick={handleSubmit} loading={isPending}>
          저장하고 시작하기
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/*
         * 닫으려 한 뒤에만 나타난다. 처음부터 띄우면 아직 아무것도 안 한 사람에게
         * 경고부터 하는 꼴이라 창이 사나워 보인다.
         *
         * role="alert" 이라 나타나는 순간 낭독기가 읽는다 — 눈으로 X 를 누른 사람은
         * 시선이 오른쪽 위에 있어서, 본문에 조용히 생긴 문구를 놓친다.
         */}
        {dismissed && (
          /*
           * 문장 단위로 <p> 를 나눈다. JSX 는 소스의 줄바꿈을 공백 하나로 합치므로
           * 여기서 엔터를 쳐도 한 줄로 흘러간다.
           *
           * `<br />` 도 쓰지 않는다 — 나눈 줄이 폭에 따라 또 접혀서 어떤 화면에서는
           * 세 줄이 된다. 탈퇴 창(WithdrawModal)과 같은 처리다.
           */
          <div
            role="alert"
            className="bg-warning-soft text-warning text-body2 space-y-0.5 rounded-sm px-3.5 py-2.5 leading-[1.7]"
          >
            <p>이름과 생년월일은 지원사업 자격을 따질 때 꼭 필요해요.</p>
            <p>입력해야 다음으로 넘어갈 수 있어요.</p>
          </div>
        )}

        <Input
          label="이름"
          required
          autoComplete="name"
          placeholder="실명을 입력해 주세요"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setErrors((previous) => ({ ...previous, name: undefined }))
          }}
          error={errors.name}
          // 구글 이름이 실명과 다를 수 있다는 걸 알려야 그냥 넘기지 않는다
          helperText="구글 계정 이름이 채워져 있어요. 실명과 다르면 고쳐주세요."
        />

        {/* 회원가입·사업자 인증과 같은 컴포넌트다. 연 → 월 → 일 순으로 좁혀 고른다 */}
        <DatePicker
          label="생년월일"
          required
          value={birthDate}
          onChange={(value) => {
            setBirthDate(value)
            setErrors((previous) => ({ ...previous, birthDate: undefined }))
          }}
          // 백엔드가 @Past 라 오늘은 못 고르게 막는다
          max={yesterdayIso()}
          error={errors.birthDate}
        />
      </div>
    </Modal>
  )
}
