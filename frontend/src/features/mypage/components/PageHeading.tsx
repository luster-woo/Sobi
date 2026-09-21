import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  /** 제목 오른쪽에 붙는 것. 갱신 시각·버튼 */
  aside?: ReactNode
}

/**
 * 하위 화면의 제목 줄 (시안의 큰 제목).
 *
 * 예전에는 제목 위에 '마이페이지 › 관심 목록' 경로를 달았다. 상단바 제목이 경로 접두사로
 * 정해져서(`resolvePageTitle`) `/mypage/favorites` 에서도 '마이페이지' 라고만 나오는 것을
 * 메우려던 것인데, 바로 아래 제목과 같은 말을 한 번 더 하는 줄이라 지웠다. 돌아갈 길은
 * 사이드바가 항상 띄워 두고 있다.
 */
export default function PageHeading({ title, aside }: PageHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 className="font-heading text-text text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
      {aside}
    </div>
  )
}
