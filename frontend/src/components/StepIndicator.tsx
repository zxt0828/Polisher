import type { StepId } from '../types/step'
import './StepIndicator.css'

const STEPS: Array<{ id: StepId; number: number; label: string }> = [
  { id: 'keywords', number: 1, label: 'Job & Keywords' },
  { id: 'resume', number: 2, label: 'Résumé' },
  { id: 'results', number: 3, label: 'Results' },
]

interface StepIndicatorProps {
  currentStep: StepId
  isReachable: (step: StepId) => boolean
  onSelect: (step: StepId) => void
}

export function StepIndicator({ currentStep, isReachable, onSelect }: StepIndicatorProps) {
  return (
    <nav className="step-indicator" aria-label="Progress">
      <ol>
        {STEPS.map(({ id, number, label }) => {
          const isCurrent = id === currentStep
          const reachable = isReachable(id)
          const clickable = !isCurrent && reachable
          return (
            <li
              key={id}
              className={[
                'step-indicator__item',
                isCurrent ? 'is-current' : '',
                clickable ? 'is-clickable' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button type="button" disabled={!clickable} onClick={() => onSelect(id)}>
                <span className="step-indicator__number">{number}</span>
                <span className="step-indicator__text">
                  <span className="step-indicator__label">{label}</span>
                  {isCurrent && <span className="step-indicator__status">In progress</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
