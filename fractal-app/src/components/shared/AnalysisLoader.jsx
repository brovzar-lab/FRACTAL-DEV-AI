import { Brain } from 'lucide-react'

export default function AnalysisLoader({ text = 'Analyzing…', compact = false }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: compact ? 'row' : 'column',
        alignItems: 'center', justifyContent: compact ? 'flex-start' : 'center',
        gap: compact ? 8 : 12,
        padding: compact ? '8px 0' : '20px 0',
        color: 'var(--text-muted)'
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={text}
    >
      {/* Animated brain icon */}
      <div style={{
        width: compact ? 24 : 36, height: compact ? 24 : 36,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(27,79,138,0.1) 0%, rgba(123,79,158,0.1) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 1.5s ease-in-out infinite',
        flexShrink: 0
      }} aria-hidden="true">
        <Brain size={compact ? 12 : 18} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
      </div>

      {/* Status text + skeleton bars */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: compact ? '0.7rem' : '0.8rem', color: 'var(--text-muted)' }}>{text}</div>
        {!compact && (
          <>
            <div className="skeleton" style={{ height: 8, width: '80%', borderRadius: 4 }} aria-hidden="true" />
            <div className="skeleton" style={{ height: 8, width: '60%', borderRadius: 4 }} aria-hidden="true" />
            <div className="skeleton" style={{ height: 8, width: '70%', borderRadius: 4 }} aria-hidden="true" />
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  )
}
