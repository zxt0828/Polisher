[English](README.md) | 中文

# Polisher

Polisher 是一个 AI 简历优化助手，帮助求职者根据具体的职位描述（JD）快速调整简历，提高通过 ATS（申请人跟踪系统）筛选的概率，同时给出通用的简历修改建议。

![Polisher — Job & Keywords 步骤](docs/preview.png)

## 使用流程

Polisher 是一个三步向导：

1. **Job & Keywords** —— 粘贴目标岗位的 JD。后端提取其中的关键词和技能要求，以可编辑的 chips 呈现，你可以在继续前删掉不相关的词。
2. **Résumé** —— 上传简历（PDF）。系统解析其文本，连同确认后的关键词一起送入两遍式的定制流程。
3. **Results** —— 在可内联编辑的文档里预览定制后的简历，调整/勾选各模块的顺序与显隐，并导出为可打印的 PDF。**Tailor for a new job** 按钮会重置整个向导，方便你立即针对另一份 JD 重新定制。

底层的定制是一条 [LangGraph](https://langchain-ai.github.io/langgraph/) 两遍式流水线：先由 **tailor** 遍重写经历要点以覆盖目标关键词，再由 **refine** 遍把措辞打磨回自然、像真人写的表达。两遍都通过 `langchain-anthropic` 调用 Claude。

## 技术栈

- **后端：** Python、FastAPI、LangGraph + LangChain、Anthropic Claude。PDF 解析用 `pdfplumber`；PDF 渲染用 Jinja2 HTML 模板 + WeasyPrint。
- **前端：** React 19 + TypeScript + Vite，用 `@dnd-kit` 做模块拖拽排序。

## API

后端在 `/api` 下暴露三个接口：

| 接口 | 方法 | 作用 |
| --- | --- | --- |
| `/api/keywords/extract` | POST | 从粘贴的 JD 中提取关键词（JSON body） |
| `/api/resume/tailor` | POST | 根据关键词定制上传的简历（multipart form） |
| `/api/resume/export` | POST | 把最终简历渲染成可下载的 PDF |

## 项目结构

```
app/                    # FastAPI 后端
├── main.py             # 应用入口：CORS、挂载路由、健康检查
├── config.py           # 配置 / 环境变量加载
├── schemas.py          # Pydantic 请求/响应模型
├── api/routes.py       # 三个 /api 接口
├── chains/             # LangChain chains（extract_keywords、tailor、refine_bullets）
├── graph/              # LangGraph 两遍式流水线（build、nodes、state）
├── prompts/            # 提示词模板
├── services/           # pdf_parser、pdf_renderer、bullet_refiner、jd_fetcher、sanitize
└── templates/resume.html   # 渲染导出 PDF 用的 Jinja2 模板

frontend/               # React + Vite 前端
└── src/
    ├── App.tsx         # 顶层视图 + 向导状态
    ├── pages/Home/     # 落地页
    ├── steps/          # JobKeywords、ResumeUpload、Results
    ├── components/     # Navbar、StepIndicator、KeywordChips、Wordmark
    ├── api/            # 后端客户端
    ├── styles/         # 设计 token + 简历样式
    └── types/          # 共享的 TypeScript 类型

scripts/                # 本地开发 + 手动试跑脚本
```

## 快速开始

### 前置条件

- Python 3.11，根目录有 `.venv` 并已安装 `requirements.txt` 里的依赖
- Node.js，`frontend/node_modules` 已 `npm install`
- 一个 Anthropic API key
- 仅 macOS：WeasyPrint 需要原生的 Pango/Cairo 库（`brew install pango`）

### 配置

```bash
cp .env.example .env                   # 填入 ANTHROPIC_API_KEY
cp frontend/.env.example frontend/.env # VITE_API_BASE_URL=http://localhost:8000
```

### 启动后端（`http://localhost:8000`）

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

在 Apple Silicon Mac 上，需要给命令加前缀，让 WeasyPrint 能加载它的原生库：

```bash
DYLD_LIBRARY_PATH=/opt/homebrew/lib uvicorn app.main:app --reload --port 8000
```

### 启动前端（`http://localhost:5173`）

```bash
cd frontend
npm run dev
```

然后打开 `http://localhost:5173`，即可看到上图所示的向导界面。

## 当前状态

项目处于 early development 阶段，当前 MVP 聚焦于把"JD定向优化"功能端到端跑通（提取 → 定制 → 打磨 → 导出）。
