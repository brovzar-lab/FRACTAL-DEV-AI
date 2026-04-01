// Props: none — reads state from stores directly

import useUIStore from '../../store/uiStore'
import ParseConfirmStep from './ParseConfirmStep'
import MethodologyStep from './MethodologyStep'
import AnalyzingStep from './AnalyzingStep'  // will be built in Task 5
// SnapshotView is rendered by FractalCanvas, not by the wizard

export default function WizardShell() {
  const wizardStep = useUIStore(s => s.wizardStep)

  // Steps: 1=ParseConfirm, 2=Methodology, 3=Analyzing
  // Step 0 = not shown, Step 4+ = wizard complete (wizard not rendered)
  if (wizardStep < 1 || wizardStep > 3) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'var(--bg-canvas)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
    }}>
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
