import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Wordmark } from '../Wordmark'
import './AuthModal.css'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'login' | 'signup'

// 登录/注册弹窗：一个屏幕正中的浮层，login/signup 两种模式共用一套输入框，
// 底部链接互相切换。两者都直接打通后端（useAuth 里的 login/register）。
export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 每次打开都回到干净的登录态，避免上次输入/报错残留到下次。
  useEffect(() => {
    if (open) {
      setMode('login')
      setEmail('')
      setPassword('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  // Esc 关闭：只在打开时挂监听。
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) {
    return null
  }

  function switchMode() {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    // 点遮罩关闭；点卡片本身不冒泡到遮罩，避免误关。
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="auth-brand">
          <Wordmark />
        </div>
        <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
        <p className="auth-subtitle">
          {isLogin
            ? 'Sign in to save and manage your résumés.'
            : 'Sign up to save and manage your résumés.'}
        </p>

        {/* Google 官方渲染的登录按钮：成功回调给 credential（即 id_token），
            交给 loginWithGoogle 换本应用 token 并收尾；失败则展示错误。 */}
        <div className="auth-google-wrap">
          <GoogleLogin
            onSuccess={(cred) => {
              if (!cred.credential) {
                setError('Google sign-in failed. Please try again.')
                return
              }
              setError(null)
              loginWithGoogle(cred.credential)
                .then(onClose)
                .catch((err) => {
                  setError(
                    err instanceof ApiError
                      ? err.message
                      : 'Google sign-in failed. Please try again.',
                  )
                })
            }}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />
        </div>

        <div className="auth-divider">
          <span>or with email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" className="auth-switch__link" onClick={switchMode}>
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
