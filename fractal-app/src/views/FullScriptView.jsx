import { useState } from 'react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'
import CharacterMap from '../components/analysis/CharacterMap'
import { ZoomIn, Download, FileText, Copy, Check, Users, Activity, AlertTriangle } from 'lucide-react'
import { exportToFountain, exportToText, copyToClipboard, downloadFile } from '../services/exporter'

const ACT_COLORS = [
  { bg: 'rgba(27,79,138,0.08)', border: '#1B4F8A', text: '#1B4F8A' },
  { bg: 'rgba(184,92,44,0.08)', border: '#B85C2C', text: '#B85C2C' },
  { bg: 'rgba(42,125,111,0.08)', border: '#2A7D6F', text: '#2A7D6F' },
  { bg: 'rgba(123,79,158,0.08)', border: '#7B4F9E', text: '#7B4F9E' },
  { bg: 'rgba(192,154,48,0.08)', border: '#C09A30', text: '#C09A30' },
]

const STATUS_COLORS = {
  pass: { bg: '#2A7D6F', opacity: 1.0 },
  warn: { bg: '#C09A30', opacity: 1.0 },
  fail: { bg: '#B84040', opacity: 1.0 },
}

export default function FullScriptView() {
  const { screenplay, drillInto, lens } = useScreenplayStore()
  const [copied, setCopied] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const acts = screenplay.acts
  const allScenes = acts.flatMap(a => a.sequences.flatMap(s => s.scenes))
  const totalPages = screenplay.pageCount

  const handleExportFountain = () => {
    const content = exportToFountain(screenplay)
    downloadFile(content, `${screenplay.title}.fountain`, 'text/plain')
    setShowExport(false)
  }

  const handleExportText = () => {
    const content = exportToText(screenplay)
    downloadFile(content, `${screenplay.title}.txt`, 'text/plain')
    setShowExport(false)
  }

  const handleCopyAll = async () => {
    const content = exportToText(screenplay)
    await copyToClipboard(content)
    setCopied(true)
    setShowExport(false)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Script overview header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.5rem', fontWeight: 600, marginBottom: 4 }}>
            {screenplay.title}
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{screenplay.genre}</span>
            <span style={{ color: 'var(--border-strong)', fontSize: '0.7rem' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{screenplay.pageCount} pages</span>
            <span style={{ color: 'var(--border-strong)', fontSize: '0.7rem' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{allScenes.length} scenes</span>
            <span style={{ color: 'var(--border-strong)', fontSize: '0.7rem' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{acts.length} acts</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowExport(!showExport)}
              style={{ gap: 4 }}
            >
              {copied ? <Check size={12} style={{ color: 'var(--status-pass)' }} /> : <Download size={12} />}
              {copied ? 'Copied' : 'Export'}
            </button>
            {showExport && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-raised)',
                minWidth: 160, zIndex: 100, overflow: 'hidden'
              }}>
                <button
                  onClick={handleExportFountain}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', color: 'var(--text-primary)', textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <FileText size={14} style={{ color: 'var(--accent-primary)' }} /> Fountain (.fountain)
                </button>
                <button
                  onClick={handleExportText}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', color: 'var(--text-primary)', textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Download size={14} style={{ color: 'var(--text-muted)' }} /> Plain Text (.txt)
                </button>
                <div style={{ height: 1, background: 'var(--border-default)' }} />
                <button
                  onClick={handleCopyAll}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', color: 'var(--text-primary)', textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Copy size={14} style={{ color: 'var(--text-muted)' }} /> Copy to Clipboard
                </button>
              </div>
            )}
          </div>
          <div className="zoom-badge zoom-badge-0">Full Script</div>
        </div>
      </div>

      {/* Scene timeline bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Scene Timeline — click any scene to drill in
        </div>
        <div style={{
          display: 'flex',
          height: 32,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          gap: 1,
          background: 'var(--bg-surface-2)'
        }}>
          {acts.map((act, ai) => {
            const actColor = ACT_COLORS[ai % ACT_COLORS.length]
            const actScenes = act.sequences.flatMap(s => s.scenes)
            const actWidth = ((act.pageRange[1] - act.pageRange[0]) / totalPages) * 100
            return (
              <div key={act.id} style={{ width: `${actWidth}%`, display: 'flex', background: actColor.bg }}>
                {actScenes.map(sc => {
                  const scWidth = ((sc.pageRange[1] - sc.pageRange[0]) / totalPages) * 100
                  const statC = STATUS_COLORS[sc.diagnostics?.status] || STATUS_COLORS.pass
                  return (
                    <div
                      key={sc.id}
                      title={`${sc.heading} — p.${sc.pageRange[0]}–${sc.pageRange[1]}`}
                      onClick={() => drillInto('scene', sc.id)}
                      style={{
                        flex: Math.max(scWidth, 0.8),
                        background: statC.bg,
                        opacity: 0.7,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s',
                        borderRight: '1px solid rgba(0,0,0,0.15)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>p.1</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>p.{totalPages}</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: -8, marginBottom: 4 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Structural health:</span>
        {[['pass','Solid'],['warn','Needs attention'],['fail','Critical issue']].map(([s,l]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[s].bg }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Act cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {acts.map((act, ai) => {
          const actColor = ACT_COLORS[ai % ACT_COLORS.length]
          const actScenes = act.sequences.flatMap(s => s.scenes)
          return (
            <div
              key={act.id}
              className="card"
              style={{
                overflow: 'hidden',
                '--accent-color': actColor.border,
                borderLeftWidth: 3,
                borderLeftColor: actColor.border
              }}
            >
              {/* Act header */}
              <div style={{
                padding: '12px 16px',
                background: actColor.bg,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h2 style={{
                      fontFamily: 'var(--font-editorial)',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: actColor.text
                    }}>
                      {act.label}
                    </h2>
                    <DiagBadge status={act.diagnostics?.status} />
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    Pages {act.pageRange[0]}–{act.pageRange[1]} · {actScenes.length} scenes · {act.sequences.length} sequences
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => drillInto('act', act.id)}
                  style={{ gap: 4, color: actColor.text }}
                >
                  <ZoomIn size={12} />
                  Zoom In
                </button>
              </div>

              {/* Diagnostic note */}
              {act.diagnostics?.note && (
                <div style={{
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-default)',
                  fontStyle: 'italic'
                }}>
                  {act.diagnostics.note}
                </div>
              )}

              {/* Sequences + scenes mini-grid */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {act.sequences.map(seq => (
                  <div key={seq.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, paddingLeft: 2 }}>
                      {seq.label}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {seq.scenes.map(sc => (
                        <button
                          key={sc.id}
                          className="notecard"
                          style={{
                            '--accent-color': STATUS_COLORS[sc.diagnostics?.status]?.bg || '#999',
                            padding: '6px 10px',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            minWidth: 160, maxWidth: 220,
                            transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-md)',
                          }}
                          onClick={() => drillInto('scene', sc.id)}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-raised)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                        >
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sc.heading}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            p.{sc.pageRange[0]}–{sc.pageRange[1]}
                          </div>
                          {sc.diagnostics?.notes && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--accent-warm)', marginTop: 3, lineClamp: 2 }}>
                              ⚠ {sc.diagnostics.notes.slice(0,60)}…
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Story Health Dashboard */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Activity size={14} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Story Health
          </span>
        </div>
        <div style={{ padding: 16 }}>
          {/* Scene health heatmap */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 16 }}>
            {allScenes.map((sc, i) => {
              const status = sc.diagnostics?.status || 'pass'
              const bgColor = status === 'pass' ? '#2A7D6F' : status === 'warn' ? '#C09A30' : '#B84040'
              return (
                <div
                  key={sc.id}
                  title={`${sc.heading} — ${status.toUpperCase()}`}
                  onClick={() => drillInto('scene', sc.id)}
                  style={{
                    width: 16, height: 16, borderRadius: 2,
                    background: bgColor,
                    opacity: 0.8,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = '' }}
                />
              )
            })}
          </div>

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {[
              { label: 'Solid', count: allScenes.filter(s => s.diagnostics?.status === 'pass').length, color: '#2A7D6F' },
              { label: 'Attention', count: allScenes.filter(s => s.diagnostics?.status === 'warn').length, color: '#C09A30' },
              { label: 'Critical', count: allScenes.filter(s => s.diagnostics?.status === 'fail').length, color: '#B84040' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stat.color }}>{stat.count}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-default)', paddingLeft: 16 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {allScenes.length > 0 ? Math.round((allScenes.filter(s => s.diagnostics?.status === 'pass').length / allScenes.length) * 100) : 0}%
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Structural Score</div>
            </div>
          </div>

          {/* Top issues */}
          {(() => {
            const issues = allScenes
              .filter(s => s.diagnostics?.status === 'fail' || s.diagnostics?.status === 'warn')
              .slice(0, 3)
            if (issues.length === 0) return null
            return (
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Top Issues
                </div>
                {issues.map(sc => (
                  <div key={sc.id}
                    onClick={() => drillInto('scene', sc.id)}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0',
                      cursor: 'pointer', borderBottom: '1px solid var(--border-default)',
                    }}
                  >
                    <AlertTriangle size={12} style={{ color: sc.diagnostics?.status === 'fail' ? '#B84040' : '#C09A30', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>{sc.heading}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sc.diagnostics?.notes || 'Structural issue detected'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Character Tracker */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Users size={14} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Characters
          </span>
        </div>
        <div style={{ padding: 12 }}>
          <CharacterMap />
        </div>
      </div>
    </div>
  )
}
