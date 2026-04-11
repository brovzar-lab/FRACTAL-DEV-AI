import { ChevronRight, ChevronDown, Film, Layers, FileText } from 'lucide-react'
import { useState } from 'react'
import useScreenplayStore from '../../store/screenplayStore'

const STATUS_DOT = {
  pass: '#2A7D6F',
  warn: '#C09A30',
  fail: '#B84040',
}

export default function ScriptTree() {
  const { screenplay, zoom, activeUnitId } = useScreenplayStore()
  const [expanded, setExpanded] = useState({ acts: {}, sequences: {} })

  if (!screenplay) return (
    <div style={{ padding: 20, color: '#A8A49C', fontSize: '0.8rem', textAlign: 'center', marginTop: 40 }}>
      Upload a screenplay to begin
    </div>
  )

  const toggle = (type, id) => {
    setExpanded(prev => ({
      ...prev,
      [type]: { ...prev[type], [id]: !prev[type][id] }
    }))
  }

  /* ── Sidebar uses dark bg (#2C2C2E) with NO card overlays ── */
  return (
    <div className="scroll-y" style={{ flex: 1, paddingBottom: 16 }}>
      {/* Script header */}
      <div style={{ padding: '14px 12px 8px' }}>
        <div className="sidebar-section-label">
          Script
        </div>
        <button
          className={`sidebar-item ${zoom === 0 && !activeUnitId ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'space-between' }}
          onClick={() => { useScreenplayStore.getState().drillOut(0) }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
            <Film size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {screenplay.title}
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: '#A8A49C', flexShrink: 0 }}>{screenplay.pageCount}p</span>
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--border-sidebar)', margin: '4px 0' }} />

      {/* Acts */}
      <div style={{ padding: '8px 0' }}>
        <div className="sidebar-section-label" style={{ padding: '0 12px' }}>
          Structure
        </div>

        {screenplay.acts.map((act, ai) => {
          const isActOpen = expanded.acts[act.id] ?? (ai === 0)
          return (
            <div key={act.id}>
              {/* Act row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px' }}>
                <button
                  className="sidebar-chevron"
                  onClick={() => toggle('acts', act.id)}
                >
                  {isActOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
                <button
                  className={`sidebar-item ${activeUnitId === act.id ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'space-between', gap: 4, minWidth: 0 }}
                  onClick={() => { useScreenplayStore.getState().goToUnit('act', act.id); toggle('acts', act.id) }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[act.diagnostics?.status] || '#666', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.775rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.label}
                    </span>
                  </div>
                  <span className="sidebar-meta">{act.pageRange[0]}</span>
                </button>
              </div>

              {/* Sequences */}
              {isActOpen && act.sequences.map(seq => {
                const isSeqOpen = expanded.sequences[seq.id]
                return (
                  <div key={seq.id} style={{ marginLeft: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px' }}>
                      <button
                        className="sidebar-chevron"
                        onClick={() => toggle('sequences', seq.id)}
                      >
                        {isSeqOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      </button>
                      <button
                        className={`sidebar-item ${activeUnitId === seq.id ? 'active' : ''}`}
                        style={{ flex: 1, gap: 4, fontSize: '0.74rem', minWidth: 0 }}
                        onClick={() => { useScreenplayStore.getState().goToUnit('sequence', seq.id); toggle('sequences', seq.id) }}
                      >
                        <Layers size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {seq.label}
                        </span>
                        <span className="sidebar-meta" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                          {seq.scenes.length}
                        </span>
                      </button>
                    </div>

                    {/* Scenes */}
                    {isSeqOpen && seq.scenes.map(sc => (
                      <div key={sc.id} style={{ marginLeft: 16 }}>
                        <button
                          className={`sidebar-item ${activeUnitId === sc.id ? 'active' : ''}`}
                          style={{ padding: '4px 8px', fontSize: '0.7rem', gap: 5, minWidth: 0 }}
                          onClick={() => useScreenplayStore.getState().goToUnit('scene', sc.id)}
                        >
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_DOT[sc.diagnostics?.status] || '#666', flexShrink: 0 }} />
                          <FileText size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                            {sc.heading}
                          </span>
                          <span className="sidebar-meta" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                            p.{sc.pageRange[0]}–{sc.pageRange[1]}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
