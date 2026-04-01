import { Palette } from 'lucide-react'
import useScreenplayStore, { COLOR_MODES } from '../../store/screenplayStore'

const MODE_CONFIG = {
  health:      { label: 'Health',      description: 'Structural diagnostic status' },
  status:      { label: 'Status',      description: 'Workflow stage (untouched → approved)' },
  methodology: { label: 'Methodology', description: 'Color by active lens framework' },
  tension:     { label: 'Tension',     description: 'Estimated tension/energy level' },
}

export default function ColorModeSelector() {
  const { colorMode, setColorMode } = useScreenplayStore()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Palette size={12} style={{ color: 'var(--text-muted)', marginRight: 2 }} />
      {COLOR_MODES.map(mode => {
        const cfg = MODE_CONFIG[mode]
        const isActive = colorMode === mode
        return (
          <button
            key={mode}
            onClick={() => setColorMode(mode)}
            title={cfg.description}
            style={{
              padding: '3px 8px',
              fontSize: '0.65rem',
              fontWeight: isActive ? 600 : 400,
              borderRadius: 100,
              border: '1px solid',
              borderColor: isActive ? 'var(--accent-primary)' : 'transparent',
              background: isActive ? 'rgba(27,79,138,0.12)' : 'transparent',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}
