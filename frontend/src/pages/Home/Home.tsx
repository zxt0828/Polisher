import './Home.css'

interface HomeProps {
  onStart: () => void
}

// 用法说明的三步（对应现有向导流程），纯展示。
const STEPS = [
  'Paste the job description.',
  'Upload your current résumé.',
  'Download your tailored one-page PDF.',
]

export function Home({ onStart }: HomeProps) {
  return (
    <main className="home">
      <div className="home__hero">
        <span className="home__badge">An AI résumé tailoring tool</span>
        <h1 className="home__title">
          Tailor your résumé <em>to the role.</em>
        </h1>
        <p className="home__subtitle">
          Paste a job description and Polisher matches your résumé to it — a polished,
          one-page PDF, ready to send.
        </p>
      </div>

      {/* 中央入口：一个按钮，点了进向导第一步（JD 在第一步再贴）。 */}
      <div className="home__cta">
        <button type="button" className="btn-primary home__cta-btn" onClick={onStart}>
          Tailor my résumé →
        </button>
      </div>
      <p className="home__meta">Free · about 2 min</p>

      <ol className="home__steps">
        {STEPS.map((text, index) => (
          <li key={text} className="home__step">
            <span className="home__step-num">{index + 1}</span>
            <span className="home__step-text">{text}</span>
          </li>
        ))}
      </ol>
    </main>
  )
}
