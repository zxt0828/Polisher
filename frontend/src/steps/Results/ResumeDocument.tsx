import type { TailoredResume } from '../../types/resume'
import { EditableText } from './EditableText'
import { FloatingToolbar } from './FloatingToolbar'
import type { FieldPath } from './richText'
import type { SectionKey } from './sectionConfig'

interface ResumeDocumentProps {
  resume: TailoredResume
  sections: SectionKey[]
  onCommit: (path: FieldPath, value: string) => void
}

// 结构与后端 app/templates/resume.html 对齐：contact 表头永远最先渲染，然后按
// sections 顺序逐个渲染模块、空模块跳过（跟 _build_context 的过滤保持一致）。
// 所有字段用 EditableText 可就地编辑：正文类（summary/bullets）用 rich 支持加粗斜体，
// 其余用 plain。列表字段（tech_stack、skills.items）显示成一整行逗号分隔、编辑后回拆。

// contact 行里各子字段的展示顺序（与后端 _build_context 一致）。
const CONTACT_FIELDS = ['city', 'email', 'phone', 'linkedin', 'github'] as const

export function ResumeDocument({ resume, sections, onCommit }: ResumeDocumentProps) {
  // 只渲染非空的 contact 子字段，之间用 " | " 分隔（镜像后端 join）。
  const contactParts = CONTACT_FIELDS.filter((field) => resume.contact[field])

  function renderSection(key: SectionKey) {
    switch (key) {
      case 'summary':
        if (!resume.summary) return null
        return (
          <section className="section" key={key}>
            <h2 className="section-heading">Summary</h2>
            <EditableText
              value={resume.summary}
              path={{ kind: 'summary' }}
              onCommit={onCommit}
              mode="rich"
              as="p"
              className="summary-text"
            />
          </section>
        )

      case 'education':
        if (resume.education.length === 0) return null
        return (
          <section className="section" key={key}>
            <h2 className="section-heading">Education</h2>
            {resume.education.map((edu, i) => (
              <div className="entry row" key={i}>
                <span className="entry-title">
                  <EditableText
                    value={edu.school}
                    path={{ kind: 'eduField', index: i, field: 'school' }}
                    onCommit={onCommit}
                  />
                  {(edu.degree || edu.major) && (
                    <>
                      {', '}
                      <EditableText
                        value={edu.degree}
                        path={{ kind: 'eduField', index: i, field: 'degree' }}
                        onCommit={onCommit}
                        placeholder="Degree"
                      />
                      {' '}
                      <EditableText
                        value={edu.major}
                        path={{ kind: 'eduField', index: i, field: 'major' }}
                        onCommit={onCommit}
                        placeholder="Major"
                      />
                    </>
                  )}
                  {edu.gpa && (
                    <>
                      , GPA:{' '}
                      <EditableText
                        value={edu.gpa}
                        path={{ kind: 'eduField', index: i, field: 'gpa' }}
                        onCommit={onCommit}
                        as="strong"
                      />
                    </>
                  )}
                </span>
                {edu.dates && (
                  <EditableText
                    value={edu.dates}
                    path={{ kind: 'eduField', index: i, field: 'dates' }}
                    onCommit={onCommit}
                  />
                )}
              </div>
            ))}
          </section>
        )

      case 'experience':
        if (resume.experience.length === 0) return null
        return (
          <section className="section" key={key}>
            <h2 className="section-heading">Experience</h2>
            {resume.experience.map((exp, i) => (
              <div className="entry" key={i}>
                <div className="row">
                  <EditableText
                    value={exp.company}
                    path={{ kind: 'expField', index: i, field: 'company' }}
                    onCommit={onCommit}
                    className="entry-title"
                  />
                  {(exp.start_date || exp.end_date) && (
                    <span>
                      <EditableText
                        value={exp.start_date}
                        path={{ kind: 'expField', index: i, field: 'start_date' }}
                        onCommit={onCommit}
                        placeholder="Start"
                      />
                      {' – '}
                      <EditableText
                        value={exp.end_date}
                        path={{ kind: 'expField', index: i, field: 'end_date' }}
                        onCommit={onCommit}
                        placeholder="End"
                      />
                    </span>
                  )}
                </div>
                {(exp.title || exp.location) && (
                  <div className="row entry-subtitle">
                    <EditableText
                      value={exp.title}
                      path={{ kind: 'expField', index: i, field: 'title' }}
                      onCommit={onCommit}
                      placeholder="Title"
                    />
                    <EditableText
                      value={exp.location}
                      path={{ kind: 'expField', index: i, field: 'location' }}
                      onCommit={onCommit}
                      placeholder="Location"
                    />
                  </div>
                )}
                {exp.bullets.length > 0 && (
                  <ul className="bullets">
                    {exp.bullets.map((bullet, bi) => (
                      <li key={bi}>
                        <span className="bullet-mark">●</span>
                        <EditableText
                          value={bullet}
                          path={{ kind: 'expBullet', index: i, bulletIndex: bi }}
                          onCommit={onCommit}
                          mode="rich"
                          className="bullet-text"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )

      case 'projects':
        if (resume.projects.length === 0) return null
        return (
          <section className="section" key={key}>
            <h2 className="section-heading">Projects</h2>
            {resume.projects.map((proj, i) => (
              <div className="entry" key={i}>
                <EditableText
                  value={proj.name}
                  path={{ kind: 'projName', index: i }}
                  onCommit={onCommit}
                  as="div"
                  className="entry-title"
                />
                {proj.tech_stack.length > 0 && (
                  <EditableText
                    value={proj.tech_stack.join(', ')}
                    path={{ kind: 'projTech', index: i }}
                    onCommit={onCommit}
                    as="div"
                    className="tech-stack"
                  />
                )}
                {proj.bullets.length > 0 && (
                  <ul className="bullets">
                    {proj.bullets.map((bullet, bi) => (
                      <li key={bi}>
                        <span className="bullet-mark">●</span>
                        <EditableText
                          value={bullet}
                          path={{ kind: 'projBullet', index: i, bulletIndex: bi }}
                          onCommit={onCommit}
                          mode="rich"
                          className="bullet-text"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )

      case 'skills':
        if (resume.skills.length === 0) return null
        return (
          <section className="section" key={key}>
            <h2 className="section-heading">Skills</h2>
            {resume.skills.map((cat, i) => (
              <div className="skills-line" key={i}>
                <EditableText
                  value={cat.category}
                  path={{ kind: 'skillCategory', index: i }}
                  onCommit={onCommit}
                  as="strong"
                />
                :{' '}
                <EditableText
                  value={cat.items.join(', ')}
                  path={{ kind: 'skillItems', index: i }}
                  onCommit={onCommit}
                />
              </div>
            ))}
          </section>
        )

      case 'certifications':
        if (resume.certifications.length === 0) return null
        return (
          <section className="section" key={key}>
            <h2 className="section-heading">Certifications</h2>
            {resume.certifications.map((cert, i) => (
              <div className="entry row" key={i}>
                <span className="entry-title">
                  <EditableText
                    value={cert.name}
                    path={{ kind: 'certField', index: i, field: 'name' }}
                    onCommit={onCommit}
                  />
                  {cert.issuer && (
                    <>
                      {' — '}
                      <EditableText
                        value={cert.issuer}
                        path={{ kind: 'certField', index: i, field: 'issuer' }}
                        onCommit={onCommit}
                      />
                    </>
                  )}
                </span>
                {cert.date && (
                  <EditableText
                    value={cert.date}
                    path={{ kind: 'certField', index: i, field: 'date' }}
                    onCommit={onCommit}
                  />
                )}
              </div>
            ))}
          </section>
        )

      default:
        return null
    }
  }

  return (
    <div className="resume-doc">
      <FloatingToolbar />
      <EditableText
        value={resume.contact.name}
        path={{ kind: 'contactName' }}
        onCommit={onCommit}
        as="div"
        className="contact-name"
      />
      {contactParts.length > 0 && (
        <div className="contact-line">
          {contactParts.map((field, i) => (
            <span key={field}>
              {i > 0 && ' | '}
              <EditableText
                value={resume.contact[field]}
                path={{ kind: 'contactField', field }}
                onCommit={onCommit}
              />
            </span>
          ))}
        </div>
      )}
      {sections.map((key) => renderSection(key))}
    </div>
  )
}
