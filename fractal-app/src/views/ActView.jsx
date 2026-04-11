import { useState, useEffect, useMemo } from 'react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'
import AnalysisLoader from '../components/shared/AnalysisLoader'
import { ZoomIn, AlertCircle } from 'lucide-react'
import { analyzeAct } from '../services/claudeService'
import { getCardStyle } from '../utils/indexCardUtils'

export default function ActView() {
  const { screenplay, activeUnitId, lens, drillInto, cacheAnalysis, analysisCache } = useScreenplayStore()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  const act = useMemo(() => screenplay.acts.find(a => a.id === activeUnitId) || screenplay.acts[0], [screenplay, activeUnitId])

  const allScenes = act ? act.sequences.flatMap(s => s.scenes) : []
  const cacheKey = act ? `act-${act.id}-${lens}` : null

  // Read from cache before the effect to avoid calling setState synchronously inside useEffect
  const cachedAnalysis = cacheKey ? analysisCache[cacheKey] ?? null : null

  useEffect(() => {
    if (!act || !cacheKey || cachedAnalysis) return
    const controller = new AbortController()
    setLoading(true)
    setAnalysisError(null)
    analyzeAct(act, lens, screenplay)
      .then(result => {
        if (controller.signal.aborted) return
        setAnalysis(result)
        cacheAnalysis(cacheKey, result)
      })
      .catch(err => {
        if (controller.signal.aborted) return
        console.error('[ActView] Analysis failed:', err)
        setAnalysisError(err.message || 'Analysis failed. Please try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [cacheKey])

  // Sync from cache to local state (safe — not inside effect body)
  const displayAnalysis = cachedAnalysis ?? analysis

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
      {analysisError && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-fail-bg)',
          border: '1px solid rgba(184,64,64,0.3)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--status-fail)',
        }}>
          ⚠ {analysisError}
        </div>
      )}
      {displayAnalysis && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Structural Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 600, color: scoreColor(displayAnalysis.structuralScore) }}>
                {displayAnalysis.structuralScore}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/10</span>
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Arc Position
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {displayAnalysis.arcPosition}
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
          {act.sequences.map((seq) => (
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
              <div className="card-grid-surface" style={{ padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {seq.scenes.map(sc => {
                  const cardStyle = getCardStyle(sc.id)
                  return (
                    <button
                      key={sc.id}
                      className="index-card"
                      onClick={(e) => { e.stopPropagation(); drillInto('scene', sc.id) }}
                      style={{
                        ...cardStyle,
                        borderLeft: `3px solid ${{pass:'#2A7D6F',warn:'#C09A30',fail:'#B84040'}[sc.diagnostics?.status] || '#999'}`,
                        textAlign: 'left',
                        minWidth: 130, maxWidth: 160,
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', color: '#1A1814' }}>
                        {sc.heading}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: '#635B52', marginTop: 1 }}>
                        p.{sc.pageRange[0]}–{sc.pageRange[1]}
                      </div>
                    </button>
                  )
                })}
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
