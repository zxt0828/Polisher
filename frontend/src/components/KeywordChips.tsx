import './KeywordChips.css'

interface KeywordChipsProps {
  words: string[]
  // 不传就是只读展示（第二步用来确认第一步带过来的关键词）；
  // 传了才会给每个标签加删除按钮（第一步用来编辑关键词）。
  onRemove?: (index: number) => void
}

export function KeywordChips({ words, onRemove }: KeywordChipsProps) {
  if (words.length === 0) {
    return null
  }
  return (
    <ul className="keyword-chips">
      {words.map((word, index) => (
        <li key={index} className="keyword-chip">
          {word}
          {onRemove && (
            <button type="button" aria-label={`Remove ${word}`} onClick={() => onRemove(index)}>
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
