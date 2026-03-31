import useScreenplayStore, { LENSES } from '../../store/screenplayStore'

export default function LensSelector() {
  const { lens, setLens } = useScreenplayStore()

  return (
    <div style={{
      height: 38,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 4,
      flexShrink: 0,
      overflowX: 'auto'
    }}>
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        paddingRight: 8,
        borderRight: '1px solid var(--border-default)',
        marginRight: 4,
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }}>
        Lens
      </span>

      {LENSES.map(l => (
        <button
          key={l.id}
          className={`lens-pill ${lens === l.id ? 'active' : ''}`}
          data-lens={l.id}
          onClick={() => setLens(l.id)}
          title={`Switch to ${l.label} lens`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
