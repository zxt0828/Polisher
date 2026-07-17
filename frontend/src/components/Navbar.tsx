import { Wordmark } from './Wordmark'
import './Navbar.css'

interface NavbarProps {
  onHome: () => void
}

export function Navbar({ onHome }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <button type="button" className="navbar__brand" onClick={onHome} aria-label="Polisher home">
          <Wordmark />
        </button>
        {/* 右侧账户/付费区：都还没接功能，先占位——Pricing 走文字链接，Sign in 走描边按钮。 */}
        <nav className="navbar__actions">
          <button type="button" className="navbar__link">
            Pricing
          </button>
          <button type="button" className="navbar__signin">
            Sign in
          </button>
        </nav>
      </div>
    </header>
  )
}
