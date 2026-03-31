import { CheckCircle, XCircle, Plus } from 'lucide-react'

export default function BMOCCard({ analysis, onCreateTask }) {
  if (!analysis) return null

  const bmocOrder = ['beginning', 'middle', 'obstacle', 'climax']
  const bmocLabels = { beginning: 'Beginning', middle: 'Middle', obstacle: 'Obstacle', climax: 'Climax' }
  const bmocColors = { beginning: '#1B4F8A', middle: '#2A7D6F', obstacle: '#C09A30', climax: '#B84040' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Dramatic question */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
          Dramatic Question
        </div>
        <div style={{
          padding: '8px 10px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          fontStyle: 'italic',
          lineHeight: 1.45
        }}>
          {analysis.dramaticQuestion || '—'}
        </div>
      </div>

      {/* Protagonist + Opposition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <MiniField label="Protagonist" value={analysis.protagonistOfScene} />
        <MiniField label="Opposition" value={analysis.antagonistOrOpposition} />
      </div>

      {/* BMOC breakdown */}
      <div>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          BMOC Structure
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {bmocOrder.map(key => {
            const beat = analysis.bmoc?.[key]
            const ok = beat?.present
            const color = bmocColors[key]
            return (
              <div key={key} style={{
                display: 'flex', gap: 7, alignItems: 'flex-start',
                padding: '7px 8px',
                background: ok ? `${color}08` : 'var(--status-fail-bg)',
                border: `1px solid ${ok ? `${color}25` : 'rgba(184,64,64,0.2)'}`,
                borderRadius: 'var(--radius-sm)',
                borderLeft: `2px solid ${ok ? color : 'var(--status-fail)'}`,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                  background: ok ? color : 'var(--status-fail-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1
                }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, color: ok ? '#fff' : 'var(--status-fail)' }}>
                    {key[0].toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: ok ? color : 'var(--status-fail)' }}>
                      {bmocLabels[key]}
                    </span>
                    {ok
                      ? <CheckCircle size={10} style={{ color: 'var(--status-pass)' }} />
                      : <XCircle size={10} style={{ color: 'var(--status-fail)' }} />
                    }
                  </div>
                  {beat?.text && (
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4, fontStyle: 'italic' }}>
                      {beat.text}
                    </div>
                  )}
                  {beat?.note && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-warm)', marginTop: 2 }}>
                      ⚠ {beat.note}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Value shift */}
      <div style={{
        padding: '8px 10px',
        background: analysis.valueShift ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
        border: `1px solid ${analysis.valueShift ? 'rgba(42,125,111,0.25)' : 'rgba(184,64,64,0.25)'}`,
        borderRadius: 'var(--radius-md)',
        display: 'flex', gap: 7, alignItems: 'flex-start'
      }}>
        {analysis.valueShift ? <CheckCircle size={13} style={{ color: 'var(--status-pass)', flexShrink: 0, marginTop: 1 }} /> : <XCircle size={13} style={{ color: 'var(--status-fail)', flexShrink: 0, marginTop: 1 }} />}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: analysis.valueShift ? 'var(--status-pass)' : 'var(--status-fail)', marginBottom: 2 }}>
            Value Shift
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            {analysis.valueShiftNote || (analysis.valueShift ? 'Positive shift present' : 'No value shift detected')}
          </div>
        </div>
      </div>

      {/* Top fix + create task */}
      {analysis.topFix && (
        <div style={{
          padding: '10px 10px',
          background: 'rgba(27,79,138,0.06)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(27,79,138,0.15)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: 5 }}>
            Top Fix
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 8 }}>
            {analysis.topFix}
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: 5 }}
            onClick={() => onCreateTask?.(analysis.topFix)}
          >
            <Plus size={11} />
            Add to Rewrite Tasks
          </button>
        </div>
      )}
    </div>
  )
}

function MiniField({ label, value }) {
  return (
    <div style={{
      padding: '7px 9px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>
        {value || '—'}
      </div>
    </div>
  )
}
