import { useMemo } from 'react'
import { marked } from 'marked'
import BMOCCard from '../scene/BMOCCard'

// Configure marked for conversational output
marked.setOptions({
  breaks: true,      // Line breaks → <br> (feels like chat)
  gfm: true,         // GitHub-flavored markdown
  headerIds: false,   // No IDs on headers
})

/**
 * Render markdown content to sanitized HTML string.
 * Uses marked for parsing — output is intentionally minimal
 * (no script tags from Claude responses anyway).
 */
function renderMarkdown(text) {
  if (!text) return ''
  return marked.parse(text)
}

export default function ChatMessage({ message, onWhy }) {
  if (!message) return null

  if (message.role === 'user') {
    return (
      <div style={{
        marginLeft: '24px',
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 11px',
        fontFamily: 'var(--font-ui)',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        textAlign: 'right',
      }}>
        {message.content}
      </div>
    )
  }

  // AI message — render markdown as HTML
  const html = useMemo(() => renderMarkdown(message.content), [message.content])

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderLeft: '3px solid var(--accent-primary)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--accent-primary)',
        marginBottom: '5px',
      }}>
        AI Guide
      </div>
      <div
        className="ai-guide-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {message.cardType === 'bmoc' && message.cardData && (
        <div style={{ marginTop: '10px' }}>
          <BMOCCard analysis={message.cardData} />
        </div>
      )}

      {onWhy && (
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={() => onWhy(message.id)}
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.6875rem',
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
            }}
          >
            Why?
          </button>
        </div>
      )}
    </div>
  )
}
