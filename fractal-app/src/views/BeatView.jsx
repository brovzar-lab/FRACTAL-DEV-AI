import { useState, useEffect, useMemo } from 'react'
import useScreenplayStore from '../store/screenplayStore'
import AnalysisLoader from '../components/shared/AnalysisLoader'
import { analyzeBeat } from '../services/claudeService'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

const BMOC_POSITIONS = ['beginning', 'middle', 'obstacle', 'climax']
const BMOC_LABELS = { beginning: 'B — Beginning', middle: 'M — Middle', obstacle: 'O — Obstacle', climax: 'C — Climax' }
const BMOC_COLORS = { beginning: '#1B4F8A', middle: '#2A7D6F', obstacle: '#C09A30', climax: '#B84040' }

export default function BeatView() {
  const { screenplay, activeUnitId, drillOut } = useScreenplayStore()
  const [selectedPos, setSelectedPos] = useState(0)
  const [beatAnalysis, setBeatAnalysis] = useState({})
  const [loading, setLoading] = useState({})

  // Find scene via useMemo — no early return before hooks
  const scene = useMemo(() => {
    for (const act of screenplay.acts) {
      for (const seq of act.sequences) {
        const found = seq.scenes.find(s => s.id === activeUnitId)
        if (found) return found
      }
    }
    return null
  }, [screenplay, activeUnitId])

  // Split scene text into BMOC segments
  const segments = useMemo(() => {
    if (!scene) return []
    const lines = (scene.text || '').split('\n').filter(Boolean)
    const segSize = Math.ceil(lines.length / 4)
    return BMOC_POSITIONS.map((pos, i) => ({
      pos, label: BMOC_LABELS[pos],
      text: lines.slice(i * segSize, (i + 1) * segSize).join('\n') || '(empty)',
      ok: scene.diagnostics?.[`${pos[0]}Present`] ?? true
    }))
  }, [scene])

  const selected = segments[selectedPos]

  const loadBeatAnalysis = async (pos) => {
    if (!scene) return
    const key = `${scene.id}-${pos}`
    if (beatAnalysis[key]) return
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const result = await analyzeBeat(scene, segments[pos]?.text, pos / 4)
      setBeatAnalysis(prev => ({ ...prev, [key]: result }))
    } catch (e) { console.error(e) }
    finally { setLoading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    if (scene) loadBeatAnalysis(selectedPos)
  }, [selectedPos, scene?.id])

  // Now safe to return null
  if (!scene) return null

  const currentAnalysis = beatAnalysis[`${scene.id}-${selectedPos}`]
  const isLoading = loading[`${scene.id}-${selectedPos}`]

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* BMOC selector — left column */}
      <div style={{
        width: 200, flexShrink: 0,
        borderRight: '1px solid var(--border-default)',
        background: 'var(--bg-surface-2)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Back to scene */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => drillOut(3)}
          style={{ margin: 10, gap: 5 }}
        >
          <ArrowLeft size={12} />
          Back to Scene
        </button>

        <div style={{ padding: '0 10px', marginBottom: 8 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
            Beat Level
          </div>
          <div style={{ fontFamily: 'var(--font-screenplay)', fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scene.heading}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-default)', margin: '0 10px 10px' }} />

        {segments.map((seg, idx) => {
          const isActive = idx === selectedPos
          const color = BMOC_COLORS[seg.pos]
          return (
            <button
              key={seg.pos}
              onClick={() => setSelectedPos(idx)}
              style={{
                padding: '10px 14px',
                textAlign: 'left',
                background: isActive ? `${color}14` : 'transparent',
                border: 'none',
                borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex', flexDirection: 'column', gap: 3
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: isActive ? color : 'var(--bg-surface)',
                  color: isActive ? '#fff' : color,
                  border: `1px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, flexShrink: 0
                }}>
                  {seg.pos[0].toUpperCase()}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isActive ? color : 'var(--text-secondary)' }}>
                  {['Beginning','Middle','Obstacle','Climax'][idx]}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 28 }}>
                {seg.ok
                  ? <CheckCircle size={10} style={{ color: 'var(--status-pass)' }} />
                  : <XCircle size={10} style={{ color: 'var(--status-fail)' }} />
                }
                <span style={{ fontSize: '0.65rem', color: seg.ok ? 'var(--status-pass)' : 'var(--status-fail)' }}>
                  {seg.ok ? 'Present' : 'Missing'}
                </span>
              </div>
            </button>
          )
        })}

        {/* Value shift & all-is-lost summary */}
        <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--border-default)' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Scene Health
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <HealthRow label="Value Shift" ok={scene.diagnostics?.valueShift} />
            <HealthRow label="Dramatic Ques." ok={!!scene.diagnostics?.beatQuestion} />
            <HealthRow label="Protagonist" ok={scene.diagnostics?.hasProtagonist} />
          </div>
        </div>
      </div>

      {/* Beat focus area — right */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="scroll-y" style={{ flex: 1, padding: '20px 28px', display: 'flex', gap: 20 }}>
          {/* Beat text */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="zoom-badge zoom-badge-4" style={{ marginBottom: 8 }}>Beat</div>
              <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.1rem', color: BMOC_COLORS[selected?.pos] }}>
                {selected?.label}
              </h2>
            </div>

            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderLeft: `3px solid ${BMOC_COLORS[selected?.pos]}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              fontFamily: 'var(--font-screenplay)',
              fontSize: '0.875rem',
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              minHeight: 200,
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-card)'
            }}>
              {selected?.text || '(empty)'}
            </div>
          </div>

          {/* Beat analysis */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Beat Analysis
              </div>
            </div>

            {isLoading && <AnalysisLoader text="Analyzing beat…" compact />}

            {currentAnalysis && !isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <BeatField label="Dramatic Question" value={currentAnalysis.dramaticQuestion} />
                <BeatField label="Protagonist Want" value={currentAnalysis.protagonistWant} />
                <BeatField label="Opposition" value={currentAnalysis.opposition} />
                <BeatField label="Tactic" value={currentAnalysis.tactic} />
                <BeatField label="Value Shift" value={currentAnalysis.valueShift} accent />
                <BeatField label="Wound Connection" value={currentAnalysis.wound} />

                {currentAnalysis.rewriteSuggestion && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'linear-gradient(135deg, rgba(123,79,158,0.08) 0%, rgba(27,79,138,0.08) 100%)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(123,79,158,0.2)',
                  }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--zoom-3-color)', marginBottom: 4 }}>
                      Rewrite Suggestion
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                      {currentAnalysis.rewriteSuggestion}
                    </div>

                    <button
                      className="btn btn-sm btn-primary"
                      style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        useScreenplayStore.getState().addTask({
                          priority: 'P1', status: 'open',
                          level: 'scene', linkedId: scene.id,
                          title: `Rewrite ${['B','M','O','C'][selectedPos]} beat — ${scene.heading}`,
                          description: currentAnalysis.rewriteSuggestion,
                        })
                        useScreenplayStore.getState().setPanelTab('tasks')
                      }}
                    >
                      Add to Rewrite Tasks
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function BeatField({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{
        fontSize: '0.8rem',
        color: accent ? 'var(--accent-primary)' : 'var(--text-secondary)',
        fontWeight: accent ? 500 : 400,
        fontStyle: accent ? 'normal' : 'italic',
        lineHeight: 1.45
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

function HealthRow({ label, ok }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
      {ok
        ? <CheckCircle size={12} style={{ color: 'var(--status-pass)' }} />
        : <XCircle size={12} style={{ color: 'var(--status-fail)' }} />
      }
    </div>
  )
}
