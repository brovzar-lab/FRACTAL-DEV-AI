import { useState } from 'react'
import useScreenplayStore from '../store/screenplayStore'
import useAnalysisStore from '../store/analysisStore'
import useUIStore, { LENSES } from '../store/uiStore'
import { generateFullSnapshot } from '../services/claudeService'

// Maps category id → display label
const CATEGORY_LABELS = {
  structure: 'Structure',
  character: 'Character',
  premise:   'Premise',
  pacing:    'Pacing',
  dialogue:  'Dialogue',
}

// Maps status → accent color CSS variable
const STATUS_COLOR = {
  pass: 'var(--status-pass)',
  warn: 'var(--status-warn)',
  fail: 'var(--status-fail)',
}

export default function SnapshotView() {
  const screenplay = useScreenplayStore(s => s.screenplay)
  const snapshotCache = useAnalysisStore(s => s.snapshotCache)
  const snapshotStale = useAnalysisStore(s => s.snapshotStale)
  const drillInto = useScreenplayStore(s => s.drillInto)
  const currentLens = useUIStore(s => s.lens)
  const [reanalyzing, setReanalyzing] = useState(false)
  const saveSnapshot = useScreenplayStore(s => s.saveSnapshot)
  const setSnapshot = useAnalysisStore(s => s.setSnapshot)

  // Fallback to screenplay.snapshot if in-memory cache is empty (e.g., page reload)
  const snapshot = snapshotCache || screenplay?.snapshot

  const handleReanalyze = async () => {
    if (reanalyzing || !screenplay) return
    setReanalyzing(true)
    try {
      const methodology = screenplay.methodology || 'story-grid'
      const fresh = await generateFullSnapshot(screenplay, methodology)
      setSnapshot(fresh)
      saveSnapshot(fresh)
    } catch (err) {
      console.error('[SnapshotView] Re-analyze failed:', err)
    } finally {
      setReanalyzing(false)
    }
  }

  if (!snapshot) return null

  const lensLabel = LENSES.find(l => l.id === currentLens)?.label || currentLens
  const actCount = screenplay?.acts?.length ?? 0
  const seqCount = screenplay?.acts?.flatMap(a => a.sequences ?? []).length ?? 0
  const sceneCount = screenplay?.acts?.flatMap(a => a.sequences?.flatMap(s => s.scenes ?? []) ?? []).length ?? 0
  const pageCount = screenplay?.pageCount ?? 0

  // Format the analyzed timestamp
  const analyzedAt = screenplay?.snapshotGeneratedAt
    ? new Date(screenplay.snapshotGeneratedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'just now'

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Script Snapshot
          </h2>
          {/* NEW badge — only show if not stale */}
          {!snapshotStale && (
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 700,
              padding: '2px 7px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              New
            </span>
          )}
          {/* STALE banner with re-analyze button */}
          {snapshotStale && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--status-warn-bg)',
                color: 'var(--status-warn)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                Stale
              </span>
              <button
                className="btn btn-sm"
                onClick={handleReanalyze}
                disabled={reanalyzing}
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--text-on-accent)',
                  borderColor: 'var(--accent-primary)',
                  padding: '2px 10px',
                  fontSize: '0.6875rem',
                }}
              >
                {reanalyzing ? 'Analyzing…' : 'Re-analyze'}
              </button>
            </div>
          )}
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {lensLabel} · {pageCount} pages · {actCount} acts · {seqCount} sequences · {sceneCount} scenes · Analyzed {analyzedAt}
        </p>
      </div>

      {/* Dashboard cards — 3 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '14px',
      }}>
        {(snapshot.categories || []).map((cat, i) => {
          // Last category spans 2 columns if there are 5 total (fills the last 2 columns of the final row)
          const isLast = i === (snapshot.categories.length - 1) && snapshot.categories.length === 5
          return (
            <div
              key={cat.id}
              className="notecard"
              style={{
                '--accent-color': STATUS_COLOR[cat.status] || 'var(--accent-primary)',
                padding: '12px 14px',
                gridColumn: isLast ? 'span 2' : undefined,
                cursor: 'default',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: STATUS_COLOR[cat.status] || 'var(--accent-primary)',
                marginBottom: '5px',
              }}>
                {CATEGORY_LABELS[cat.id] || cat.id}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {cat.summary}
              </div>
            </div>
          )
        })}
      </div>

      {/* Priority list */}
      {snapshot.priorities?.length > 0 && (
        <div className="notecard" style={{ padding: '12px 14px', marginBottom: '14px' }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: '10px',
          }}>
            Top Priorities
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {snapshot.priorities.map((p, i) => {
              const color = p.severity === 'fail' ? 'var(--status-fail)'
                          : p.severity === 'warn' ? 'var(--status-warn)'
                          : 'var(--text-muted)'
              const isLast = i === snapshot.priorities.length - 1
              return (
                <div
                  key={p.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '7px 0',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-default)',
                    cursor: p.unitId ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (p.unitId && p.unitType) {
                      drillInto(p.unitType, p.unitId)
                    }
                  }}
                >
                  {/* Rank number using editorial font */}
                  <span style={{
                    fontFamily: 'var(--font-editorial)', fontSize: '1.0625rem', fontWeight: 600,
                    color, lineHeight: 1, flexShrink: 0, minWidth: '18px',
                  }}>
                    {p.rank}
                  </span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {p.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.detail}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Script health map */}
      {snapshot.healthMap?.length > 0 && (
        <div className="notecard" style={{ padding: '12px 14px', marginBottom: '14px' }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: '8px',
          }}>
            Script Health Map
          </div>
          <HealthMap healthMap={snapshot.healthMap} screenplay={screenplay} />
        </div>
      )}

      {/* AI Guide opening message banner */}
      {snapshot.openingMessage && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderLeft: '3px solid var(--accent-primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          padding: '12px 14px',
        }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--accent-primary)', marginBottom: '6px',
          }}>
            AI Guide
          </div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {snapshot.openingMessage}
          </p>
        </div>
      )}
    </div>
  )
}

// HealthMap sub-component
function HealthMap({ healthMap, screenplay }) {
  // Build a lookup from sequenceId → act label for the axis labels
  const seqToAct = {}
  const actRanges = []   // [{label, startIdx, endIdx}]
  let idx = 0

  for (const act of (screenplay?.acts || [])) {
    const startIdx = idx
    for (const seq of (act.sequences || [])) {
      seqToAct[seq.id] = act.label
      idx++
    }
    if (idx > startIdx) {
      actRanges.push({ label: act.label.split(' — ')[0], startIdx, endIdx: idx - 1 })
    }
  }

  const STATUS_BAR_COLOR = {
    pass: 'var(--status-pass)',
    warn: 'var(--status-warn)',
    fail: 'var(--status-fail)',
  }

  return (
    <div>
      {/* Color bars */}
      <div style={{ display: 'flex', gap: '3px', height: '22px', alignItems: 'flex-end', marginBottom: '4px' }}>
        {healthMap.map((entry) => (
          <div
            key={entry.sequenceId}
            style={{
              flex: 1,
              height: '100%',
              borderRadius: '2px 2px 0 0',
              background: STATUS_BAR_COLOR[entry.status] || 'var(--border-default)',
            }}
          />
        ))}
      </div>

      {/* Act labels below bars */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        {actRanges.map(range => (
          <span key={range.label} style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.6875rem', color: 'var(--text-muted)',
          }}>
            {range.label}
          </span>
        ))}
      </div>
    </div>
  )
}
