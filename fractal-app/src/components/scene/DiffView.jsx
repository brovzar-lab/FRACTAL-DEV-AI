import { useMemo } from 'react'

/**
 * DiffView — shows before/after text comparison
 * Word-level diff with green additions and red deletions
 */
export default function DiffView({ original, current }) {
  const diff = useMemo(() => computeWordDiff(original || '', current || ''), [original, current])

  if (!original) {
    return (
      <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center' }}>
        No original text to compare — this scene hasn't been modified yet.
      </div>
    )
  }

  const hasChanges = diff.some(d => d.type !== 'equal')
  if (!hasChanges) {
    return (
      <div style={{ padding: 20, color: 'var(--status-pass)', fontSize: '0.8rem', textAlign: 'center' }}>
        ✓ No changes — text matches original.
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: 'var(--font-screenplay)',
      fontSize: '0.85rem',
      lineHeight: 1.7,
      padding: '16px 20px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      {diff.map((segment, i) => {
        if (segment.type === 'equal') {
          return <span key={i}>{segment.text}</span>
        }
        if (segment.type === 'added') {
          return (
            <span key={i} style={{
              background: 'rgba(42,125,111,0.15)',
              color: '#1D5B50',
              borderRadius: 2,
              padding: '0 2px',
            }}>
              {segment.text}
            </span>
          )
        }
        if (segment.type === 'removed') {
          return (
            <span key={i} style={{
              background: 'rgba(184,64,64,0.12)',
              color: '#B84040',
              textDecoration: 'line-through',
              borderRadius: 2,
              padding: '0 2px',
              opacity: 0.7,
            }}>
              {segment.text}
            </span>
          )
        }
        return null
      })}
    </div>
  )
}

/**
 * Simple word-level diff using LCS (Longest Common Subsequence)
 * Returns array of { type: 'equal'|'added'|'removed', text: string }
 */
function computeWordDiff(oldText, newText) {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  // LCS table
  const m = oldWords.length
  const n = newWords.length
  
  // For very long texts, fall back to line-level diff
  if (m * n > 500000) {
    return computeLineDiff(oldText, newText)
  }

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const result = []
  let i = m, j = n
  const stack = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      stack.push({ type: 'equal', text: oldWords[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', text: newWords[j - 1] })
      j--
    } else {
      stack.push({ type: 'removed', text: oldWords[i - 1] })
      i--
    }
  }

  stack.reverse()

  // Merge consecutive segments of the same type
  for (const seg of stack) {
    if (result.length > 0 && result[result.length - 1].type === seg.type) {
      result[result.length - 1].text += seg.text
    } else {
      result.push({ ...seg })
    }
  }

  return result
}

function computeLineDiff(oldText, newText) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result = []

  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const ol = oldLines[i]
    const nl = newLines[i]
    if (ol === nl) {
      result.push({ type: 'equal', text: ol + '\n' })
    } else {
      if (ol !== undefined) result.push({ type: 'removed', text: ol + '\n' })
      if (nl !== undefined) result.push({ type: 'added', text: nl + '\n' })
    }
  }

  return result
}
