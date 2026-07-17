import './Wordmark.css'

// 品牌文字标：纯排版艺术字，无图标。用现有衬线体做斜体 + 收紧字距，
// 词尾一个石板蓝句点作点缀。不引网络字体，沿用项目「只用系统字体栈」的约定。
export function Wordmark() {
  return (
    <span className="wordmark">
      Polisher<span className="wordmark__dot">.</span>
    </span>
  )
}
