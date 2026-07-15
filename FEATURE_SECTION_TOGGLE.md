# 功能开发文档：简历 Section 勾选 + 拖拽排序 + 实时 PDF 预览

> 本文档是这次功能开发的**唯一事实来源**。任何参与开发的人（包括 subagent）在动手前必须先读完，
> 开发过程中严格按本文档执行，不得擅自扩大改动范围。有疑问先问、先在本文档留记录，不要凭猜测改代码。

---

## 一、这次要做什么（功能目标）

在 Step 3（Results，简历结果/导出页）加一个「section 编排」能力，**纯展示层**：

1. 用户可以**勾选/取消**要展示哪些可选模块。
2. 用户可以**拖拽调整**这些模块的先后顺序。
3. 预览区展示的是**后端生成的真实 PDF**（不是前端 HTML 模拟稿），勾选/拖拽后**实时**（防抖）重新渲染。
4. 「Download PDF」下载的内容和当前预览一致。

### 六个可选模块（可勾选/可排序）

对应 `TailoredResume` 的字段名，顺序即「规范全顺序」：

```
summary → education → experience → projects → skills → certifications
```

`contact`（姓名 + 联系方式）**不在**这个列表里——它是固定表头，永远无条件渲染在最前面，不可勾选、不可拖拽。

### 默认状态（已用用户真实简历验证过）

- 默认**开启**：`education, experience, projects, skills`（就是这个顺序）
- 默认**关闭**：`summary, certifications`
- 即默认 `sections = ["education", "experience", "projects", "skills"]`

---

## 二、绝对不能碰的红线（范围纪律）

⚠️ 这些是硬约束，违反即为跑偏：

1. **纯展示层**：不改简历生成/tailor 逻辑（`app/chains/`、`app/graph/`、`app/prompts/` 一律不动）。
2. **不动数据**：不删除、不修改 `TailoredResume` 上的任何数据。取消勾选某个 section **只是不渲染它**，底层内容必须原样保留，重新勾选能完整恢复。
3. **不碰无关文件**：`JobKeywords`、`ResumeUpload`、`StepIndicator`、`App.tsx` 的步骤导航逻辑等，除非计划里明确列出，否则不动。
4. **不顺手重构/改名/改格式/改样式**：只改这次功能严格需要的部分。看到别处代码「不够漂亮」也不要动。
5. **计划错了要停**：如果动手时发现计划本身有问题，**停下来**跟用户重新对齐，不要自行改方案。

---

## 三、项目通用开发规范（贯穿所有改动）

这些来自项目既有约定和用户明确要求，务必遵守：

1. **UI 文案全英文**：所有面向用户的前端文字（按钮、提示、label、占位符）必须是英文。
2. **注释、文档、聊天用中文**：代码注释、本文档、跟用户交流一律中文。
3. **不放真实 PII**：这是公开仓库。任何提交进代码/示例的数据都用假数据（沿用 `Jane Doe` 这套约定），
   绝不写入用户真实身份信息（姓名、邮箱、电话等）。读用户简历 PDF 只为确认结构，内容不进代码、不进提交。
4. **每次提交/推送前先筛 PII**：公开仓库，敏感信息零容忍。
5. **macOS 跑后端要带环境变量**：WeasyPrint 找不到 `libgobject`，启动/跑脚本要带
   `DYLD_LIBRARY_PATH=/opt/homebrew/lib`（详见 `LOCAL_DEV.md`）。

### 代码库既有约定（读代码时会遇到，改动要沿用）

- **前后端字段手动同步**：没有跨语言 codegen。`frontend/src/types/resume.ts` 是手抄 `app/schemas.py` 的，
  字段名保留后端 JSON 的 **snake_case 原样**，不转 camelCase（否则读出来是 `undefined`）。
- **skills 用 `entries` 不用 `items`**：Jinja2 里 dict 自带 `.items()` 方法会遮蔽 `.items` 属性访问，
  所以模板上下文里 skills 的字段叫 `entries`。这个约定这次继续保持。
- **统一 API 封装**：前端三个接口都走 `frontend/src/api/client.ts` 里的 `request()`，
  统一抛 `ApiError`。`postJsonForFile` 对请求体形状无感，可直接复用。
- **错误处理**：`client.ts` 已能处理 FastAPI 两种错误体（字符串 detail / 422 数组 detail）。

---

## 四、技术方案（已和用户逐条确认，不再重新讨论）

### 前端状态设计（核心）

在 `Results.tsx`：

```ts
const [order, setOrder] = useState<SectionKey[]>(CANONICAL_ORDER)          // 始终 6 项，只被拖拽改动
const [enabled, setEnabled] = useState<Record<SectionKey, boolean>>(DEFAULT_ENABLED)
const sections = useMemo(() => order.filter((k) => enabled[k]), [order, enabled])
```

- **勾选/取消**：只翻转 `enabled[key]`，**绝不动 `order`**。
  → 因为被取消的 key 在 `order` 里的位置从没被扰动，重新勾选自动回到原位。这就是「恢复到取消前位置」的实现方式，不需要额外记录历史位置。
- **拖拽排序**：`setOrder(arrayMove(order, from, to))`（`@dnd-kit/sortable` 提供），操作完整 6 项数组。
- **6 行全都可拖拽**（不管勾没勾）：全部放进同一个扁平 `SortableContext`。不要拆成「可拖拽子集 + 静态行」，
  那样要做可视下标↔真实下标的换算，容易出错。勾选与否只是 CSS 视觉区分（未勾选变灰）。

### 拖拽（@dnd-kit）

- 新增依赖：`@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`。
- `<DndContext>`（`PointerSensor` 带 `activationConstraint: { distance: 4 }` + `KeyboardSensor`）包 `<SortableContext items={order} strategy={verticalListSortingStrategy}>`。
- 每行 `useSortable({ id: key })`；**拖拽 listeners 只挂在专门的拖拽手柄元素上**，不挂整行——整行有 checkbox，整行可拖会和点击冲突。

### 实时 PDF 预览（防抖）

- `useResumePreview(resume, sections)` hook，返回 `{ previewUrl, isLoading, error }`。
- 变化后防抖 ~400ms 调后端；`clearTimeout` 取消还没触发的；`requestIdRef` 丢弃过期响应（防止先发后到覆盖新结果）。
- Blob URL：换新前 revoke 旧的，卸载时也 revoke。
- 出错保留上一份成功的预览（不闪损坏态），错误用行内文字（复用 `field-error` 样式）。首次加载显示整块占位符，后续刷新只显示不遮挡的小提示。
- 用 `<iframe src={previewUrl}>` 渲染（不用 `<embed>`），只改 `src` 不重挂元素。

### 后端接口

- 新请求体 `ResumeExportRequest { resume, sections }`，`sections` 用 `field_validator` 拒绝未知 key（422）。
- **一个端点** `POST /api/resume/export` 同时服务下载和预览，靠 query 参数 `disposition: Literal["attachment","inline"]` 区分（默认 `attachment`）。
- `_build_context(resume, sections)` 先建 `by_type` 字典，再按 `sections` 过滤/排序成
  `[{"type": key, "data": ...} for key in sections if by_type.get(key)]`——「空模块跳过」逻辑从模板挪到这里。
- `render_resume_pdf(resume, sections=None)`：`None` 时取 `DEFAULT_SECTION_ORDER`，保证 `scripts/try_pdf_renderer.py` 单参数调用不用改、输出不变。
- 模板 `resume.html`：6 个 `{% if %}` 块 → 一个 `{% for section in sections %}` + `{% if/elif section.type == ... %}` 分派，每个分支内部排版原样，只把顶层变量换成 `section.data`。contact 表头在循环之外、保持不变。

### 前端 API 层

```ts
// frontend/src/api/resume.ts
exportResume(resume, sections)   → postJsonForFile('/api/resume/export?disposition=attachment', { resume, sections })
previewResume(resume, sections)  → postJsonForFile('/api/resume/export?disposition=inline', { resume, sections })
```
`client.ts` 不改。

### 死代码清理

真实 PDF 预览取代了前端 HTML 模拟稿，以下变为死代码，**必须删除**（不要留孤儿文件）：
- 删 `frontend/src/steps/Results/resumeViewModel.ts`
- 删 `frontend/src/styles/resume.css`
- 改 `frontend/src/steps/Results/Results.css`：删 `.resume-page`，加 iframe 容器/占位/加载提示/勾选排序列表样式
- 改 `app/templates/resume.html` 里 `<style>` 上方那条「CSS 在前端有同步拷贝」的注释（文件已删，注释会过时）

---

## 五、边界情况（已确认的预期行为）

- **全部取消勾选**：contact 表头照常渲染 → 一份只有联系方式的近空白 PDF，不加阻塞校验，可接受。
- **快速连续操作**：防抖 `clearTimeout` + `requestIdRef` 过期保护兜住。
- **未知 section key 打到接口**：`ResumeExportRequest` 校验器 422 拒绝；`render_resume_pdf` 的 `.get()` 是给直接 Python 调用的第二层防御。
- **CORS**：不用改，`app/main.py` 已有 `expose_headers=["Content-Disposition"]`。
- **组件重挂状态重置**：`order/enabled/预览` 是 `Results` 局部 state，导航离开再回来会重置（和现有 `isDownloading/error` 行为一致），本次不处理。
- **不加缓存**：每次防抖都是真实后端渲染，暂不加结果缓存，作为未来优化点。

---

## 六、涉及文件清单

**后端改**：`app/schemas.py`、`app/services/pdf_renderer.py`、`app/templates/resume.html`、`app/api/routes.py`
**后端不改（确认兼容）**：`scripts/try_pdf_renderer.py`、`app/main.py`

**前端新建**：`frontend/src/steps/Results/sectionConfig.ts`、`SectionsPanel.tsx`、`useResumePreview.ts`
**前端改**：`frontend/package.json`（加 `@dnd-kit/*`）、`Results.tsx`、`Results.css`、`api/resume.ts`
**前端删**：`resumeViewModel.ts`、`styles/resume.css`
**前端不改**：`api/client.ts`、`App.tsx`、`types/resume.ts`

---

## 七、开发流程规范（用户明确要求，务必遵守）

> **一步步来，每改一处代码就停下来给用户看 diff，用户明确同意后才做下一步。绝不一次性把所有文件改完。**

拆分步骤如下（按序执行）：

1. `app/schemas.py`：新增 `ResumeExportRequest` / `SECTION_KEYS` / `DEFAULT_SECTION_ORDER`
2. `app/services/pdf_renderer.py`：改造 `_build_context` / `render_resume_pdf`
3. `app/templates/resume.html`：6 个 `{% if %}` → `{% for section in sections %}` 循环
4. `app/api/routes.py`：`/resume/export` 端点改造（收 `ResumeExportRequest` + `disposition`）
   → 到这一步用 `scripts/try_pdf_renderer.py` 验证后端没改坏
5. `frontend/package.json`：装 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`
6. 新建 `sectionConfig.ts`
7. 新建 `SectionsPanel.tsx`（勾选 + 拖拽 UI）
8. 新建 `useResumePreview.ts`（防抖实时预览 hook）
9. `api/resume.ts`：`exportResume` 改签名 + 新增 `previewResume`
10. `Results.tsx`：接入新模块，去掉旧 HTML 模拟预览
11. 清理死代码：删 `resumeViewModel.ts`、`styles/resume.css`，精简 `Results.css`
12. 前后端联调验证

---

## 八、验证方式

1. **后端不回归**：改动前后各跑一次 `DYLD_LIBRARY_PATH=/opt/homebrew/lib python scripts/try_pdf_renderer.py`，
   确认输出 PDF 一致（模块/顺序不变，certifications 依然不出现）。
2. **后端新能力**：用 curl / FastAPI docs UI 对 `/api/resume/export` 传部分/乱序 `sections`，
   `disposition` 分别试 `inline`/`attachment`，确认 PDF 只含指定模块、顺序对、响应头对。
3. **前端联调**（`LOCAL_DEV.md` 的启动方式）：走到 Step 3，测：
   - 逐个勾选/取消 → 预览增删对应模块
   - 拖拽 → 预览顺序跟着变
   - 取消某项、拖动其他行、再勾回来 → 回到原相对位置
   - Download PDF → 和当前预览一致
   - 全部取消 → 只有联系方式的 PDF，不报错

---

## 九、当前进度（每完成一步在此更新）

- [x] **步骤 1**：`app/schemas.py` 已加 `SECTION_KEYS` / `DEFAULT_SECTION_ORDER` / `ResumeExportRequest`（含 `field_validator` 校验未知 key）。
- [x] **步骤 2**：`app/services/pdf_renderer.py` 已改 `_build_context(resume, sections)`（by_type + 过滤排序）/ `render_resume_pdf(resume, sections=None)`。
- [x] **步骤 3**：`app/templates/resume.html` 已改成 `{% for section in sections %}` 循环，顶部注释已更新。
- [x] **步骤 4**：`app/api/routes.py` 已改 `/resume/export` 收 `ResumeExportRequest` + `disposition`。后端已验证：回归无变化（try_pdf_renderer 输出一致）、过滤/排序/全空/校验器均正确。
- [x] **步骤 5**：已装 `@dnd-kit/core ^6.3.1`、`@dnd-kit/sortable ^10.0.0`、`@dnd-kit/utilities ^3.2.2`。
- [x] **步骤 6**：`sectionConfig.ts` 已建（`SectionKey` / `CANONICAL_ORDER` / `DEFAULT_ENABLED` / `SECTION_LABELS`）。
- [x] **步骤 7**：`SectionsPanel.tsx` 已建（DndContext + SortableContext + 拖拽手柄 + checkbox）。
- [x] **步骤 8**：`useResumePreview.ts` 已建（防抖 400ms + requestId 过期保护 + blob URL 生命周期）。
- [x] **步骤 9**：`api/resume.ts` 已改 `exportResume(resume, sections)` + 新增 `previewResume(resume, sections)`。
- [x] **步骤 10**：`Results.tsx` 已接入 `order/enabled/sections` + `SectionsPanel` + `useResumePreview` + `<iframe>`，去掉旧模拟预览。
- [x] **步骤 11**：已删 `resumeViewModel.ts`、`styles/resume.css`，`Results.css` 已精简（去 `.resume-page`）并加面板/预览样式。前端 `tsc -b` / `oxlint` / `vite build` 全通过。
- [~] **步骤 12**：联调中。发现并修复两处问题：
  - **PDF 空白（根因：后端跑的是旧代码）**：8000 端口的 uvicorn 之前没带 `--reload` 启动，一直用旧的 `export_resume(resume)` 解析 `{resume, sections}`→字段全空→空白 PDF。已重启后端（带 `--reload`），curl 验证 inline + sections 过滤/排序正确、PDF 有内容。**注意：以后改后端代码务必确认后端是带 `--reload` 跑的，或手动重启。**
  - **布局调整（按用户要求）**：把 `SectionsPanel` 从 Results 内部移到左栏 StepIndicator 正下方，中间主区留给 PDF。为此把 `order/enabled/sections` 状态**提升到 `App.tsx`**（原计划说不动 App，此处按用户新要求覆盖），Results 改为接收 `sections` prop 只管预览+下载。改了 `App.tsx`、`Results.tsx`、`Results.css`。tsc/lint 通过。
  - 待用户浏览器实测：勾选/拖拽/恢复位置/下载/全取消。
