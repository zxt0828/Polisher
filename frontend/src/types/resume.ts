// 与后端 app/schemas.py 手动保持字段同步（无跨语言自动生成）。
// 字段名保留后端 JSON 的 snake_case 原样，不转 camelCase：这里没有像
// Spring/Jackson 那样的序列化层做自动改名，字段名必须和 fetch 拿到的
// JSON key 逐字一致，否则读出来就是 undefined。

export interface Contact {
  name: string
  email: string
  phone: string
  city: string
  github: string
  linkedin: string
}

export interface SkillCategory {
  category: string
  items: string[]
}

export interface ExperienceItem {
  company: string
  title: string
  location: string
  start_date: string
  end_date: string
  bullets: string[]
}

export interface ProjectItem {
  name: string
  tech_stack: string[]
  bullets: string[]
}

export interface EducationItem {
  school: string
  degree: string
  major: string
  gpa: string
  dates: string
}

export interface CertificationItem {
  name: string
  issuer: string
  date: string
}

export interface TailoredResume {
  contact: Contact
  summary: string
  skills: SkillCategory[]
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  certifications: CertificationItem[]
}
