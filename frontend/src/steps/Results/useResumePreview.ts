import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { previewResume } from '../../api/resume'
import type { TailoredResume } from '../../types/resume'
import type { SectionKey } from './sectionConfig'

// 勾选/拖拽变化后等这么久没有新动作，才真正打后端重新生成 PDF，
// 避免快速连续操作时每次都发一个请求。
const DEBOUNCE_MS = 400

// 把「防抖请求后端 PDF + blob URL 生命周期管理」这层逻辑从渲染代码里剥出来。
// 返回内嵌 <iframe> 用的 previewUrl，以及加载/错误状态。
export function useResumePreview(resume: TailoredResume, sections: SectionKey[]) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 当前正在展示的 blob URL，换新前要 revoke 掉，否则会泄漏。
  const activeUrlRef = useRef<string | null>(null)
  // 请求序号：防止「先发的请求后返回」覆盖掉更新的结果。
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    const timer = setTimeout(() => {
      setIsLoading(true)
      previewResume(resume, sections)
        .then(({ blob }) => {
          // 已经被更新的请求取代了，丢弃这个过期响应。
          if (requestId !== requestIdRef.current) {
            return
          }
          const url = URL.createObjectURL(blob)
          if (activeUrlRef.current) {
            URL.revokeObjectURL(activeUrlRef.current)
          }
          activeUrlRef.current = url
          setPreviewUrl(url)
          setError(null)
        })
        .catch((err) => {
          if (requestId !== requestIdRef.current) {
            return
          }
          setError(err instanceof ApiError ? err.message : 'Failed to update preview.')
          // 故意不清空 previewUrl：保留上一份成功的预览，避免闪成损坏/空白状态。
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setIsLoading(false)
          }
        })
    }, DEBOUNCE_MS)

    // 防抖还没触发就又变了：取消这次待发的请求。
    return () => clearTimeout(timer)
  }, [resume, sections])

  // 组件卸载时（比如离开第三步）revoke 掉最后一份 blob URL。
  useEffect(
    () => () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current)
      }
    },
    [],
  )

  return { previewUrl, isLoading, error }
}
