// 全局登录态。本项目第一层会话机制：用 Context 存 user + status，用
// localStorage 持久化 token，并把 token 镜像进 client.ts 让请求自动带鉴权头。
// 类比 Spring 的 SecurityContext，只是这里是前端、靠 React Context 下发。

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setAuthToken } from '../api/client'
import { fetchMe, loginAccount, registerAccount } from '../api/auth'
import type { UserOut } from '../api/auth'

// token 存 localStorage 的 key。取个带项目名的前缀，避免和同域其它应用撞。
const TOKEN_STORAGE_KEY = 'polisher_token'

// loading：正在用已存的 token 拉 /me 做水合，还不知道算不算登录，UI 先按住不闪。
type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: UserOut | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// 存/清 token 的一处出口：同时更新 localStorage 和 client.ts 里的内存副本，
// 两者不能只改一个（只改内存刷新就丢，只改存储当次请求带不上头）。
function persistToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
  setAuthToken(token)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // 挂载时用已存的 token 做水合：能换回 user 就算登录，token 失效（401）就清掉。
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) {
      setStatus('anonymous')
      return
    }
    setAuthToken(stored)
    let cancelled = false
    fetchMe()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        persistToken(null)
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 登录/注册共用的收尾：存 token，再拉一次 /me 拿到完整 user（后端返回体只有
  // token，没带 user 信息）。任一步失败都往外抛，让弹窗展示错误、不改成登录态。
  async function completeAuth(token: string): Promise<void> {
    persistToken(token)
    const me = await fetchMe()
    setUser(me)
    setStatus('authenticated')
  }

  async function login(email: string, password: string): Promise<void> {
    const { access_token } = await loginAccount(email, password)
    await completeAuth(access_token)
  }

  async function register(email: string, password: string): Promise<void> {
    const { access_token } = await registerAccount(email, password)
    await completeAuth(access_token)
  }

  function logout(): void {
    persistToken(null)
    setUser(null)
    setStatus('anonymous')
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}
