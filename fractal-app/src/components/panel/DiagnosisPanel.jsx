import useScreenplayStore from '../../store/screenplayStore'
import { Brain, Sparkles } from 'lucide-react'

const LENS_LABELS = {
  'story-grid': 'Story Grid',
  'weiland': 'Weiland Arc',
  'save-cat': 'Save the Cat',
  'bmoc': 'BMOC',
  'lyons': 'Lyons',
}

const LENS_COLORS = {
  'story-grid': '#1B4F8A',
  'weiland': '#7B4F9E',
  'save-cat': '#2A7D6F',
  'bmoc': '#C09A30',
  'lyons': '#B84040',
}

export default function DiagnosisPanel() {
  const { zoom, activeUnitId, screenplay, analysisCache, lens } = useScreenplayStore()

  // Try to find relevant cached analysis
  let cacheKey = null
  if (zoom === 1 && activeUnitId) {
    cacheKey = `act-${activeUnitId}-${lens}`
  } else if (zoom === 2 && activeUnitId) {
    cacheKey = `seq-${activeUnitId}-${lens}`
  } else if (zoom >= 3 && activeUnitId) {
    cacheKey = `scene-${activeUnitId}-${lens}`
  }

  const analysis = cacheKey ? analysisCache[cacheKey] : null

  if (!analysis) {
    return (
      <div className="scroll-y" style={{ flex: 1, padding: 16 }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: 200, gap: 12, color: 'var(--text-muted)', textAlign: 'center'
        }}>
          <Brain size={28} strokeWidth={1.5} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: '0.8rem' }}>
            Click into any structural unit to see AI analysis
          </div>
        </div>
      </div>
    )
  }

  const lensColor = LENS_COLORS[lens] || LENS_COLORS['story-grid']
  const lensLabel = LENS_LABELS[lens] || lens

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Lens indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px',
        background: `${lensColor}12`,
        border: `1px solid ${lensColor}30`,
        borderRadius: 'var(--radius-md)',
      }}>
        <Sparkles size={12} style={{ color: lensColor }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', color: lensColor }}>
          {lensLabel} Lens
        </span>
        {!import.meta.env.VITE_CLAUDE_PROXY_URL && (
          <span style={{ marginLeft: 'auto', fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-surface-2)', padding: '1px 5px', borderRadius: 3 }}>
            DEMO
          </span>
        )}
      </div>

      {/* Lens-specific notes */}
      {analysis.lensNotes && (
        <div style={{
          fontSize: '0.75rem', color: lensColor, fontWeight: 500,
          padding: '6px 10px', background: `${lensColor}08`,
          borderRadius: 'var(--radius-sm)', borderLeft: `2px solid ${lensColor}`,
        }}>
          {analysis.lensNotes}
        </div>
      )}

      {/* Summary */}
      {analysis.summary && (
        <Section title="Summary">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
            {analysis.summary}
          </p>
        </Section>
      )}

      {/* Arc / Position */}
      {analysis.arcPosition && (
        <Section title={lens === 'save-cat' ? 'Beat Sheet Position' : lens === 'weiland' ? 'Arc Position' : 'Structural Position'}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {analysis.arcPosition}
          </p>
        </Section>
      )}

      {/* Weiland: Arc tracking */}
      {analysis.arcTracking && (
        <Section title="Arc Tracking" color={lensColor}>
          {Object.entries(analysis.arcTracking).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: val ? '#1D5B50' : '#B84040' }}>
                {val ? '✓' : '✗'}
              </span>
            </div>
          ))}
          {analysis.arcNote && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 6 }}>
              {analysis.arcNote}
            </p>
          )}
        </Section>
      )}

      {/* Story Grid: Five Commandments */}
      {analysis.fiveCommandments && (
        <Section title="Five Commandments" color={lensColor}>
          {Object.entries(analysis.fiveCommandments).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: val.present ? '#1D5B50' : '#B84040' }}>
                  {val.present ? 'PRESENT' : 'MISSING'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: 8 }}>{val.note}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Save the Cat: Beat position */}
      {analysis.beatSheetPosition && (
        <Section title="Beat Sheet" color={lensColor}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: lensColor, marginBottom: 4 }}>
            {analysis.beatSheetPosition}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {analysis.expectedBeat}
          </p>
          {analysis.bStoryNote && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 6 }}>
              B-Story: {analysis.bStoryNote}
            </p>
          )}
        </Section>
      )}

      {/* BMOC: Suspense tools */}
      {analysis.suspenseTools && (
        <Section title="Suspense Tools" color={lensColor}>
          {Object.entries(analysis.suspenseTools).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: val ? '#1D5B50' : 'var(--text-muted)' }}>
                {val ? 'ACTIVE' : '—'}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Lyons: Moral component */}
      {analysis.moralComponent && (
        <Section title="Moral Component" color={lensColor}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem' }}>False Belief</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: analysis.moralComponent.falseBeliefActive ? '#1D5B50' : '#B84040' }}>
              {analysis.moralComponent.falseBeliefActive ? 'ACTIVE' : 'UNCLEAR'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem' }}>Immoral Effect</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: analysis.moralComponent.immoralEffectVisible ? '#1D5B50' : '#B84040' }}>
              {analysis.moralComponent.immoralEffectVisible ? 'VISIBLE' : 'NOT SHOWN'}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 4 }}>
            {analysis.moralComponent.consequence}
          </p>
          {analysis.narrativeEngine && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>
              {analysis.narrativeEngine}
            </p>
          )}
        </Section>
      )}

      {/* Strengths */}
      {analysis.keyStrengths?.length > 0 && (
        <Section title="Strengths" color="#1D5B50">
          {analysis.keyStrengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
              <span style={{ color: '#1D5B50', flexShrink: 0, marginTop: 2 }}>+</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{s}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Critical issues */}
      {analysis.criticalIssues?.length > 0 && (
        <Section title="Issues" color="var(--accent-warm)">
          {analysis.criticalIssues.map((issue, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
              <span style={{ color: 'var(--accent-warm)', flexShrink: 0, marginTop: 2 }}>!</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{issue}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <Section title="Fixes">
          {analysis.recommendations.map((rec, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }}>→</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{rec}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.65rem', padding: '2px 6px', marginTop: 3, display: 'block', color: 'var(--accent-primary)' }}
                  onClick={() => {
                    useScreenplayStore.getState().addTask({
                      priority: 'P2', status: 'open',
                      level: zoom === 1 ? 'act' : zoom === 2 ? 'sequence' : 'scene',
                      linkedId: activeUnitId,
                      title: rec.slice(0, 60),
                      description: rec
                    })
                    useScreenplayStore.getState().setPanelTab('tasks')
                  }}
                >
                  + Add to tasks
                </button>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Obligatory check */}
      {analysis.obligatoryCheck && (
        <Section title={lens === 'weiland' ? 'Arc Elements' : lens === 'save-cat' ? 'Beat Sheet Elements' : 'Obligatory Scenes'}>
          {analysis.obligatoryCheck.present?.map(s => (
            <div key={s} style={{ fontSize: '0.75rem', color: '#1D5B50', marginBottom: 2 }}>✓ {s}</div>
          ))}
          {analysis.obligatoryCheck.missing?.map(s => (
            <div key={s} style={{ fontSize: '0.75rem', color: 'var(--status-fail)', marginBottom: 2 }}>✗ {s} (missing)</div>
          ))}
          {analysis.obligatoryCheck.misplaced?.map(s => (
            <div key={s} style={{ fontSize: '0.75rem', color: '#8A6E1F', marginBottom: 2 }}>⚠ {s}</div>
          ))}
        </Section>
      )}

      {/* Top fix */}
      {analysis.topFix && (
        <div style={{
          padding: 10, background: `${lensColor}08`,
          borderRadius: 'var(--radius-md)', border: `1px solid ${lensColor}20`,
          borderLeft: `3px solid ${lensColor}`,
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: lensColor, marginBottom: 4 }}>
            Top Fix
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {analysis.topFix}
          </p>
        </div>
      )}

      {/* Next steps */}
      {analysis.nextSteps && (
        <div style={{
          padding: 12, background: 'rgba(27,79,138,0.07)',
          borderRadius: 'var(--radius-md)', border: '1px solid rgba(27,79,138,0.15)'
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: 5 }}>
            Focus Next
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
            {analysis.nextSteps}
          </p>
        </div>
      )}
    </div>
  )
}

function Section({ title, children, color }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: color || 'var(--text-muted)', marginBottom: 7, borderBottom: '1px solid var(--border-default)', paddingBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
