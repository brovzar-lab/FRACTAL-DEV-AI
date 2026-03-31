import { useState } from 'react'
import { Wand2, Check, X, Loader, RefreshCw } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'

/**
 * RewriteSuggestion — Inline AI rewrite with accept/reject
 * Shows the current scene text and a suggested rewrite side by side
 */
export default function RewriteSuggestion({ scene, editor }) {
  const { lens, updateSceneText } = useScreenplayStore()
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const generateRewrite = async () => {
    if (!scene) return
    setLoading(true)
    setAccepted(false)

    try {
      // For now, use mock rewrite. When proxy is live, this calls Claude.
      await new Promise(r => setTimeout(r, 1200))
      const rewrite = generateMockRewrite(scene, lens)
      setSuggestion(rewrite)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (!suggestion || !scene) return
    // Store original if not already stored
    updateSceneText(scene.id, suggestion.rewrittenText)
    if (editor) {
      editor.commands.setContent(suggestion.rewrittenText)
    }
    setAccepted(true)
  }

  const handleReject = () => {
    setSuggestion(null)
    setAccepted(false)
  }

  if (accepted) {
    return (
      <div style={{
        padding: '12px 16px',
        background: 'rgba(42,125,111,0.08)',
        border: '1px solid rgba(42,125,111,0.2)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} style={{ color: '#2A7D6F' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#1D5B50' }}>
            Rewrite applied. Use ⌘Z to undo.
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', fontSize: '0.7rem', gap: 4 }}
            onClick={() => { setAccepted(false); setSuggestion(null) }}
          >
            <RefreshCw size={10} /> New Suggestion
          </button>
        </div>
      </div>
    )
  }

  if (!suggestion && !loading) {
    return (
      <button
        className="btn btn-ghost btn-sm"
        onClick={generateRewrite}
        style={{
          gap: 6, width: '100%', justifyContent: 'center',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, rgba(123,79,158,0.06) 0%, rgba(27,79,138,0.06) 100%)',
          border: '1px dashed rgba(123,79,158,0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent-primary)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(123,79,158,0.12) 0%, rgba(27,79,138,0.12) 100%)'
          e.currentTarget.style.borderStyle = 'solid'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(123,79,158,0.06) 0%, rgba(27,79,138,0.06) 100%)'
          e.currentTarget.style.borderStyle = 'dashed'
        }}
      >
        <Wand2 size={14} />
        Generate AI Rewrite Suggestion
      </button>
    )
  }

  if (loading) {
    return (
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(123,79,158,0.06) 0%, rgba(27,79,138,0.06) 100%)',
        border: '1px solid rgba(123,79,158,0.2)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}>
        <Loader size={16} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite', marginBottom: 8 }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Generating rewrite based on {LENS_LABELS[lens] || lens} methodology…
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Show suggestion with accept/reject
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid rgba(123,79,158,0.25)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        background: 'linear-gradient(135deg, rgba(123,79,158,0.08) 0%, rgba(27,79,138,0.08) 100%)',
        borderBottom: '1px solid rgba(123,79,158,0.15)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Wand2 size={12} style={{ color: '#7B4F9E' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#7B4F9E' }}>
          AI Rewrite — {LENS_LABELS[lens] || lens}
        </span>
      </div>

      {/* Rationale */}
      {suggestion.rationale && (
        <div style={{
          padding: '8px 14px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          borderBottom: '1px solid var(--border-default)',
          background: 'rgba(123,79,158,0.03)',
        }}>
          {suggestion.rationale}
        </div>
      )}

      {/* Side-by-side */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
        {/* Original */}
        <div style={{ flex: 1, padding: '12px 14px', borderRight: '1px solid var(--border-default)' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            Current
          </div>
          <div style={{
            fontFamily: 'var(--font-screenplay)', fontSize: '0.8rem', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', opacity: 0.6,
            maxHeight: 200, overflow: 'auto',
          }}>
            {scene.text || '(empty)'}
          </div>
        </div>

        {/* Rewrite */}
        <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(42,125,111,0.03)' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2A7D6F', marginBottom: 6 }}>
            Suggested
          </div>
          <div style={{
            fontFamily: 'var(--font-screenplay)', fontSize: '0.8rem', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', color: 'var(--text-primary)',
            maxHeight: 200, overflow: 'auto',
          }}>
            {suggestion.rewrittenText}
          </div>
        </div>
      </div>

      {/* Accept / Reject */}
      <div style={{ padding: '8px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={handleReject} style={{ gap: 4, color: 'var(--status-fail)' }}>
          <X size={12} /> Reject
        </button>
        <button className="btn btn-ghost btn-sm" onClick={generateRewrite} style={{ gap: 4 }}>
          <RefreshCw size={12} /> Regenerate
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleAccept} style={{ gap: 4 }}>
          <Check size={12} /> Accept Rewrite
        </button>
      </div>
    </div>
  )
}

const LENS_LABELS = {
  'story-grid': 'Story Grid',
  'weiland': 'Weiland',
  'save-cat': 'Save the Cat',
  'bmoc': 'BMOC',
  'lyons': 'Lyons',
}

function generateMockRewrite(scene, lens) {
  const text = scene.text || ''
  const lines = text.split('\n')
  
  // Create a meaningful rewrite based on the lens methodology
  const rewrites = {
    'story-grid': {
      rationale: 'The scene\'s Progressive Complication is weak. Strengthening the turning point so it forces a genuine crisis decision.',
      transform: (t) => {
        // Add a complication line before the last quarter
        const splitPoint = Math.floor(lines.length * 0.6)
        const enhanced = [...lines]
        enhanced.splice(splitPoint, 0, '', 'A sound from the hallway. Something that shouldn\'t be there.', '')
        return enhanced.join('\n')
      }
    },
    'weiland': {
      rationale: 'The Ghost needs to surface here. Adding a sensory trigger that connects to the protagonist\'s original wound.',
      transform: (t) => {
        const splitPoint = Math.floor(lines.length * 0.5)
        const enhanced = [...lines]
        enhanced.splice(splitPoint, 0, '', 'The smell of rain on pavement. The same rain from that night. C stops. His hands tremble.', '')
        return enhanced.join('\n')
      }
    },
    'save-cat': {
      rationale: 'This section needs to deliver on the "promise of the premise." The fun-and-games element is missing.',
      transform: (t) => {
        const splitPoint = Math.floor(lines.length * 0.4)
        const enhanced = [...lines]
        enhanced.splice(splitPoint, 0, '', 'For the first time, C discovers he can move something heavy. A chair slides across the floor. He laughs — a ghost\'s laugh, full of possibility.', '')
        return enhanced.join('\n')
      }
    },
    'bmoc': {
      rationale: 'The Obstacle needs sharper antagonist leverage. The opposition should attack the protagonist\'s specific vulnerability.',
      transform: (t) => {
        const splitPoint = Math.floor(lines.length * 0.7)
        const enhanced = [...lines]
        enhanced.splice(splitPoint, 0, '', 'The new tenant picks up C\'s photograph from the mantle. Studies it. Then drops it in the trash.', '')
        return enhanced.join('\n')
      }
    },
    'lyons': {
      rationale: 'The immoral effect isn\'t visible. Adding a moment where the protagonist\'s blind spot causes harm the audience can see.',
      transform: (t) => {
        const splitPoint = Math.floor(lines.length * 0.65)
        const enhanced = [...lines]
        enhanced.splice(splitPoint, 0, '', 'M looks at the broken cup. Her hand shakes. She\'s been cleaning up after ghosts for too long. Her eyes are the eyes of someone running out of reasons to stay.', '')
        return enhanced.join('\n')
      }
    },
  }

  const lensRewrite = rewrites[lens] || rewrites['bmoc']
  return {
    rationale: lensRewrite.rationale,
    rewrittenText: lensRewrite.transform(text),
    lens,
  }
}
