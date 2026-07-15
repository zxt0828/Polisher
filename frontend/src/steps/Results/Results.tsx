import { useState } from 'react'
import { ApiError } from '../../api/client'
import { exportResume } from '../../api/resume'
import type { TailoredResume } from '../../types/resume'
import type { SectionKey } from './sectionConfig'
import { useResumePreview } from './useResumePreview'
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

  const { previewUrl, isLoading: isPreviewLoading, error: previewError } = useResumePreview(
    resume,
    sections,
  )

  async function handleDownload() {
    setIsDownloading(true)
    setError(null)
    try {
      const { blob, filename } = await exportResume(resume, sections)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename ?? buildFallbackFilename(resume)
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

      <div className="preview-pane">
        {isPreviewLoading && previewUrl && (
          <span className="preview-refreshing">Refreshing preview…</span>
        )}
        {previewError && <p className="field-error">{previewError}</p>}
        <div className="preview-frame">
          {previewUrl ? (
            // #toolbar=0&navpanes=0：隐藏 Chrome 内置 PDF 查看器的工具栏和缩略图侧栏，
            // 只干净地展示简历页面本身；下载走上面的「Download PDF」按钮。
            <iframe src={`${previewUrl}#toolbar=0&navpanes=0`} title="Resume preview" />
          ) : (
            <p className="preview-placeholder">Generating preview…</p>
          )}
        </div>
      </div>
    </section>
  )
}
