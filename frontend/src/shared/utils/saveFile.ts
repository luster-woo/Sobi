/**
 * 받은 파일을 사용자 디스크로 내린다.
 *
 * 서버가 Content-Disposition 으로 파일명을 주지만, 응답이 Blob 이라 브라우저가
 * 알아서 저장해 주지 않는다 — 우리가 링크를 만들어 눌러야 한다.
 *
 * 새 탭(window.open)으로 열지 않는다. 이 요청들은 Authorization 헤더가 있어야
 * 하는데 새 탭은 헤더를 붙이지 못한다. 그래서 받아 온 Blob 을 쓴다.
 *
 * objectURL 은 탭이 닫힐 때까지 메모리에 남으므로 반드시 되돌려준다. 클릭이 처리될
 * 틈을 주려고 다음 프레임에 지운다 — 즉시 revoke 하면 사파리에서 빈 파일이 받아진다.
 */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => URL.revokeObjectURL(url), 0)
}