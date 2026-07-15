import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { exportResume } from '../../api/resume'
import type { TailoredResume } from '../../types/resume'
import { ResumeDocument } from './ResumeDocument'
import { applyEdit, type FieldPath } from './richText'
import type { SectionKey } from './sectionConfig'
import '../../styles/resume.css'
import './Results.css'

interface ResultsProps {
  resume: TailoredResume
  // 由上层（App）持有并传入：勾选/排序后真正要渲染的模块列表。勾选面板本身
  // 渲染在左栏 steps 下方，不在这个组件里。
  sections: SectionKey[]
}

// 跟后端 pdf_renderer.py 的 build_export_filename 逻辑保持一致：只在
// Content-Disposition 读不到文件名时（比如 CORS 配置以后被改动）兜底用。
function buildFallbackFilename(resume: TailoredResume): string {
  const safeName = resume.contact.name.trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  return safeName ? `${safeName}_Resume.pdf` : 'resume.pdf'
}

export function Results({ resume, sections }: ResultsProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // editedResume 是本次会话的可编辑副本：挂载时深拷贝一份原始 resume，之后所有
  // 内联编辑改的都是它，不动上层的原始数据。仅本次会话——离开第三步组件卸载即丢。
  const [editedResume, setEditedResume] = useState<TailoredResume>(() => structuredClone(resume))
  // 下载时从 ref 读最新副本：失焦提交（onCommit）和点击下载是两个事件，用 ref
  // 避免闭包拿到过期的 editedResume。
  const editedResumeRef = useRef(editedResume)
  editedResumeRef.current = editedResume

  // 防御：万一上层在组件挂载期间换了新的 resume（重新 tailor），重新克隆、丢弃旧编辑。
  useEffect(() => {
    const fresh = structuredClone(resume)
    setEditedResume(fresh)
    editedResumeRef.current = fresh
  }, [resume])

  function handleCommit(path: FieldPath, value: string) {
    setEditedResume((prev) => applyEdit(prev, path, value))
  }

  async function handleDownload() {
    setIsDownloading(true)
    setError(null)
    try {
      const current = editedResumeRef.current
      const { blob, filename } = await exportResume(current, sections)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename ?? buildFallbackFilename(current)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <section>
      <div className="results-toolbar">
        <span className="eyebrow">Tailored Resume</span>
        <button type="button" className="btn-primary" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      <ResumeDocument resume={editedResume} sections={sections} onCommit={handleCommit} />
    </section>
  )
}
