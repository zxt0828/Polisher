import { useEffect, useState } from 'react'

interface ToolbarState {
  top: number
  left: number
}

// 选中 rich 编辑区里的文字时，在选区上方浮出的加粗/斜体工具条。渲染一次即可，
// 靠监听 document 的 selectionchange 自行判断该不该显示、显示在哪。
export function FloatingToolbar() {
  const [pos, setPos] = useState<ToolbarState | null>(null)

  useEffect(() => {
    function update() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos(null)
        return
      }
      const anchor = sel.anchorNode
      const el = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element | null)
      // 选区必须落在某个 rich 编辑区内才显示工具条。
      if (!el || !el.closest('.editable-rich')) {
        setPos(null)
        return
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      // 用 position: fixed，坐标就用视口相对的 rect，不用叠加滚动偏移。
      setPos({ top: rect.top - 40, left: rect.left + rect.width / 2 })
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [])

  function apply(command: 'bold' | 'italic') {
    // 关掉 styleWithCSS，让 execCommand 产出 <b>/<i> 标签而不是带 style 的 span；
    // 无论产出什么，编辑区失焦时的 sanitizeInline 都会归一化成 <strong>/<em>。
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(command)
  }

  if (!pos) return null

  return (
    <div className="floating-toolbar" style={{ top: pos.top, left: pos.left }}>
      {/* onMouseDown + preventDefault：不抢走编辑区的焦点/选区，execCommand 才能作用到选中文字。 */}
      <button
        type="button"
        aria-label="Bold"
        onMouseDown={(e) => {
          e.preventDefault()
          apply('bold')
        }}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        aria-label="Italic"
        onMouseDown={(e) => {
          e.preventDefault()
          apply('italic')
        }}
      >
        <em>I</em>
      </button>
    </div>
  )
}
