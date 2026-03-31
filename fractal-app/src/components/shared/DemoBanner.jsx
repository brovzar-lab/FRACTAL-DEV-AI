import { Sparkles } from 'lucide-react'

/**
 * Persistent banner shown when Claude proxy is not configured
 */
export default function DemoBanner() {
  if (import.meta.env.VITE_CLAUDE_PROXY_URL) return null

  return (
    <div style={{
      padding: '5px 16px',
      background: 'linear-gradient(135deg, rgba(192,154,48,0.08) 0%, rgba(27,79,138,0.08) 100%)',
      borderBottom: '1px solid rgba(192,154,48,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      flexShrink: 0,
    }}>
      <Sparkles size={12} style={{ color: '#C09A30' }} />
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 500,
        color: '#8A6E1F',
        letterSpacing: '0.02em',
      }}>
        Demo Mode — AI analysis uses sample data. Deploy the Claude proxy to go live.
      </span>
    </div>
  )
}
