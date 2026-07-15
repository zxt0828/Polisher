import { useEffect, useRef, type ElementType } from 'react'
import { sanitizeInline, type FieldPath } from './richText'

interface EditableTextProps {
  value: string
  path: FieldPath
  onCommit: (path: FieldPath, value: string) => void
  // plain：只改文字（读写 textContent）。rich：允许 <strong>/<em> 加粗斜体
  // （读写 innerHTML，读写都过 sanitizeInline）。默认 plain。
  mode?: 'plain' | 'rich'
  // 渲染成什么标签，默认 span；用来贴合文档里各处的行内/块级结构。
  as?: ElementType
  className?: string
  placeholder?: string
}

// 一个可就地编辑的文本区域（contentEditable）。要点：
// - 输入期间「不受控」：只在挂载时把 value 写进 DOM 一次，之后不再从 React 回写，
//   否则每次 setState 重渲染都会重置内容导致光标跳到开头。
// - 失焦时提交：读出内容清洗后和原值不同才 onCommit。
// - 回车提交（简历字段不需要换行），Esc 放弃本次编辑。
// - 粘贴一律转成纯文本，避免把外部富文本/样式带进来。
export function EditableText({
  value,
  path,
  onCommit,
  mode = 'plain',
  as,
  className,
  placeholder,
}: EditableTextProps) {
  const Tag = (as ?? 'span') as ElementType
  const ref = useRef<HTMLElement>(null)
  const isRich = mode === 'rich'

  // 把 value 写进 DOM。rich 模式必须先 sanitize：既过滤标签，也把纯文本里的
  // "<"、"&" 转义掉（否则 innerHTML 会把 "< 500ms" 当成半个标签）。
  function seed() {
    if (!ref.current) return
    if (isRich) {
      ref.current.innerHTML = sanitizeInline(value)
    } else {
      ref.current.textContent = value
    }
  }

  // 只在挂载时写入初始内容（空依赖 → 不随 value/重渲染回写，避免光标跳动）。
  useEffect(() => {
    seed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function commit() {
    if (!ref.current) return
    const next = isRich
      ? sanitizeInline(ref.current.innerHTML)
      : (ref.current.textContent ?? '').trim()
    if (next !== value) {
      onCommit(path, next)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      // 简历字段不需要换行：回车即提交。
      e.preventDefault()
      ref.current?.blur()
    } else if (e.key === 'Escape') {
      // 放弃本次编辑：恢复原值再失焦。
      seed()
      ref.current?.blur()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    // 一律以纯文本插入，避免把外部 HTML/样式带进来。
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <Tag
      ref={ref}
      className={`editable${isRich ? ' editable-rich' : ''}${className ? ` ${className}` : ''}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  )
}
