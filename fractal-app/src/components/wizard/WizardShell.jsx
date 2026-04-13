import { ChevronRight } from 'lucide-react'
import useUIStore from '../../store/uiStore'
import useScreenplayStore from '../../store/screenplayStore'
import ParseConfirmStep from './ParseConfirmStep'
import MethodologyStep from './MethodologyStep'
import AnalyzingStep from './AnalyzingStep'

const STEP_LABELS = { 1: 'Confirm Parse', 2: 'Methodology', 3: 'Analyzing' }

const crumbStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'inherit',
  padding: '4px 0', textDecoration: 'none',
}

export default function WizardShell() {
  const wizardStep = useUIStore(s => s.wizardStep)
  const setWizardStep = useUIStore(s => s.setWizardStep)
  const { screenplay, closeProject } = useScreenplayStore()

  if (wizardStep < 1 || wizardStep > 3) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--bg-canvas)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px',
    }}>
      {/* Breadcrumb navigation */}
      <div style={{
        position: 'absolute', top: 16, left: 24,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <button onClick={closeProject} style={crumbStyle}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          Projects
        </button>
        <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
        <button onClick={() => setWizardStep(0)} style={crumbStyle}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          title="Skip wizard"
        >
          {screenplay?.title || 'Script'}
        </button>
        <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>
          {STEP_LABELS[wizardStep]}
        </span>
      </div>

      {/* Step indicator — 3 dots */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1, 2, 3].map(step => (
          <div key={step} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: step <= wizardStep ? 'var(--accent-primary)' : 'var(--border-default)',
            transition: 'background 0.2s ease',
          }} />
        ))}
      </div>

      {/* Active step */}
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {wizardStep === 1 && <ParseConfirmStep />}
        {wizardStep === 2 && <MethodologyStep />}
        {wizardStep === 3 && <AnalyzingStep />}
      </div>
    </div>
  )
}
