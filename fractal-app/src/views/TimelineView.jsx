import { useMemo } from 'react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'

const ACT_COLORS = [
  { bg: 'rgba(27,79,138,0.12)', color: '#1B4F8A' },
  { bg: 'rgba(184,92,44,0.12)', color: '#B85C2C' },
  { bg: 'rgba(42,125,111,0.12)', color: '#2A7D6F' },
  { bg: 'rgba(123,79,158,0.12)', color: '#7B4F9E' },
  { bg: 'rgba(192,154,48,0.12)', color: '#C09A30' },
]

const STATUS_COLORS = { pass: '#2A7D6F', warn: '#C09A30', fail: '#B84040' }
const TENSION_COLORS = ['#2A7D6F', '#6BA368', '#C09A30', '#D97A2C', '#B84040']

export default function TimelineView() {
  const { screenplay, openSceneDrawer, colorMode, zoom, zoomPath } = useScreenplayStore()

  const { allScenes, totalPages } = useMemo(() => {
    if (!screenplay?.acts) return { allScenes: [], totalPages: 1 }
    const scenes = []
    screenplay.acts.forEach((act, ai) => {
      act.sequences.forEach(seq => {
        seq.scenes.forEach(sc => {
          scenes.push({ ...sc, actIndex: ai, actId: act.id, seqId: seq.id })
        })
      })
    })
    return { allScenes: scenes, totalPages: screenplay.pageCount || 1 }
  }, [screenplay])

  // Determine which act is "focused" from the zoom path
  const focusedActId = useMemo(() => {
    const act = zoomPath?.find(p => p.type === 'act')
    return act?.id || null
  }, [zoomPath])

  if (!screenplay) return null

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Title */}
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          Timeline — proportional pacing map
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Each block is proportional to page count. {colorMode === 'tension' ? 'Color = tension level.' : colorMode === 'health' ? 'Color = structural health.' : colorMode === 'status' ? 'Color = workflow status.' : 'Color = act grouping.'}
        </div>
      </div>

      {/* Act bands */}
      <div style={{ display: 'flex', gap: 2, height: 28, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-surface-2)' }}>
        {screenplay.acts.map((act, ai) => {
          const actColor = ACT_COLORS[ai % ACT_COLORS.length]
          const actWidth = ((act.pageRange[1] - act.pageRange[0]) / totalPages) * 100
          const dimmed = focusedActId && focusedActId !== act.id
          return (
            <div
              key={act.id}
              style={{
                width: `${actWidth}%`,
                background: actColor.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 600, color: actColor.color,
                letterSpacing: '0.03em',
                opacity: dimmed ? 0.35 : 1,
                transition: 'opacity 0.3s',
              }}
            >
              {act.label.replace(/^Act /, '').split('—')[0].trim()}
            </div>
          )
        })}
      </div>

      {/* Main timeline — scene bars */}
      <div style={{
        display: 'flex', gap: 2, height: 80, borderRadius: 8,
        overflow: 'hidden', border: '1px solid var(--border-default)',
        background: 'var(--bg-surface-2)',
      }}>
        {allScenes.map((sc, i) => {
          const width = Math.max(((sc.pageRange[1] - sc.pageRange[0]) / totalPages) * 100, 0.6)
          const actColor = ACT_COLORS[sc.actIndex % ACT_COLORS.length]
          const dimmed = focusedActId && focusedActId !== sc.actId

          // Color based on mode
          let bgColor = actColor.color
          if (colorMode === 'health') {
            bgColor = STATUS_COLORS[sc.diagnostics?.status] || '#999'
          } else if (colorMode === 'status') {
            const statusColors = { untouched: '#888', 'in-progress': '#C09A30', revised: '#1B4F8A', approved: '#2A7D6F', flagged: '#B84040' }
            bgColor = statusColors[sc.workflowStatus] || '#888'
          } else if (colorMode === 'tension') {
            const tension = sc.diagnostics?.tensionLevel || 3
            bgColor = TENSION_COLORS[Math.min(Math.max(tension - 1, 0), 4)]
          }

          return (
            <div
              key={sc.id}
              title={`${sc.heading}\np.${sc.pageRange[0]}–${sc.pageRange[1]}\n${sc.diagnostics?.status?.toUpperCase() || ''}`}
              onClick={() => openSceneDrawer(sc.id)}
              style={{
                flex: width,
                background: bgColor,
                opacity: dimmed ? 0.3 : 0.75,
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.15s',
                borderRight: i < allScenes.length - 1 ? '1px solid rgba(0,0,0,0.12)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1.1)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = dimmed ? '0.3' : '0.75'; e.currentTarget.style.transform = '' }}
            />
          )
        })}
      </div>

      {/* Page markers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -12 }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>p.1</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>p.{totalPages}</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: -4 }}>
        {colorMode === 'health' && ['pass', 'warn', 'fail'].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: STATUS_COLORS[s] }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s === 'pass' ? 'Solid' : s === 'warn' ? 'Attention' : 'Critical'}</span>
          </div>
        ))}
        {colorMode === 'tension' && [1, 2, 3, 4, 5].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: TENSION_COLORS[t - 1] }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Level {t}</span>
          </div>
        ))}
      </div>

      {/* Scene detail list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {allScenes.map((sc, i) => {
          const actColor = ACT_COLORS[sc.actIndex % ACT_COLORS.length]
          const dimmed = focusedActId && focusedActId !== sc.actId
          return (
            <div
              key={sc.id}
              onClick={() => openSceneDrawer(sc.id)}
              style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                opacity: dimmed ? 0.4 : 1,
                transition: 'all 0.15s',
                borderLeft: `3px solid ${actColor.color}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, width: 20 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sc.heading}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                p.{sc.pageRange[0]}–{sc.pageRange[1]}
              </span>
              <DiagBadge status={sc.diagnostics?.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
