# 账户系统（注册 + 登录）— 后端开发计划

> 本次只做**后端**。前端（登录/注册界面）等后端全部跑通后再单独做，见文末「下一期」。

---

## ⚠️ 开发约定（务必遵守，不要乱改）

1. **严格按步骤 0 → 8 的顺序，一次只做一个文件**。写完一个文件就**停下**，等我（用户）看过、确认 OK，再做下一个。不要一口气把多个文件全写了。
2. **只改本计划明确列出的文件**。不得顺手改动、重构、"优化"任何计划范围之外的现有代码（尤其是 `app/api/routes.py`、`app/graph/`、`app/chains/`、`app/services/pdf_*` 等现有向导相关代码）。
3. **不删除、不重命名**现有文件、函数、配置。有疑问先问，不要自作主张。
4. **遵守隐私红线**：真实密码/密钥/邮箱只进 `.env`，绝不写进代码或提交 Git。
5. 每一步改动尽量小而聚焦，方便逐个审阅。

---

## Context（我们在做什么、为什么）

Polisher 现在是**匿名、无状态**的：没有数据库、没有"用户"概念，刷新即丢。本次给它加一套**账户系统**，用 MySQL 存用户信息。

注意："登录功能"其实是一整套，包含三个动作，必须一起做：
- **注册 Register**：第一次创建账户（把用户存进 MySQL）
- **登录 Login**：核对已有账户，发一张"通行证"(JWT token)
- **查身份 Me**：带着通行证问"我是谁"（用来保持登录状态）

没有注册，数据库里就没有用户，登录无从核对——所以三者一体。

### 已确认的选型（记住这几个词就够）
- **JWT**：登录成功后后端签发的一串加密通行证；之后请求带上它，后端验证签名就知道是你，不用反复查密码。无状态、易部署。
- **SQLAlchemy（ORM）**：用 Python 类操作数据库，不手写 SQL；搭配 **PyMySQL** 驱动连 MySQL。
- **bcrypt**：密码加密算法。数据库里**只存加密后的 hash，绝不存明文密码**。
- MySQL：本机已安装并运行。

### 隐私红线（公开仓库！）
- 真实密码、`JWT_SECRET`、含密码的 `DATABASE_URL` **只进 `.env`，绝不提交 Git**；`.env.example` 只放占位符。
- 测试用假邮箱（`jane.doe@example.com`），不用真实 PII。

---

## 后端要建/改的文件全景（先看懂结构）

现有后端布局：入口 `app/main.py`、路由 `app/api/routes.py`、模型 `app/schemas.py`、配置 `app/config.py`、服务 `app/services/`。本次新增的都挂在这套结构里。

```
app/
├── config.py          ← 改：加数据库地址、JWT 密钥的读取
├── db.py              ← 新建：连接 MySQL 的引擎 + 会话
├── models.py          ← 新建：User 表长什么样
├── schemas.py         ← 改：加注册/登录的请求&响应数据格式
├── services/
│   └── auth.py        ← 新建：密码加密、发/验 JWT
├── api/
│   └── auth_routes.py ← 新建：注册/登录/查身份 三个接口
└── main.py            ← 改：挂载新路由 + 启动时自动建表
requirements.txt        ← 改：加 4 个依赖
.env / .env.example     ← 改：加数据库&密钥配置
```

数据流一句话：**请求 → auth_routes（收参数）→ auth.py（加密/发token）→ models（存/查用户）→ db（连数据库）→ 返回**。

---

## 开发步骤（一步一个文件，写完停下等你审）

> 每一步我先写，停下给你看+解释，你确认 OK 我再进下一步。标 🧑‍💻 的是**需要你亲自动手/跑命令**的地方。

### 步骤 0 · 准备数据库和配置 🧑‍💻
本次唯一需要你先动手的前置。
1. 在本机 MySQL 里建空库：`CREATE DATABASE polisher;`
2. 在 `.env` 里加两行（我会给你确切内容，密码填你本机 MySQL 的）：
   ```
   DATABASE_URL=mysql+pymysql://root:你的密码@localhost:3306/polisher
   JWT_SECRET=一串随机长字符串
   ```
   > **关于 `root`**：这里用 `root` **仅为本地开发图省事**（本机装好 MySQL 默认就有 root）。
   > **生产环境绝不用 root**——按「最小权限」原则，应给应用建一个只对 `polisher` 库有增删改查权限的专用用户（见文末「部署」）。
   > 这不影响代码：程序只读 `DATABASE_URL` 这一个环境变量，填谁完全无感。
3. 在 `.env.example` 里加**占位版**（不含真实密码），供别人参考。

### 步骤 1 · 装依赖 🧑‍💻
`requirements.txt` 追加：`SQLAlchemy`、`PyMySQL`、`bcrypt`、`PyJWT`，然后 `pip install -r requirements.txt`。
（`cryptography` 已存在，无需加。）

### 步骤 2 · 配置读取 — 改 `app/config.py`
让程序能从 `.env` 读到数据库地址和 JWT 参数。
- 新增：`DATABASE_URL`、`JWT_SECRET`、`JWT_ALGORITHM`（默认 `HS256`）、`JWT_EXPIRE_MINUTES`（默认 10080 = 7 天，即 token 有效期）。
- 沿用现有 `os.getenv(...)` 写法。

### 步骤 3 · 连接数据库 — 新建 `app/db.py`
搭好"和 MySQL 说话"的通道。包含：
- `engine`：数据库连接（读 `DATABASE_URL`）
- `SessionLocal`：每次操作数据库用的"会话"工厂
- `Base`：所有表模型的基类（步骤 4 的 User 会继承它）
- `get_db()`：给接口用的依赖，自动开/关会话

### 步骤 4 · 用户表长啥样 — 新建 `app/models.py`
定义 `User` 表（继承 `Base`）。字段：
- `id`：主键，自增
- `email`：唯一、加索引（登录靠它查人）
- `password_hash`：加密后的密码（**不是明文**）
- `created_at`：注册时间

### 步骤 5 · 密码与通行证 — 新建 `app/services/auth.py`
账户系统的"安全核心"，纯逻辑、不碰网络。四个函数：
- `hash_password(明文)` → 返回 bcrypt 加密串（注册时存这个）
- `verify_password(明文, hash)` → 登录时核对密码对不对
- `create_access_token(用户id)` → 生成 JWT 通行证
- `decode_token(token)` → 验证并解出通行证里的用户 id

### 步骤 6 · 请求/响应格式 — 改 `app/schemas.py`
定义接口收什么、回什么（Pydantic v2，沿用现有风格）：
- `RegisterRequest`：`{ email, password }`，带 email 格式校验
- `LoginRequest`：`{ email, password }`
- `UserOut`：`{ id, email, created_at }`（**绝不含密码**，回给前端安全）
- `TokenResponse`：`{ access_token, token_type }`

### 步骤 7 · 三个接口 — 新建 `app/api/auth_routes.py`
`APIRouter(prefix="/api/auth")`，实现：
- `POST /api/auth/register`：邮箱没被占 → 存加密密码 → 返回 token（顺便自动登录）
- `POST /api/auth/login`：核对密码 → 返回 token；密码错 → 401
- `GET /api/auth/me`：从 `Authorization: Bearer <token>` 头解出用户 → 返回 `UserOut`；无/错 token → 401
- 附一个 `get_current_user` 依赖，负责"从请求头拿 token 并验证"。

### 步骤 8 · 挂载 + 自动建表 — 改 `app/main.py`
- `app.include_router(auth_router)` 把新接口接上
- 启动时 `Base.metadata.create_all(engine)`：自动在 `polisher` 库里建出 `users` 表（你不用手写建表 SQL）
- CORS 已 `allow_credentials=True` 且允许 `Authorization` 头，无需改；仅注释提醒部署时换 `allow_origins` 域名。

---

## 验证后端跑通（做完上面全部后）🧑‍💻

1. **启动**（macOS 必须带 WeasyPrint 库路径前缀）：
   ```
   DYLD_LIBRARY_PATH=/opt/homebrew/lib uvicorn app.main:app --reload --port 8000
   ```
   启动后去 MySQL 确认 `users` 表已自动建出。
2. **用 curl 或 FastAPI 自带的 `/docs` 页面**冒烟测试（用假邮箱 `jane.doe@example.com`）：
   - 注册 → 拿到 token ✅
   - 用同一邮箱再注册 → 400（已占用）✅
   - 登录（对密码）→ 拿到 token ✅
   - 登录（错密码）→ 401 ✅
   - 带 token 访问 `/me` → 返回该用户 ✅
   - 不带/带错 token 访问 `/me` → 401 ✅
3. **提交前** `git diff` 扫一遍：确认 `.env`（真实密码/密钥）没被加进版本控制、无真实 PII。

---

## 下一期（本次不做）：前端登录/注册界面

后端稳定后再做：登录/注册页（同页切换）、把 Navbar 占位的 "Sign in" 接上、token 存浏览器 localStorage、请求自动带 `Authorization` 头。届时单独出计划。

## 更远（部署，现在完全不用管）

代码全走环境变量，已为部署留好口子。将来部署只需：开一个托管 MySQL（如 Railway/PlanetScale）拿连接串 → 把连接串和 `JWT_SECRET` 填进部署平台环境变量 → CORS 换成真实前端域名。**不改任何业务代码。**

部署时的安全注意（现在不用做，记着即可）：
- **数据库用专用用户，不用 root**（最小权限）。例如：
  ```sql
  CREATE USER 'polisher_app'@'%' IDENTIFIED BY '强密码';
  GRANT SELECT, INSERT, UPDATE, DELETE ON polisher.* TO 'polisher_app'@'%';
  ```
  然后 `DATABASE_URL` 用 `polisher_app` 而非 `root`。
- `JWT_SECRET` 用足够长的随机串，且开发/生产用不同的值。
- 生产数据库只允许后端服务器访问（不对公网开放 3306）、强制 SSL。
- 所有密钥填在部署平台的 Secrets/环境变量里，绝不进 Git。
