import { useMemo, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import './App.css'
import { Navbar } from './components/Navbar'
import { StepIndicator } from './components/StepIndicator'
import { Home } from './pages/Home/Home'
import { JobKeywords } from './steps/JobKeywords/JobKeywords'
import { ResumeUpload } from './steps/ResumeUpload/ResumeUpload'
import { Results } from './steps/Results/Results'
import { SectionsPanel } from './steps/Results/SectionsPanel'
import { CANONICAL_ORDER, DEFAULT_ENABLED, type SectionKey } from './steps/Results/sectionConfig'
import type { TailoredResume } from './types/resume'
import type { StepId } from './types/step'

// 页面级大标题：小标签固定不变（整个向导流程的名字），大标题按当前步查表。
// 第二、三步目前用的就是它们各自卡片里原来那句 <h2>，原样搬上来，不是新起的文案。
const PAGE_KICKER = 'TAILOR RÉSUMÉ'

const STEP_HEADINGS: Record<StepId, string> = {
  keywords: 'What role are we tailoring for?',
  resume: 'Step 2: Résumé',
  results: 'Step 3: Results',
}

// 判断两组关键词内容是否一致（不管顺序）：用来决定重新走一遍第一步时，
// 如果最终关键词集合其实没变，就不作废第二、三步已经算出来的结果——
// 对应设计里「只是来回看、没改输入 → 什么都不作废」这条规则。
function sameKeywordSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((word, index) => word === sortedB[index])
}

function App() {
  // 顶层视图：落地页 / 三步向导。沿用「无路由、条件渲染」的思路（同 currentStep）。
  const [view, setView] = useState<'home' | 'wizard'>('home')
  const [currentStep, setCurrentStep] = useState<StepId>('keywords')
  const [jdText, setJdText] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  // 上传的简历文件放在这里而不是 ResumeUpload 内部，否则离开第二步组件卸载后文件会丢。
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null)

  // 简历模块的编排状态放在这里（而不是 Results 内部），因为勾选/排序面板要渲染在
  // 左栏 steps 下方、和右侧的 PDF 预览分处两栏。order 始终是完整 6 项、只被拖拽改动；
  // enabled 记录勾选；sections（真正渲染/导出的列表）= 按 order 过滤出被勾选的。
  // 取消勾选只翻转 enabled、不动 order，重新勾选自然回到原位置。
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(CANONICAL_ORDER)
  const [sectionEnabled, setSectionEnabled] = useState<Record<SectionKey, boolean>>(DEFAULT_ENABLED)
  const sections = useMemo(
    () => sectionOrder.filter((key) => sectionEnabled[key]),
    [sectionOrder, sectionEnabled],
  )

  function handleSectionToggle(key: SectionKey) {
    setSectionEnabled((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSectionReorder(activeId: SectionKey, overId: SectionKey) {
    setSectionOrder((prev) => arrayMove(prev, prev.indexOf(activeId), prev.indexOf(overId)))
  }

  // 后端无状态，某一步有没有数据完全取决于前端这几个 state 是否已经填过。
  // 指示器里能不能点回某一步，就看那一步是否已经产出过数据。
  function isStepReachable(step: StepId): boolean {
    if (step === 'keywords') {
      return true
    }
    if (step === 'resume') {
      return keywords.length > 0
    }
    return tailoredResume !== null
  }

  function handleStepSelect(step: StepId) {
    if (step === currentStep || !isStepReachable(step)) {
      return
    }
    setCurrentStep(step)
  }

  // 第一步确认关键词：集合变了（重新提取过、或删剩的词不一样了）就说明
  // 第二、三步是基于旧关键词做出来的，跟着作废；集合没变就什么都不清。
  function handleKeywordsConfirmed(finalKeywords: string[]) {
    const changed = !sameKeywordSet(finalKeywords, keywords)
    setKeywords(finalKeywords)
    if (changed) {
      setTailoredResume(null)
    }
    setCurrentStep('resume')
  }

  function handleResumeTailored(resume: TailoredResume) {
    setTailoredResume(resume)
    setCurrentStep('results')
  }

  // 从落地页进向导：始终落到第一步（贴 JD），再切视图。
  function handleStartFromHome() {
    setCurrentStep('keywords')
    setView('wizard')
  }

  return (
    <>
      <Navbar onHome={() => setView('home')} />
      {view === 'home' ? (
        <Home onStart={handleStartFromHome} />
      ) : (
        <div className="app-layout">
          <header className="page-header">
        <span className="eyebrow">{PAGE_KICKER}</span>
        <h1>{STEP_HEADINGS[currentStep]}</h1>
      </header>
      <div className="app-columns">
        <div className="app-sidebar">
          <StepIndicator
            currentStep={currentStep}
            isReachable={isStepReachable}
            onSelect={handleStepSelect}
          />
          {currentStep === 'results' && tailoredResume && (
            <SectionsPanel
              order={sectionOrder}
              enabled={sectionEnabled}
              onToggle={handleSectionToggle}
              onReorder={handleSectionReorder}
            />
          )}
        </div>
        <main className="app-content">
          <div className="content-card">
            {currentStep === 'keywords' && (
              <JobKeywords
                jdText={jdText}
                onJdTextChange={setJdText}
                initialKeywords={keywords}
                onNext={handleKeywordsConfirmed}
              />
            )}
            {currentStep === 'resume' && (
              <ResumeUpload
                keywords={keywords}
                file={resumeFile}
                onFileChange={setResumeFile}
                onNext={handleResumeTailored}
              />
            )}
            {currentStep === 'results' && tailoredResume && (
              <Results resume={tailoredResume} sections={sections} />
            )}
            </div>
          </main>
        </div>
        </div>
      )}
    </>
  )
}

export default App
