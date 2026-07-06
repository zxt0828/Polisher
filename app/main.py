"""FastAPI 应用入口：创建 app 实例、配置 CORS、挂载路由、暴露健康检查。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(title="Polisher")

# CORS（跨域资源共享）：浏览器出于安全考虑，默认禁止网页 JS 向和自己不同源
# （协议+域名+端口任一不同即算跨域）的后端发请求，这叫「同源策略」。
# 我们的前端（React + Vite）跑在 localhost:5173，这个 FastAPI 后端跑在另一个
# 端口（比如 8000），端口不同就已经算跨域了，所以浏览器会拦截前端对本服务的
# 请求，除非后端通过响应头明确告诉浏览器「这个来源允许访问我」。
# CORSMiddleware 的作用就是自动在响应里加上这些「允许」的头。
# 对比 Spring：这里的 CORSMiddleware 大致相当于 Spring 里的
# WebMvcConfigurer.addCorsMappings / @CrossOrigin 配置。
app.add_middleware(
    CORSMiddleware,
    # 开发环境：显式列出允许的前端源，而不是用通配符 "*"。
    # 生产环境部署时，这里要换成真实的前端域名（例如
    # "https://polisher.example.com"），不能继续用 localhost。
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # 允许 GET/POST/PUT/DELETE 等所有常用 HTTP 方法
    allow_headers=["*"],  # 允许请求携带任意自定义 header（如 Content-Type、Authorization）
)

# include_router 把 routes.py 里定义好的 APIRouter 挂载到这个 app 上。
# router 内部已经自带了 prefix="/api"，所以这里不用再传 prefix 参数，
# 否则会重复拼成 /api/api/...。
# 对比 Spring：这大致相当于把一个带 @RequestMapping("/api") 的 @RestController
# 注册进 Spring 的 DispatcherServlet，让它开始接收对应路径的请求。
app.include_router(router)


@app.get("/")
def health_check() -> dict:
    """健康检查：确认服务已启动，不属于 /api 业务路由。"""
    return {"status": "ok"}
