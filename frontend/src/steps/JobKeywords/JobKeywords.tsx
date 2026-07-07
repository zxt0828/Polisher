import { useState } from 'react'
import { ApiError } from '../../api/client'
import { extractKeywords } from '../../api/keywords'
import { KeywordChips } from '../../components/KeywordChips'
import './JobKeywords.css'

interface JobKeywordsProps {
  jdText: string
  onJdTextChange: (text: string) => void
  initialKeywords: string[]
  onNext: (keywords: string[]) => void
}

export function JobKeywords({
  jdText,
  onJdTextChange,
  initialKeywords,
  onNext,
}: JobKeywordsProps) {
  // 种子值来自 initialKeywords：App.tsx 只在 currentStep === 'keywords' 时才
  // 渲染这个组件，离开这一步时它会被整个卸载，回来时重新挂载、重新用
  // initialKeywords 初始化——不需要额外的 useEffect 去同步。
  const [pendingKeywords, setPendingKeywords] = useState<string[]>(initialKeywords)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canExtract = jdText.trim().length > 0 && !isExtracting

  async function handleExtract() {
    setIsExtracting(true)
    setError(null)
    try {
      const result = await extractKeywords(jdText)
      // 全新一批直接覆盖，不和 pendingKeywords 合并——对应设计里「重新提取
      // 则拿到全新一批，覆盖之前的删除操作」。
      setPendingKeywords(result.keywords)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsExtracting(false)
    }
  }

  function handleRemoveKeyword(index: number) {
    // 按下标过滤而不是按值过滤：关键词内容有可能重复，按值删除会一次
    // 删掉所有同名的词。
    setPendingKeywords((current) => current.filter((_, i) => i !== index))
  }

  function handleNext() {
    if (pendingKeywords.length === 0) {
      return
    }
    onNext(pendingKeywords)
  }

  return (
    <section>
      <span className="eyebrow">Job & Keywords</span>

      <div className="field">
        <label htmlFor="jd-text" className="field-heading">
          Paste the job description
        </label>
        <textarea
          id="jd-text"
          rows={8}
          value={jdText}
          onChange={(event) => onJdTextChange(event.target.value)}
          placeholder="Paste the full job description here…"
        />
      </div>

      <button type="button" className="btn-primary" onClick={handleExtract} disabled={!canExtract}>
        {isExtracting ? 'Extracting…' : 'Extract keywords'}
      </button>

      {error && <p className="field-error">{error}</p>}

      {pendingKeywords.length > 0 && (
        <div className="keyword-chips-wrap">
          <KeywordChips words={pendingKeywords} onRemove={handleRemoveKeyword} />
        </div>
      )}

      <div className="step-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={handleNext}
          disabled={pendingKeywords.length === 0}
        >
          Continue
        </button>
        {pendingKeywords.length === 0 && (
          <span className="step-actions__hint">Keep at least one keyword to continue.</span>
        )}
      </div>
    </section>
  )
}
