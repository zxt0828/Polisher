import type { TailoredResume } from '../../types/resume'

// 这个文件复刻的是后端 app/services/pdf_renderer.py 里 _build_context() 的
// 拼接逻辑（拼 degree+major、拼 start_date+end_date、把 items 改名 entries
// 等）。TailoredResume 本身不带这些拼好的字段，是 Jinja2 模板要用才现拼的；
// 前端要在屏幕上重画同样的排版，就得把这层拼接逻辑也在这边抄一遍。两边
// 各一份、手动同步，是设计文档里权衡过的取舍，不是遗漏。

export interface ResumeViewModel {
  contactName: string
  contactLine: string
  summary: string
  education: Array<{ school: string; degreeMajor: string; gpa: string; dates: string }>
  experience: Array<{
    company: string
    dates: string
    title: string
    location: string
    bullets: string[]
  }>
  projects: Array<{ name: string; techStack: string[]; bullets: string[] }>
  skills: Array<{ category: string; entries: string[] }>
  certifications: Array<{ name: string; issuer: string; date: string }>
}

function joinNonEmpty(parts: string[], separator = ', '): string {
  return parts.filter(Boolean).join(separator)
}

export function buildResumeViewModel(resume: TailoredResume): ResumeViewModel {
  const { contact } = resume
  return {
    contactName: contact.name,
    // 顺序跟 pdf_renderer.py 里的 _build_context 保持一致：
    // city, email, phone, linkedin, github。
    contactLine: joinNonEmpty(
      [contact.city, contact.email, contact.phone, contact.linkedin, contact.github],
      ' | ',
    ),
    summary: resume.summary,
    education: resume.education.map((edu) => ({
      school: edu.school,
      degreeMajor: joinNonEmpty([edu.degree, edu.major], ' '),
      gpa: edu.gpa,
      dates: edu.dates,
    })),
    experience: resume.experience.map((exp) => ({
      company: exp.company,
      dates: joinNonEmpty([exp.start_date, exp.end_date], ' – '),
      title: exp.title,
      location: exp.location,
      bullets: exp.bullets,
    })),
    projects: resume.projects.map((proj) => ({
      name: proj.name,
      techStack: proj.tech_stack,
      bullets: proj.bullets,
    })),
    skills: resume.skills.map((skillCategory) => ({
      category: skillCategory.category,
      entries: skillCategory.items,
    })),
    certifications: resume.certifications.map((cert) => ({
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date,
    })),
  }
}
