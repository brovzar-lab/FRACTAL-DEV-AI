import { useState, useEffect, useMemo } from 'react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'
import AnalysisLoader from '../components/shared/AnalysisLoader'
import { ZoomIn, AlertCircle } from 'lucide-react'
import { analyzeAct } from '../services/claudeService'

export default function ActView() {
  const { screenplay, activeUnitId, lens, drillInto, cacheAnalysis, analysisCache } = useScreenplayStore()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)

  const act = useMemo(() => screenplay.acts.find(a => a.id === activeUnitId) || screenplay.acts[0], [screenplay, activeUnitId])

  const allScenes = act ? act.sequences.flatMap(s => s.scenes) : []
  const cacheKey = act ? `act-${act.id}-${lens}` : null

  useEffect(() => {
    if (!act || !cacheKey) return
    if (analysisCache[cacheKey]) {
      setAnalysis(analysisCache[cacheKey])
      return
    }
    setLoading(true)
    analyzeAct(act, lens, screenplay)
      .then(result => {
        setAnalysis(result)
        cacheAnalysis(cacheKey, result)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [cacheKey])

  useEffect(() => {
    if (analysis) {
      useScreenplayStore.getState().setPanelTab('diagnosis')
      window._fractalPanelData = { type: 'act', data: analysis, unit: act }
    }
  }, [analysis])

  if (!act) return null

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Act header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="zoom-badge zoom-badge-1" style={{ marginBottom: 8 }}>Act</div>
          <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.4rem', fontWeight: 600, marginBottom: 4 }}>
            {act.label}
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Pages {act.pageRange[0]}–{act.pageRange[1]} · {allScenes.length} scenes · {act.sequences.length} sequences
          </div>
        </div>
        <DiagBadge status={act.diagnostics?.status} size="lg" />
      </div>

      {/* Diagnostic note */}
      {act.diagnostics?.note && (
        <div style={{
          padding: '12px 14px',
          background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          display: 'flex', gap: 8, alignItems: 'flex-start'
        }}>
          <AlertCircle size={14} style={{ color: 'var(--accent-warm)', flexShrink: 0, marginTop: 1 }} />
          {act.diagnostics.note}
        </div>
      )}

      {/* AI Analysis */}
      {loading && <AnalysisLoader text="Analyzing act structure…" />}
      {analysis && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Structural Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 600, color: scoreColor(analysis.structuralScore) }}>
                {analysis.structuralScore}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/10</span>
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Arc Position
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {analysis.arcPosition}
            </div>
          </div>
        </div>
      )}

      {/* Sequence map */}
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Sequence Map — click to zoom in
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {act.sequences.map((seq, si) => (
            <div
              key={seq.id}
              className="card"
              style={{
                padding: 0, overflow: 'hidden', cursor: 'pointer',
                transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-raised)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              {/* Sequence header */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-surface-2)',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{seq.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{seq.thematicFunction}</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); drillInto('sequence', seq.id) }}
                  style={{ gap: 4 }}
                >
                  <ZoomIn size={12} />
                  Open
                </button>
              </div>

              {/* Scene mini-row */}
              <div style={{ padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {seq.scenes.map(sc => (
                  <button
                    key={sc.id}
                    onClick={(e) => { e.stopPropagation(); drillInto('scene', sc.id) }}
                    style={{
                      padding: '5px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      borderLeftWidth: 3,
                      borderLeftColor: {pass:'#2A7D6F',warn:'#C09A30',fail:'#B84040'}[sc.diagnostics?.status] || '#999',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                  >
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                      {sc.heading}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      p.{sc.pageRange[0]}–{sc.pageRange[1]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function scoreColor(score) {
  if (score >= 8) return 'var(--status-pass)'
  if (score >= 6) return 'var(--accent-gold)'
  return 'var(--status-fail)'
}
