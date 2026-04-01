import { useEffect, useRef, useState } from 'react'
import useUIStore from '../../store/uiStore'
import useScreenplayStore from '../../store/screenplayStore'
import useAnalysisStore from '../../store/analysisStore'
import { generateFullSnapshot } from '../../services/claudeService'

// The 5 progress phases shown during analysis
const PHASES = [
  'Analyzing premise + theme\u2026',
  'Mapping structure\u2026',
  'Analyzing character arcs\u2026',
  'Dialogue + craft\u2026',
  'Prioritizing issues\u2026',
]

export default function AnalyzingStep() {
  const setWizardStep = useUIStore(s => s.setWizardStep)
  const screenplay = useScreenplayStore(s => s.screenplay)
  const saveSnapshot = useScreenplayStore(s => s.saveSnapshot)
  const setSnapshot = useAnalysisStore(s => s.setSnapshot)

  const tickerRef = useRef(null)

  const [phase, setPhase] = useState(0)     // current phase index (0-4)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!screenplay) return

    let cancelled = false
    const abortRef = { current: false }

    async function run() {
      try {
        // Advance through visual phases every ~3s while the real call runs in parallel.
        // The phase ticker is cosmetic — it shows progress even though we have one API call.
        let tick = 0
        tickerRef.current = setInterval(() => {
          if (abortRef.current) return
          tick++
          if (tick < PHASES.length) setPhase(tick)
        }, 3000)

        const methodology = screenplay.methodology || 'story-grid'
        const snapshot = await generateFullSnapshot(screenplay, methodology)

        clearInterval(tickerRef.current)
        if (cancelled) return

        setPhase(PHASES.length - 1) // show all phases as complete
        setDone(true)

        // Save to both stores
        setSnapshot(snapshot)   // in-memory analysisStore cache
        saveSnapshot(snapshot)  // persists to screenplay.snapshot → Firestore

        // Advance wizard — use a ref-safe timeout that won't be blocked by re-render cleanup
        setTimeout(() => setWizardStep(4), 800)

      } catch (err) {
        if (cancelled) return
        console.error('[AnalyzingStep] Snapshot failed:', err)
        setError(err.message || 'Analysis failed. Please try again.')
      }
    }

    run()
    return () => {
      cancelled = true
      abortRef.current = true
      clearInterval(tickerRef.current)
    }
  }, [retryCount, screenplay]) // re-run when retryCount changes (retry support)

  // Error state
  if (error) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--status-fail)', marginBottom: '16px' }}>
          {error}
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => { setError(null); setPhase(0); setDone(false); setRetryCount(c => c + 1) }}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
        Analyzing your script
      </h2>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>
        {done ? 'Analysis complete.' : 'This takes about 30\u201360 seconds for a feature-length script.'}
      </p>

      {/* Phase checklist */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {PHASES.map((label, i) => {
          const isComplete = done || i < phase
          const isActive = !done && i === phase
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Status dot */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: isComplete
                  ? 'var(--status-pass)'
                  : isActive
                  ? 'var(--accent-primary)'
                  : 'var(--border-default)',
                transition: 'background 0.3s ease',
              }} />
              <span style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.875rem',
                color: isComplete
                  ? 'var(--status-pass)'
                  : isActive
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
                transition: 'color 0.3s ease',
              }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
