// 第三步「section 编排」用到的类型和常量。这里放的是 UI/功能配置（哪些模块、
// 默认开关、显示文案），不是后端 schema 的镜像，所以单独成文件，不塞进 types/resume.ts。
// 六个 key 必须和后端 app/schemas.py 里 SECTION_KEYS / DEFAULT_SECTION_ORDER 一致
// （contact 不在其中——它是固定表头，永远最先渲染，不可勾选/排序）。

export type SectionKey =
  | 'summary'
  | 'education'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'certifications'

// 规范全顺序：拖拽前的初始排列，也是重新勾选时「回到原位」所依据的基准。
export const CANONICAL_ORDER: SectionKey[] = [
  'summary',
  'education',
  'experience',
  'projects',
  'skills',
  'certifications',
]

// 默认开关：education/experience/projects/skills 开，summary/certifications 关。
// 叠加到 CANONICAL_ORDER 上过滤后，默认渲染 education → experience → projects → skills，
// 和用户真实简历的排布一致。
export const DEFAULT_ENABLED: Record<SectionKey, boolean> = {
  summary: false,
  education: true,
  experience: true,
  projects: true,
  skills: true,
  certifications: false,
}

// 勾选列表里每个模块的英文显示名（UI 文案统一英文）。
export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Summary',
  education: 'Education',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills',
  certifications: 'Certifications',
}
