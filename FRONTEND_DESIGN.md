# Polisher 前端设计文档

本文件是前端开发前的完整设计方案（结构、数据流、交互、视觉），作为开发依据。
当前阶段目标：先把结构与数据流跑通（只读为主 + 关键词可删除），视觉美化随后再套。

---

## 一、定位与技术栈

- 前端是 Polisher 的三步式界面，让用户走完「贴 JD → 传简历 → 下载 PDF」。
- 技术栈：**React + Vite + TypeScript**。
- 位置：项目根下新建 **`frontend/`** 文件夹，与后端 `app/` 平级，同一个 git 仓库（monorepo）。
- `node_modules/` 必须 gitignore，只提交 `package.json` 清单（对应后端「`.venv` 不进 git、`requirements.txt` 进 git」）。
- 前后端各自启动：后端在项目根 `uvicorn app.main:app`（:8000），前端 `cd frontend && npm run dev`（:5173），靠已配好的 CORS 互通。

---

## 二、目录结构（按功能/步骤分，不堆一个大 components/）

```
frontend/src/
  api/          调后端的封装层（类似 Spring 的 Client 层）
    client.ts   封装 fetch、统一处理非 2xx 错误
    keywords.ts extract 接口
    resume.ts   tailor / export 接口
  types/        对应后端 schemas.py 的 TS 版本（手动保持同步）
    resume.ts   TailoredResume、Contact、ExperienceItem...
  steps/        三步各一个文件夹
    JobKeywords/   第一步
    ResumeUpload/  第二步
    Results/       第三步
  App.tsx       决定当前在哪一步、持有全部流程状态
  main.tsx      入口
```

`types/resume.ts` 需与后端 `schemas.py` 字段手动对齐（TS 无跨语言自动生成）。

---

## 三、状态管理（对应后端无状态）

后端每个 endpoint 无状态，跨步骤传数据的责任全在前端——状态提到 `App.tsx` 顶层往下传（状态提升）。
体量小（3 步、线性、单用户），**不上 Redux/Zustand**，几个 `useState` 即可：

```
currentStep: 'keywords' | 'resume' | 'results'
jdText: string
keywords: string[]
tailoredResume: TailoredResume | null
```

**不用 React Router**，用 `currentStep` 变量 + 条件渲染切换步骤。

---

## 四、三步流程

**第一步 Job & Keywords**
贴 JD → 点「提取关键词」→ 调 `extract` → 显示关键词。
- **关键词可删除**：每个关键词渲染成一个独立小标签（chip），带一个 × 按钮，点击删除该词。
- 删除只在前端操作（从 `keywords` 数组移除），最终把剩余关键词带进第二步。
- 这一版**只做删除，不做手动添加新词**。
- 若关键词被**全部删空**，禁用「进入下一步」按钮并提示「至少保留一个关键词」。
- 用户若回到第一步**重新提取**，则拿到全新一批（覆盖之前的删除操作）。

**第二步 Résumé**
上传 PDF + 带上第一步关键词 → 调 `tailor` → 拿到 `TailoredResume`。
- 上传前**前端先校验**（拦非 PDF、超大文件，避免白跑一趟后端 400）。

**第三步 Results**
展示框渲染 `TailoredResume`（**这一版只读**）+ 右上角 Download 按钮 → 调 `export` → 下载 PDF。

---

## 五、三个接口怎么调

- **extract**：普通 JSON POST，body `{jd_text}`，收 `{keywords}`。
- **tailor**：multipart，用浏览器原生 `FormData` 装文件 + keywords 字符串。
  - 坑：**不能手动设 `Content-Type`**，要让 fetch 自动生成（它要自己算 boundary）。
  - keywords 以逗号分隔字符串发送（后端只接收字符串，不关心前端删了哪些）。
- **export**：响应是二进制 PDF 流不是 JSON。流程：
  fetch → `.blob()` → `URL.createObjectURL` 生成临时 URL → 塞进隐藏 `<a>` 配 `download` 触发下载 → `revokeObjectURL` 释放。
- **错误处理**：在 `api/client.ts` 统一做（查 `response.ok`、非 2xx 抛自定义错误），各步骤 try/catch 显示提示（类似 Spring `@ControllerAdvice`，前端需在调用层手动做）。

---

## 六、展示框复用后端样式（方案 A）

第三步展示框与 export 的 PDF **共用同一套 CSS**，保证屏幕预览与下载 PDF 视觉一致（从根上避免「所见不等于所得」）。

做法：
- 把后端 `resume.html` 里 `<style>` 的 CSS 抽成独立 **`resume.css`**，前后端共用同一份。
- 前端用 **JSX 按相同类名/DOM 结构重画**（不能直接用 Jinja2 模板，浏览器不认）。
- 在前端**复刻一份 `_build_context` 的拼接逻辑**（拼 degree+major、拼日期等）。

选方案 A（而非「后端直接返 HTML 塞 iframe」）的原因：JSX 是原生可交互 DOM，**以后要做可编辑改起来自然**。
代价：拼接逻辑前后端各一份，需手动同步。

---

## 七、返回上一步

支持回退，规则：
- **回退本身不清空数据**：用户回看时，关键词、tailor 结果都保留，往前走能直接回到已有结果。
- **一旦改了某步输入并重新提交，下游基于旧输入的结果作废重做**：
  - 改第一步（重新提取关键词）→ 作废第二、三步结果
  - 改第二步（换简历重新 tailor）→ 作废第三步结果
  - 只是来回看、没改输入 → 什么都不作废
- 触发方式：点击左侧三步进度指示器里「已完成的步骤」（已完成可点、未到不可点）。

---

## 八、其他决定

- **Loading + 防重复提交**：extract/tailor/export 均有明显延迟，按钮点击后 disable + loading 提示，防手抖多点、多烧 LLM token。
- **API base URL 用 Vite 环境变量**（`.env` + `import.meta.env`），不写死——以后部署切换域名只改一个值。
- **视觉美化这一版不做**：先把结构与数据流跑通，能走完三步、能下载 PDF 即可。

---

## 九、视觉风格（editorial，攒着，结构稳后再套）

参考 lettergen 的**设计语言**（风格手法，非克隆页面、不抄具体文案）：

- **配色极度克制**：暖白/米白背景（非纯白），文字深灰近黑，几乎不用品牌彩色；唯一点缀是很淡的功能色（如侧边提示的低饱和竖线）。
- **衬线标题 + 无衬线正文**：大标题用 serif（有质感），正文/按钮/说明用 sans-serif。
- **大量留白**：元素之间敢空，从容不拥挤。
- **竖排三步进度指示器**：圆圈数字 + 步骤名 + 当前步状态，细线串起，当前步高亮、未到灰掉，已完成可点击回退。
- **主内容放白卡片**：几乎无边框、极淡阴影托起，与米白背景形成微妙层次。
- **小标签用全大写 + 疏字距**（letter-spacing），字号小、颜色灰。
- **按钮低调**：低饱和色、圆角适中，配灰色说明文字，不做高对比大红大蓝。

一句话设计语言：*editorial 风格——暖白背景、黑白灰为主几乎不用彩色、衬线标题配无衬线正文、大量留白、小标签用大写+疏字距、白卡片配极淡阴影、按钮低饱和不抢眼、竖排三步进度指示器。*

---

## 十、待处理 / 注意

- **后端待补一行**：联调 export 时，`app/main.py` 的 CORS 加 `expose_headers=["Content-Disposition"]`，前端才能读到后端生成的文件名（如 `Jane_Doe_Resume.pdf`）。不加也能下载，只是文件名不好看。**现在不用改，做到第三步再回来加。**
- **隐私**：测试用的示例简历/截图用假名（如 Jane Doe），不要把真实简历数据提交进仓库。
- **类型同步**：`types/resume.ts` 与后端 `schemas.py` 字段手动对齐。

---

## 总纲（一句话）

React + Vite + TS，放 `frontend/`；三步线性流程用顶层 `useState` + `currentStep` 条件渲染管状态（不上路由、不上状态库）；三个接口封装在 `api/` 层；第一步关键词可删除（chip + ×），第三步展示框走方案 A（JSX 重画 + 共用 `resume.css`）为以后可编辑铺路；支持「回看不丢、改上游作废下游」的回退；这一版只读为主、先跑通结构与数据流，视觉（editorial）和编辑功能都往后放。
