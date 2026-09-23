import { useCallback, useEffect, useRef, useState } from 'react'

export interface LocalPreview {
  /** 이미지일 때만 있다. PDF 는 썸네일을 만들지 않는다 */
  imageUrl: string | null
  extension: string
}

/**
 * 이번 화면에서 올린 파일의 미리보기. 서류 id 로 찾는다.
 *
 * 서버는 파일을 돌려주지 않으므로 사용자가 고른 File 을 브라우저에서 바로 쓴다.
 * 새로고침하면 사라지고, 그때 화면은 확장자 아이콘으로 대신한다.
 */
export function useLocalPreviews() {
  const [previews, setPreviews] = useState<Map<number, LocalPreview>>(() => new Map())
  const urls = useRef(new Set<string>())

  // 화면을 떠날 때 만든 주소를 전부 돌려준다
  useEffect(() => {
    const created = urls.current
    return () => {
      created.forEach((url) => URL.revokeObjectURL(url))
      created.clear()
    }
  }, [])

  const setPreview = useCallback((applicationDocumentId: number, file: File) => {
    const imageUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    if (imageUrl) urls.current.add(imageUrl)

    setPreviews((prev) => {
      const old = prev.get(applicationDocumentId)?.imageUrl
      if (old) {
        URL.revokeObjectURL(old)
        urls.current.delete(old)
      }

      const next = new Map(prev)
      next.set(applicationDocumentId, {
        imageUrl,
        extension: file.name.split('.').pop()?.toUpperCase() ?? '',
      })
      return next
    })
  }, [])

  return { previews, setPreview }
}
