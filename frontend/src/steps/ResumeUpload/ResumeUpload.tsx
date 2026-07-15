import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { ApiError } from '../../api/client'
import { tailorResume } from '../../api/resume'
import { KeywordChips } from '../../components/KeywordChips'
import type { TailoredResume } from '../../types/resume'
import './ResumeUpload.css'

interface ResumeUploadProps {
  keywords: string[]
  // 选中的文件由上层（App）持有并传入，这样离开第二步再回来时不会丢失。
  file: File | null
  onFileChange: (file: File | null) => void
  onNext: (resume: TailoredResume) => void
}

// 前端先拦一道，避免选错文件白跑一趟后端才收到 400：真正的格式/内容校验
// 仍然在后端（pdf_parser.py），这里只是省一次没意义的网络往返。
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function validateFile(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return 'Please choose a PDF file.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File is too large. Please choose a PDF under 10 MB.'
  }
  return null
}

export function ResumeUpload({ keywords, file, onFileChange, onNext }: ResumeUploadProps) {
  // 只有这几个是瞬时 UI 状态，无需跨步骤保留，留在局部即可（选中的文件已提升到 App）。
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isTailoring, setIsTailoring] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setApiError(null)
    if (!selected) {
      onFileChange(null)
      setValidationError(null)
      return
    }
    const error = validateFile(selected)
    setValidationError(error)
    onFileChange(error ? null : selected)
  }

  async function handleTailor() {
    if (!file) {
      return
    }
    setIsTailoring(true)
    setApiError(null)
    try {
      const resume = await tailorResume(file, keywords)
      onNext(resume)
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsTailoring(false)
    }
  }

  return (
    <section>
      <span className="eyebrow">Résumé</span>

      <div className="field">
        <span className="field-heading">Upload your résumé (PDF)</span>
        <label className="file-drop" htmlFor="resume-file">
          <input id="resume-file" type="file" accept="application/pdf" onChange={handleFileChange} />
          <span>{file ? file.name : 'Click to choose a PDF file'}</span>
        </label>
        {validationError && <p className="field-error">{validationError}</p>}
      </div>

      {keywords.length > 0 && (
        <div className="field">
          <span className="field-heading">Keywords from step 1</span>
          <KeywordChips words={keywords} />
        </div>
      )}

      <button type="button" className="btn-primary" onClick={handleTailor} disabled={!file || isTailoring}>
        {isTailoring ? 'Tailoring…' : 'Tailor resume'}
      </button>

      {apiError && <p className="field-error">{apiError}</p>}
    </section>
  )
}
