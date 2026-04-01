import useUIStore from '../../store/uiStore'
import useScreenplayStore from '../../store/screenplayStore'

export default function ParseConfirmStep() {
  const setWizardStep = useUIStore(s => s.setWizardStep)
  const screenplay = useScreenplayStore(s => s.screenplay)

  if (!screenplay) return null

  const actCount = screenplay.acts?.length ?? 0
  const seqCount = screenplay.acts?.flatMap(a => a.sequences ?? []).length ?? 0
  const sceneCount = screenplay.acts?.flatMap(a => a.sequences?.flatMap(s => s.scenes ?? []) ?? []).length ?? 0
  const pageCount = screenplay.pageCount ?? 0

  const stats = [
    { label: 'Acts', value: actCount },
    { label: 'Sequences', value: seqCount },
    { label: 'Scenes', value: sceneCount },
    { label: 'Pages', value: pageCount },
  ]

  return (
    <div>
      {/* Heading */}
      <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px', textAlign: 'center' }}>
        {screenplay.title}
      </h2>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px' }}>
        Parsing complete. Here's what we found:
      </p>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {stats.map(({ label, value }) => (
          <div key={label} className="notecard" style={{ padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 600, color: 'var(--accent-primary)', lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => setWizardStep(2)} style={{ fontSize: '0.9375rem', padding: '10px 32px' }}>
          Looks right — choose methodology →
        </button>
      </div>
    </div>
  )
}
