import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { initialsFromEmail, usernameFromEmail } from '../auth/identity'
import './UserMenu.css'

// 登录后导航栏右侧的账户区块（对应设计图 2）：用户名 + 缩写头像 + 下拉箭头，
// 点开是一张下拉卡片：用户名 / 邮箱 / Profile（本期占位）/ Log Out。
export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 点击组件外部时收起下拉。挂在 document 上，只在展开时监听。
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (!user) {
    return null
  }

  const username = usernameFromEmail(user.email)
  const initials = initialsFromEmail(user.email)

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-menu__name">{username}</span>
        <span className="user-menu__avatar">{initials}</span>
        <span className="user-menu__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__identity">
            <span className="user-menu__identity-name">{username}</span>
            <span className="user-menu__identity-email">{user.email}</span>
          </div>
          <div className="user-menu__divider" />
          {/* Profile 本期只占位、不接功能。 */}
          <button type="button" className="user-menu__item" role="menuitem">
            <span className="user-menu__item-icon" aria-hidden="true">
              ◔
            </span>
            Profile
          </button>
          <div className="user-menu__divider" />
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
          >
            <span className="user-menu__item-icon" aria-hidden="true">
              ⇥
            </span>
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}
