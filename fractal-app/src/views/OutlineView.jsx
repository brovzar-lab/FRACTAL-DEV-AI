import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'

const STATUS_DOT_COLORS = {
  untouched: '#888',
  'in-progress': '#C09A30',
  revised: '#1B4F8A',
  approved: '#2A7D6F',
  flagged: '#B84040',
}

export default function OutlineView() {
  const { screenplay, openSceneDrawer } = useScreenplayStore()
  const [expandedActs, setExpandedActs] = useState({})
  const [expandedSeqs, setExpandedSeqs] = useState({})

  const toggle = (map, setter, id) => setter(s => ({ ...s, [id]: !s[id] }))

  if (!screenplay) return null

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
          Screenplay Outline
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Hierarchical structure view. Click any scene to inspect in the slide-out panel.
        </div>
      </div>

      {screenplay.acts.map((act, ai) => {
        const actExpanded = expandedActs[act.id] !== false // default open
        const actColor = ['#1B4F8A', '#B85C2C', '#2A7D6F', '#7B4F9E', '#C09A30'][ai % 5]
        const totalScenes = act.sequences.reduce((sum, seq) => sum + seq.scenes.length, 0)

        return (
          <div key={act.id} style={{ marginBottom: 2 }}>
            {/* Act row */}
            <div
              onClick={() => toggle(expandedActs, setExpandedActs, act.id)}
              style={{
                display: 'flex', gap: 8, alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background 0.15s',
                borderLeft: `3px solid ${actColor}`,
                background: `${actColor}14`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${actColor}22`}
              onMouseLeave={e => e.currentTarget.style.background = `${actColor}14`}
            >
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: 16, display: 'flex', alignItems: 'center' }}>
                {actExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span style={{ fontFamily: 'var(--font-editorial)', fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>
                {act.label}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                p.{act.pageRange[0]}–{act.pageRange[1]} · {totalScenes} scenes
              </span>
              <DiagBadge status={act.diagnostics?.status} />
            </div>

            {/* Sequences under act */}
            {actExpanded && act.sequences.map((seq) => {
              const seqExpanded = expandedSeqs[seq.id] !== false
              return (
                <div key={seq.id} style={{ marginLeft: 20 }}>
                  <div
                    onClick={() => toggle(expandedSeqs, setExpandedSeqs, seq.id)}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `2px solid ${actColor}60`,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: seqExpanded ? `${actColor}0a` : 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${actColor}14`}
                    onMouseLeave={e => e.currentTarget.style.background = seqExpanded ? `${actColor}0a` : 'transparent'}
                  >
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: 16, display: 'flex', alignItems: 'center' }}>
                      {seqExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, flex: 1 }}>
                      {seq.label}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {seq.scenes.length} sc.
                    </span>
                  </div>

                  {/* Scenes under sequence */}
                  {seqExpanded && seq.scenes.map((sc) => {
                    const statusDot = STATUS_DOT_COLORS[sc.workflowStatus] || '#888'
                    const bmoc = sc.diagnostics

                    return (
                      <div
                        key={sc.id}
                        onClick={() => openSceneDrawer(sc.id)}
                        style={{
                          marginLeft: 24,
                          display: 'flex', gap: 8, alignItems: 'center',
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          borderLeft: `2px solid ${statusDot}`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Status dot */}
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: statusDot, flexShrink: 0,
                        }} />

                        {/* Scene info */}
                        <span style={{
                          fontFamily: 'var(--font-screenplay)', fontSize: '0.75rem', fontWeight: 500,
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {sc.heading}
                        </span>

                        {/* Page range */}
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          p.{sc.pageRange[0]}–{sc.pageRange[1]}
                        </span>

                        {/* BMOC micro-indicators */}
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          {['B','M','O','C'].map((key, ki) => {
                            const ok = [bmoc?.bPresent, bmoc?.mPresent, bmoc?.oPresent, bmoc?.cPresent][ki]
                            return (
                              <div key={key} style={{
                                width: 14, height: 14, borderRadius: 2,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: ok ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
                                fontSize: '0.5rem', fontWeight: 700,
                                color: ok ? 'var(--status-pass)' : 'var(--status-fail)',
                              }}>
                                {key}
                              </div>
                            )
                          })}
                        </div>

                        <DiagBadge status={bmoc?.status} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
