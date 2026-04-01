import { useState } from 'react'
import useUIStore, { LENSES } from '../../store/uiStore'
import useScreenplayStore from '../../store/screenplayStore'

// One-line descriptions for each lens
const LENS_DESCRIPTIONS = {
  'story-grid': 'Five Commandments at every level — value shifts, genre obligatory scenes',
  'weiland':    'Character arc: Ghost / Lie / Want / Need, arc percentage targets',
  'save-cat':   'Blake Snyder 15-beat structure — catalyst, midpoint, all is lost',
  'bmoc':       'Beginning / Middle / Obstacle / Climax at act, sequence, and scene level',
  'lyons':      'Moral Component — false belief, immoral effect, story vs. situation test',
}

export default function MethodologyStep() {
  const setWizardStep = useUIStore(s => s.setWizardStep)
  const setLens = useUIStore(s => s.setLens)
  const setMethodology = useScreenplayStore(s => s.setMethodology)
  const currentLens = useUIStore(s => s.lens)

  const [selected, setSelected] = useState(currentLens || 'story-grid')

  const handleContinue = () => {
    setLens(selected)         // update the active lens in uiStore
    setMethodology(selected)  // persist to screenplay.methodology in Firestore
    setWizardStep(3)          // advance to Analyzing step
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
        Choose your methodology
      </h2>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>
        The AI will analyze your script through this lens throughout the project.
      </p>

      {/* Lens list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {LENSES.map(lens => (
          <button
            key={lens.id}
            onClick={() => setSelected(lens.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              background: selected === lens.id ? 'rgba(27,79,138,0.08)' : 'var(--bg-surface)',
              border: selected === lens.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              boxShadow: 'var(--shadow-card)',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Selection indicator */}
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              border: selected === lens.id ? '5px solid var(--accent-primary)' : '2px solid var(--border-strong)',
              transition: 'all 0.15s ease',
            }} />
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                {lens.label}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {LENS_DESCRIPTIONS[lens.id]}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleContinue} style={{ fontSize: '0.9375rem', padding: '10px 32px' }}>
          Analyze with {LENSES.find(l => l.id === selected)?.label} →
        </button>
      </div>
    </div>
  )
}
