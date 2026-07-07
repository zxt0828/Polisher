import { useState } from 'react'
import { ApiError } from '../../api/client'
import { exportResume } from '../../api/resume'
import type { TailoredResume } from '../../types/resume'
import { buildResumeViewModel } from './resumeViewModel'
import '../../styles/resume.css'
import './Results.css'

interface ResultsProps {
  resume: TailoredResume
}

// 跟后端 pdf_renderer.py 的 build_export_filename 逻辑保持一致：只在
// Content-Disposition 读不到文件名时（比如 CORS 配置以后被改动）兜底用。
function buildFallbackFilename(resume: TailoredResume): string {
  const safeName = resume.contact.name.trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  return safeName ? `${safeName}_Resume.pdf` : 'resume.pdf'
}

export function Results({ resume }: ResultsProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const vm = buildResumeViewModel(resume)

  async function handleDownload() {
    setIsDownloading(true)
    setError(null)
    try {
      const { blob, filename } = await exportResume(resume)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename ?? buildFallbackFilename(resume)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <section>
      <div className="results-toolbar">
        <span className="eyebrow">Tailored Resume</span>
        <button type="button" className="btn-primary" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="resume-page">
        <div className="resume-preview">
          <div className="contact-name">{vm.contactName}</div>
          {vm.contactLine && <div className="contact-line">{vm.contactLine}</div>}

          {vm.summary && (
            <section className="section">
              <h2 className="section-heading">Summary</h2>
              <p className="summary-text">{vm.summary}</p>
            </section>
          )}

          {vm.education.length > 0 && (
            <section className="section">
              <h2 className="section-heading">Education</h2>
              {vm.education.map((edu, index) => (
                <div className="entry row" key={index}>
                  <span className="entry-title">
                    {edu.school}
                    {edu.degreeMajor && `, ${edu.degreeMajor}`}
                    {edu.gpa && (
                      <>
                        , GPA: <strong>{edu.gpa}</strong>
                      </>
                    )}
                  </span>
                  {edu.dates && <span>{edu.dates}</span>}
                </div>
              ))}
            </section>
          )}

          {vm.experience.length > 0 && (
            <section className="section">
              <h2 className="section-heading">Experience</h2>
              {vm.experience.map((exp, index) => (
                <div className="entry" key={index}>
                  <div className="row">
                    <span className="entry-title">{exp.company}</span>
                    {exp.dates && <span>{exp.dates}</span>}
                  </div>
                  {(exp.title || exp.location) && (
                    <div className="row entry-subtitle">
                      <span>{exp.title}</span>
                      <span>{exp.location}</span>
                    </div>
                  )}
                  {exp.bullets.length > 0 && (
                    <ul className="bullets">
                      {exp.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex}>
                          <span className="bullet-mark">●</span>
                          <span className="bullet-text">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {vm.projects.length > 0 && (
            <section className="section">
              <h2 className="section-heading">Projects</h2>
              {vm.projects.map((proj, index) => (
                <div className="entry" key={index}>
                  <div className="entry-title">{proj.name}</div>
                  {proj.techStack.length > 0 && (
                    <div className="tech-stack">{proj.techStack.join(', ')}</div>
                  )}
                  {proj.bullets.length > 0 && (
                    <ul className="bullets">
                      {proj.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex}>
                          <span className="bullet-mark">●</span>
                          <span className="bullet-text">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {vm.skills.length > 0 && (
            <section className="section">
              <h2 className="section-heading">Skills</h2>
              {vm.skills.map((skillCategory, index) => (
                <div className="skills-line" key={index}>
                  <strong>{skillCategory.category}</strong>: {skillCategory.entries.join(', ')}
                </div>
              ))}
            </section>
          )}

          {vm.certifications.length > 0 && (
            <section className="section">
              <h2 className="section-heading">Certifications</h2>
              {vm.certifications.map((cert, index) => (
                <div className="entry row" key={index}>
                  <span className="entry-title">
                    {cert.name}
                    {cert.issuer && ` — ${cert.issuer}`}
                  </span>
                  {cert.date && <span>{cert.date}</span>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
