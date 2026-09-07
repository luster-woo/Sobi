import { Link } from 'react-router-dom'

import Button from '@/components/common/Button'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center pt-32 text-center">
      <p className="font-heading text-text-disabled text-[56px] leading-none font-bold">404</p>
      <h1 className="typo-h2 mt-6">페이지를 찾을 수 없어요</h1>
      <p className="typo-body1 text-text-secondary mt-2">주소가 잘못되었거나 삭제된 페이지예요.</p>
      <Link to="/" className="mt-8">
        <Button variant="outline">시작 페이지로</Button>
      </Link>
    </div>
  )
}
