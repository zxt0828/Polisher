// 三个接口共用的基础设施：base URL 常量 + 统一的请求入口 + 统一错误检查。
// 类比 Spring：这里承担的角色接近 @ControllerAdvice 统一异常处理，
// 只是前端没有全局拦截机制，得靠这层封装让调用方只需要 catch 一种 ApiError。

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!rawBaseUrl) {
  // 缺了这个环境变量的话，所有请求都会拼成 "undefined/api/..." 这种
  // 看起来像普通 404、实际是配置问题的诡异错误。宁可应用一启动（模块
  // 一加载）就报错报清楚，也不要让这种问题悄悄流到某次点击按钮才暴露。
  throw new Error(
    'VITE_API_BASE_URL is not set. Create frontend/.env from .env.example before running the app.',
  )
}

// 削掉结尾多余的斜杠，避免和下面路径开头的 "/" 拼成 "//api/..."。
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

// 当前登录 token。放在模块级变量里而不是让每个调用方自己传，是为了让这层
// 请求封装保持和 React 解耦——AuthContext 在登录/登出/水合时调用 setAuthToken
// 把 token 镜像进来，request() 就能自动给所有请求带上鉴权头，调用方无感。
let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    // TS 把 `class extends Error` 编译到 ES5 时原型链会断掉，导致
    // `instanceof ApiError` 判断失效（TS 官方文档记录的已知坑）。当前
    // tsconfig target 是 es2023 用不上，但显式设一下没有副作用，防止
    // 以后 target 改动或者被别的构建工具重新降级编译时悄悄失效。
    Object.setPrototypeOf(this, ApiError.prototype)
    this.name = 'ApiError'
    this.status = status
  }
}

// FastAPI 的错误响应体形状不统一：手动抛的 HTTPException(detail="...")
// 给的是字符串，但请求体本身校验失败（如 tailor 缺 keywords 字段）时，
// FastAPI/Pydantic 自动返回 422，detail 是一个 [{msg, loc, type}, ...] 数组。
// 两种都要处理，否则拿到数组直接当字符串用，界面上要么显示 [object Object]
// 要么在 JSX 里直接渲染数组导致 React 报错。
function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') {
      return detail
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          item && typeof item === 'object' && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : String(item),
        )
        .join('; ')
    }
  }
  return `Request failed (HTTP ${status})`
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) {
    return
  }
  const body = await response.json().catch(() => null)
  throw new ApiError(response.status, extractErrorMessage(body, response.status))
}

// 统一的请求入口：三个端点最终都走这里，端点函数只管拼路径和 body。
// 关键点是把 fetch 本身也包进 try/catch —— 断网、后端没启动、连接被拒、
// CORS 预检被浏览器拦截等情况下，fetch 会直接 reject 一个原生 TypeError，
// 根本走不到 throwIfNotOk 那一步状态码判断。这里统一包装成 ApiError，
// status 用 0 表示“请求根本没有到达服务器”（区别于服务器正常响应但
// 返回 4xx/5xx），调用方只需要 catch ApiError 一种类型即可，不用再
// 额外接一层 try/catch 处理网络层异常。
async function request(path: string, init: RequestInit): Promise<Response> {
  // 有 token 就统一带上鉴权头。用 Headers 合并而不是直接铺开 init.headers，
  // 是因为调用方传进来的 headers 可能是数组或 Headers 实例（不只是普通对象），
  // 用 Headers 构造再 set 能把这几种形态都收敛掉，且不会覆盖调用方已设的头。
  if (authToken) {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${authToken}`)
    init = { ...init, headers }
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network request failed'
    throw new ApiError(0, message)
  }
  await throwIfNotOk(response)
  return response
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await request(path, { method: 'GET' })
  return response.json()
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json()
}

export async function postForm<T>(path: string, formData: FormData): Promise<T> {
  // 不手动设 Content-Type：FormData 请求体需要 fetch 自动生成带 boundary
  // 分隔符的 multipart/form-data 头，手动设了反而缺 boundary 导致后端解析失败。
  const response = await request(path, {
    method: 'POST',
    body: formData,
  })
  return response.json()
}

// 后端在 Content-Disposition 里给了建议文件名（如 "Jane_Doe_Resume.pdf"），
// 形如 `attachment; filename="Jane_Doe_Resume.pdf"`。跨域场景下浏览器默认
// 不让 JS 读到这个响应头，除非后端在 CORS 配置里显式 expose_headers——
// app/main.py 里已经加了这一行，这里配合着把文件名解析出来。
function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) {
    return null
  }
  const match = header.match(/filename="?([^"]+)"?/)
  return match ? match[1] : null
}

export async function postJsonForFile(
  path: string,
  body: unknown,
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const filename = parseFilenameFromContentDisposition(response.headers.get('Content-Disposition'))
  const blob = await response.blob()
  return { blob, filename }
}
