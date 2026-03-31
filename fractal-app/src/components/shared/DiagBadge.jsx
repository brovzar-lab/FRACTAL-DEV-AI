export default function DiagBadge({ status, label, size = 'sm' }) {
  const configs = {
    pass: { className: 'diag-pass', label: label || '✓ Solid' },
    warn: { className: 'diag-warn', label: label || '⚠ Attention' },
    fail: { className: 'diag-fail', label: label || '✗ Critical' },
  }
  const cfg = configs[status] || configs['warn']
  return (
    <span className={cfg.className} style={size === 'lg' ? { fontSize: '0.75rem', padding: '3px 10px' } : {}}>
      {cfg.label}
    </span>
  )
}
