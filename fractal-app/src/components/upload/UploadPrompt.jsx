import { useState } from 'react'
import { Upload } from 'lucide-react'
import UploadModal from './UploadModal'

export default function UploadPrompt() {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      textAlign: 'center'
    }}>
      {/* Visual */}
      <div style={{
        width: 80, height: 80, borderRadius: 20, marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(27,79,138,0.1), rgba(123,79,158,0.1))',
        border: '1px solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(27,79,138,0.1)'
      }}>
        <Upload size={32} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
      </div>

      <h1 style={{
        fontFamily: 'var(--font-editorial)',
        fontSize: '1.6rem',
        fontWeight: 600,
        marginBottom: 10,
        color: 'var(--text-primary)'
      }}>
        Fractal-AI
      </h1>

      <p style={{
        fontSize: '0.9rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        maxWidth: 400,
        marginBottom: 8,
        fontStyle: 'italic'
      }}>
        Upload a screenplay PDF, Final Draft file, or Fountain document. Claude will parse it into acts, sequences, and scenes — ready for fractal surgery.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32, marginTop: 4 }}>
        {['PDF', 'FDX', 'Fountain'].map(fmt => (
          <span key={fmt} style={{
            padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600,
            background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)',
            borderRadius: 4, color: 'var(--text-muted)'
          }}>{fmt}</span>
        ))}
      </div>

      <button
        className="btn btn-primary btn-lg"
        onClick={() => setShowUpload(true)}
        style={{ gap: 8 }}
      >
        <Upload size={16} />
        Upload Screenplay
      </button>

      <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Or open a recent script from the sidebar
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
