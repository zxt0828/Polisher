// 账户相关接口：注册 / 登录 / 取当前用户。对应后端 app/api/auth_routes.py。
// 只负责拼路径和类型，网络细节（鉴权头、错误归一）都在 client.ts 那层。

import { getJson, postJson } from './client'

// 后端 UserOut（app/schemas.py）：故意不含密码字段。created_at 是 ISO 字符串。
export interface UserOut {
  id: number
  email: string
  created_at: string
}

// 后端 TokenResponse：注册和登录都返回这个，拿到即视为已登录。
export interface TokenResponse {
  access_token: string
  token_type: string
}

export function registerAccount(email: string, password: string): Promise<TokenResponse> {
  return postJson<TokenResponse>('/api/auth/register', { email, password })
}

export function loginAccount(email: string, password: string): Promise<TokenResponse> {
  return postJson<TokenResponse>('/api/auth/login', { email, password })
}

// 需要携带 Authorization 头；token 由 client.ts 的 setAuthToken 统一注入。
export function fetchMe(): Promise<UserOut> {
  return getJson<UserOut>('/api/auth/me')
}
