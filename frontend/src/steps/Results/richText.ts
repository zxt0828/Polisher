import type { TailoredResume } from '../../types/resume'

// 前端白名单清洗，和后端 app/services/sanitize.py 对齐（纵深防御，后端才是权威）：
// 只保留 <strong>/<em>（b→strong、i→em），去掉其他标签保留文字、去掉所有属性。
// 用 DOM 重建实现：读 out.innerHTML 时浏览器会自动转义文本里的 & < >。
function cleanNodes(src: Node, dst: Node): void {
  src.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      dst.appendChild(document.createTextNode(node.textContent ?? ''))
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const raw = (node as Element).tagName.toLowerCase()
      const tag = raw === 'b' ? 'strong' : raw === 'i' ? 'em' : raw
      if (tag === 'strong' || tag === 'em') {
        const el = document.createElement(tag)
        cleanNodes(node, el)
        dst.appendChild(el)
      } else {
        // 非白名单标签：丢标签、保留其子内容（unwrap）。
        cleanNodes(node, dst)
      }
    }
  })
}

export function sanitizeInline(html: string): string {
  if (!html) return ''
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const out = document.createElement('div')
  cleanNodes(tpl.content, out)
  return out.innerHTML
}

// 每个可编辑区域对应简历里的一个具体字段，用判别联合类型精确定位。
// applyEdit 据此做不可变更新，只克隆被改到的那条路径。
export type FieldPath =
  | { kind: 'contactName' }
  | { kind: 'contactField'; field: 'city' | 'email' | 'phone' | 'linkedin' | 'github' }
  | { kind: 'summary' }
  | {
      kind: 'expField'
      index: number
      field: 'company' | 'title' | 'location' | 'start_date' | 'end_date'
    }
  | { kind: 'expBullet'; index: number; bulletIndex: number }
  | { kind: 'projName'; index: number }
  | { kind: 'projTech'; index: number }
  | { kind: 'projBullet'; index: number; bulletIndex: number }
  | { kind: 'eduField'; index: number; field: 'school' | 'degree' | 'major' | 'gpa' | 'dates' }
  | { kind: 'skillCategory'; index: number }
  | { kind: 'skillItems'; index: number }
  | { kind: 'certField'; index: number; field: 'name' | 'issuer' | 'date' }

// 逗号分隔文本 → 字符串列表（去空白、丢空项）。tech_stack / skills.items 这类
// 列表字段在文档里显示成一整行逗号分隔，编辑后按此回拆成列表。
function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// 返回一个改了指定字段的新 resume（不可变更新，只克隆被触达的路径），
// 其余部分共享引用。value 已经是清洗/trim 过的最终字符串。
export function applyEdit(resume: TailoredResume, path: FieldPath, value: string): TailoredResume {
  switch (path.kind) {
    case 'contactName':
      return { ...resume, contact: { ...resume.contact, name: value } }

    case 'contactField':
      return { ...resume, contact: { ...resume.contact, [path.field]: value } }

    case 'summary':
      return { ...resume, summary: value }

    case 'expField':
      return {
        ...resume,
        experience: resume.experience.map((exp, i) =>
          i === path.index ? { ...exp, [path.field]: value } : exp,
        ),
      }

    case 'expBullet':
      return {
        ...resume,
        experience: resume.experience.map((exp, i) =>
          i === path.index
            ? { ...exp, bullets: exp.bullets.map((b, bi) => (bi === path.bulletIndex ? value : b)) }
            : exp,
        ),
      }

    case 'projName':
      return {
        ...resume,
        projects: resume.projects.map((proj, i) =>
          i === path.index ? { ...proj, name: value } : proj,
        ),
      }

    case 'projTech':
      return {
        ...resume,
        projects: resume.projects.map((proj, i) =>
          i === path.index ? { ...proj, tech_stack: splitCsv(value) } : proj,
        ),
      }

    case 'projBullet':
      return {
        ...resume,
        projects: resume.projects.map((proj, i) =>
          i === path.index
            ? { ...proj, bullets: proj.bullets.map((b, bi) => (bi === path.bulletIndex ? value : b)) }
            : proj,
        ),
      }

    case 'eduField':
      return {
        ...resume,
        education: resume.education.map((edu, i) =>
          i === path.index ? { ...edu, [path.field]: value } : edu,
        ),
      }

    case 'skillCategory':
      return {
        ...resume,
        skills: resume.skills.map((cat, i) =>
          i === path.index ? { ...cat, category: value } : cat,
        ),
      }

    case 'skillItems':
      return {
        ...resume,
        skills: resume.skills.map((cat, i) =>
          i === path.index ? { ...cat, items: splitCsv(value) } : cat,
        ),
      }

    case 'certField':
      return {
        ...resume,
        certifications: resume.certifications.map((cert, i) =>
          i === path.index ? { ...cert, [path.field]: value } : cert,
        ),
      }

    default:
      return resume
  }
}
