# Tailor → Refine 流水线（LangGraph）设计文档

## 背景与动机

tailor 流程里，第一趟 LLM（[app/chains/tailor.py](app/chains/tailor.py)，Opus）按 [app/prompts/tailor.py](app/prompts/tailor.py) 的规则 #3 尽量把目标关键词「塞进 / 对齐」到简历 bullet。这一趟以**关键词覆盖率**为目标，塞得比较满。副作用是有时改得生硬：

- **近义词冗余**：bullet 本已有 `high-concurrency`，关键词里又有近义的 `high-performance`，模型直接用 `and` 并列成 `high-performance and high-concurrency`，重复且别扭。
- **硬塞软性关键词**：为了塞入某个软性 / 伞状关键词（如 `distributed systems`、`scalable`）把句子改得不自然。

直接在规则 #3 里加「自然度优先于覆盖」的护栏会削弱第一趟的覆盖效果，因此**不动第一趟**，改为**职责分离的两趟流水线**，并用 **LangGraph** 组织编排。

## 总体架构

```
                       ┌─────────────────────── tailor_graph（本次实现）───────────────────────┐
 resume_text ─┐        │                                                                       │
 keywords  ───┴──────▶ │  START ──▶ tailor(node) ──▶ refine(node) ──▶ END                       │ ──▶ TailoredResume
                       │            覆盖为主(Opus)     自然度打磨(Sonnet-5)                       │
                       └───────────────────────────────────────────────────────────────────────┘

 extract（关键词提取）保持独立 chain + endpoint，不进 graph（详见「范围决策」）
```

- **第一趟 tailor（不变）**：最大化关键词覆盖，产出完整 `TailoredResume`。
- **第二趟 refine（新增）**：只对 bullet 做**保守**的自然度打磨——合并近义词冗余、改顺生硬插入、删掉塞不进去的关键词，同时保留技术内容与 `<strong>` 加粗。单次 pass（不迭代）。

## 关键设计决策

### 1. refine 只处理 bullet，按 id splice 回原结构
第二趟**只把 `experience` / `projects` 的 bullet** 抽出来交给 LLM，其余字段（contact、education、skills、tech_stack、公司名、GPA、日期……）**根本不进第二趟**，因此物理上不可能被误改。

- 展平：顺序遍历 `resume.experience` 再 `resume.projects`，每条 bullet 分配一个全局递增整数 `id`，形成 `[{"id": i, "text": ...}]`；同时记录 `id -> (section, entry_idx, bullet_idx)`。
- LLM 返回 `RefinedBullets`（同样是 `{id, text}` 列表）。
- **防御式 splice**：按 `id` 命中就用打磨后的文本，未命中则保留原文（模型漏返 / 串号时绝不丢内容）。对副本赋值，不原地修改传入对象。
- bullet 为空时直接返回原简历，跳过一次 LLM 调用。

### 2. refine 用 Sonnet-5，保守打磨
- 模型复用 `ANTHROPIC_MODEL`（`claude-sonnet-5`），自然度润色是轻任务，比第一趟的 Opus 更快更省。
- prompt 首要原则是**最小改动**：大多数 bullet 本就没问题，必须逐字原样返回；只在确有生硬 / 冗余 / 硬塞时才动。宁可少改也不要为改而改。

### 3. 范围：graph 只覆盖 tailor → refine，extract 不进图
关键词提取 extract 中间夹着「用户在 UI 里增删关键词」的人工步骤，且简历 PDF 到 tailor 阶段才上传——这是天然的人工分界。把它塞进同一次 graph run 需要 checkpointer + thread_id + 前端改造，收益极小，故 extract 保持现有独立 chain + endpoint 不变。graph 里只放「喂进去就自动跑完」的自动化步骤。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `requirements.txt` | 新增 `langgraph` 依赖 |
| `app/prompts/refine_bullets.py` | 第二趟的 prompt（英文），保守自然度打磨规则 |
| `app/schemas.py` | 追加 `RefinedBullet` / `RefinedBullets` 结构化输出 schema |
| `app/chains/refine_bullets.py` | `refine_bullets_chain = REFINE_BULLETS_PROMPT \| model(Sonnet-5, structured)` |
| `app/services/bullet_refiner.py` | `refine_resume_bullets(resume, keywords)`：展平 → 调 chain → 防御式 splice |
| `app/graph/state.py` | `TailorState`：`resume_text` / `keywords` / `resume`（可选 `score`） |
| `app/graph/nodes.py` | `tailor_node` / `refine_node`（薄封装）+ `score_node` docstring 桩 |
| `app/graph/build.py` | 组装并 compile `tailor_graph` |
| `app/api/routes.py` | `tailor_resume` 改为 invoke `tailor_graph`，取 `result["resume"]` |

## 预留：打分节点（本次不实现逻辑）

本次只留挂载点，**不写任何打分逻辑，也不接进 live 图路径**（live 图仍是 `tailor → refine → END`）：

- `app/graph/nodes.py` 里加 `score_node` 的 docstring 桩（真函数、`raise NotImplementedError`）；
- `app/graph/build.py` 在 `refine → END` 处用注释标出未来 `score_node` 的挂载位置；
- `TailorState` 预留可选 `score` 字段。

> **将来形态**：打分就是**一条普通 chain**（`app/prompts/` + `app/chains/`，与 tailor / extract 同构，不单开包），`score_node` 只是它的薄封装。产出的 score 是**给用户看的岗位契合度反馈**——用于提示「用户经历 / 项目本身缺岗位要求，可能不适合该岗位」，而不是靠 loop 回 refine 去补。具体评分维度与反馈形式需深入设计，故本次仅预留位置，后续单独开发。

## 验证方式

1. `pip install -r requirements.txt` 后确认 `import langgraph`、`from app.graph.build import tailor_graph` 可用。
2. 临时脚本导入 `tailor_graph`，对同一输入打印**第一趟 vs 第二趟** bullet 对照。需 `ANTHROPIC_API_KEY`；macOS 上带 `DYLD_LIBRARY_PATH=/opt/homebrew/lib`（WeasyPrint 依赖，见 [LOCAL_DEV.md](LOCAL_DEV.md)）。
3. 构造能触发原问题的假数据（Jane Doe 约定，禁用真实 PII）：bullet 含 `high-concurrency`，关键词含 `high-performance` 及软性伞状词。检查第二趟：
   - 不再出现 `high-performance and high-concurrency` 近义并列；
   - 塞不进的软性关键词被删除而非留成 filler；
   - bullet 条数 / 顺序与第一趟完全一致；
   - `<strong>` 加粗保留、无 Markdown `**`；无新造事实 / 数字。
4. 回归：splice 之外字段（contact / education / skills / tech_stack / 日期）与第一趟逐字一致。
5. 端到端：起服务后 `POST /api/resume/tailor`（multipart）确认返回合法 `TailoredResume`、前端可渲染；`POST /api/keywords/extract` 不受影响。
