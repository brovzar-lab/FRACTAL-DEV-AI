import { ChevronRight, Home } from 'lucide-react'
import useScreenplayStore, { ZOOM_LABELS } from '../../store/screenplayStore'

const ZOOM_COLORS = [
  'var(--zoom-0-color)',
  'var(--zoom-1-color)',
  'var(--zoom-2-color)',
  'var(--zoom-3-color)',
  'var(--zoom-4-color)',
]

const ZOOM_DOTS = ['●●●●', '●●●○', '●●○○', '●○○○', '◉○○○']

export default function ZoomBar() {
  const { zoom, zoomPath, drillOut } = useScreenplayStore()

  return (
    <div className="zoom-bar" style={{ gap: 4 }}>
      {/* Zoom depth indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingRight: 12,
        borderRight: '1px solid var(--border-default)',
        marginRight: 8,
        flexShrink: 0
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: ZOOM_COLORS[zoom],
          boxShadow: `0 0 6px ${ZOOM_COLORS[zoom]}80`,
          flexShrink: 0
        }} />
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: ZOOM_COLORS[zoom],
        }}>
          Z{zoom} — {ZOOM_LABELS[zoom]}
        </span>
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
        {/* Home */}
        <button
          onClick={() => drillOut(0)}
          className="btn btn-ghost btn-sm"
          style={{ gap: 4, padding: '3px 7px', flexShrink: 0 }}
          title="Go to Full Script"
        >
          <Home size={11} />
          <span style={{ fontSize: '0.75rem', color: zoom === 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            Full Script
          </span>
        </button>

        {zoomPath.map((crumb, idx) => (
          <div key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
            <ChevronRight size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <button
              onClick={() => drillOut(crumb.zoom)}
              className="btn btn-ghost btn-sm"
              style={{
                padding: '3px 7px',
                color: idx === zoomPath.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: idx === zoomPath.length - 1 ? 500 : 400,
                maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: '0.75rem'
              }}
            >
              {crumb.label}
            </button>
          </div>
        ))}
      </div>

      {/* Zoom level pills (right side) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {[0,1,2,3,4].map(level => (
          <button
            key={level}
            onClick={() => drillOut(level)}
            title={`Zoom to ${ZOOM_LABELS[level]}`}
            style={{
              width: 24, height: 24,
              borderRadius: 4,
              border: '1px solid',
              borderColor: level === zoom ? ZOOM_COLORS[level] : 'transparent',
              background: level === zoom ? `${ZOOM_COLORS[level]}18` : 'transparent',
              color: level === zoom ? ZOOM_COLORS[level] : 'var(--text-muted)',
              fontSize: '0.6rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  )
}
