import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { AuthModal } from './AuthModal/AuthModal'
import { UserMenu } from './UserMenu'
import { Wordmark } from './Wordmark'
import './Navbar.css'

interface NavbarProps {
  onHome: () => void
}

export function Navbar({ onHome }: NavbarProps) {
  const { status } = useAuth()
  // 弹窗开合状态就近放在导航栏（Sign in 按钮在这），不用提升到 App。
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <button type="button" className="navbar__brand" onClick={onHome} aria-label="Polisher home">
          <Wordmark />
        </button>
        <nav className="navbar__actions">
          {/* Pricing 仍是占位（付费额度以后单独做）。 */}
          <button type="button" className="navbar__link">
            Pricing
          </button>
          {/* 登录态决定右侧：已登录显示账户菜单，否则显示 Sign in 描边按钮。
              status 为 loading 时先不渲染任一，避免刷新瞬间闪一下 Sign in。 */}
          {status === 'authenticated' ? (
            <UserMenu />
          ) : status === 'anonymous' ? (
            <button type="button" className="navbar__signin" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          ) : null}
        </nav>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  )
}
