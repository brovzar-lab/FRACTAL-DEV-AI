/**
 * DualLensPanel — Side-by-side comparison of two methodology lenses
 * on the same structural unit. Shows where frameworks agree and diverge.
 */
import { useState, useEffect, useMemo } from 'react'
import { Columns2, ArrowLeftRight, Sparkles, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'
import { analyzeAct, analyzeSequence, analyzeScene } from '../../services/claudeService'

const LENS_META = {
  'story-grid': { label: 'Story Grid', short: 'SG',  color: '#1B4F8A' },
  'weiland':    { label: 'Weiland',    short: 'KW',  color: '#7B4F9E' },
  'save-cat':   { label: 'Save the Cat', short: 'STC', color: '#2A7D6F' },
  'bmoc':       { label: 'BMOC',       short: 'BMOC', color: '#C09A30' },
  'lyons':      { label: 'Lyons',      short: 'JL',  color: '#B84040' },
}

const ALL_LENSES = Object.keys(LENS_META)

export default function DualLensPanel() {
  const { zoom, activeUnitId, screenplay, analysisCache, lens, cacheAnalysis } = useScreenplayStore()
  const [secondLens, setSecondLens] = useState(null)
  const [loadingSecond, setLoadingSecond] = useState(false)

  // Auto-suggest a contrasting lens
  const suggestedSecondLens = useMemo(() => {
    // Pair complementary methodologies
    const pairs = {
      'story-grid': 'weiland',
      'weiland': 'bmoc',
      'save-cat': 'story-grid',
      'bmoc': 'lyons',
      'lyons': 'weiland',
    }
    return pairs[lens] || 'bmoc'
  }, [lens])

  // Build cache keys
  const unitType = zoom === 1 ? 'act' : zoom === 2 ? 'seq' : zoom >= 3 ? 'scene' : null
  const primaryKey = unitType && activeUnitId ? `${unitType}-${activeUnitId}-${lens}` : null
  const secondaryKey = unitType && activeUnitId && secondLens ? `${unitType}-${activeUnitId}-${secondLens}` : null

  const primaryAnalysis = primaryKey ? analysisCache[primaryKey] : null
  const secondaryAnalysis = secondaryKey ? analysisCache[secondaryKey] : null

  // Find the current unit for analysis calls
  const currentUnit = useMemo(() => {
    if (!screenplay || !activeUnitId) return null
    for (const act of screenplay.acts) {
      if (act.id === activeUnitId) return { type: 'act', unit: act }
      for (const seq of act.sequences) {
        if (seq.id === activeUnitId) return { type: 'sequence', unit: seq, act }
        for (const sc of seq.scenes) {
          if (sc.id === activeUnitId) return { type: 'scene', unit: sc }
        }
      }
    }
    return null
  }, [screenplay, activeUnitId])

  // Fetch second lens analysis if missing
  useEffect(() => {
    if (!secondLens || !secondaryKey || secondaryAnalysis || !currentUnit) return

    setLoadingSecond(true)
    const fetchAnalysis = async () => {
      try {
        let result
        if (currentUnit.type === 'act') {
          result = await analyzeAct(currentUnit.unit, secondLens, screenplay)
        } else if (currentUnit.type === 'sequence') {
          result = await analyzeSequence(currentUnit.unit, currentUnit.act, secondLens)
        } else {
          result = await analyzeScene(currentUnit.unit, secondLens)
        }
        cacheAnalysis(secondaryKey, result)
      } catch (e) {
        console.error('[DualLens] Analysis failed:', e)
      } finally {
        setLoadingSecond(false)
      }
    }
    fetchAnalysis()
  }, [secondLens, secondaryKey, secondaryAnalysis])

  if (!primaryAnalysis) return null

  // If dual-lens not active, show the toggle button
  if (!secondLens) {
    return (
      <button
        onClick={() => setSecondLens(suggestedSecondLens)}
        className="btn btn-ghost btn-sm"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', margin: '0 14px 8px',
          fontSize: '0.7rem', color: 'var(--accent-primary)',
          border: '1px dashed rgba(27,79,138,0.25)',
          borderRadius: 'var(--radius-md)',
          width: 'calc(100% - 28px)',
          justifyContent: 'center',
        }}
      >
        <Columns2 size={12} />
        Compare with {LENS_META[suggestedSecondLens]?.label || 'another lens'}
      </button>
    )
  }

  const primaryMeta = LENS_META[lens]
  const secondaryMeta = LENS_META[secondLens]

  // Extract comparable fields
  const comparisonFields = buildComparison(primaryAnalysis, secondaryAnalysis, lens, secondLens)

  return (
    <div style={{ margin: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header with lens selectors */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        background: 'var(--bg-surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
      }}>
        <ArrowLeftRight size={12} style={{ color: 'var(--text-muted)' }} />
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>
          Dual Lens Compare
        </span>
        <div style={{ flex: 1 }} />
        <select
          value={secondLens}
          onChange={e => setSecondLens(e.target.value)}
          style={{
            fontSize: '0.65rem', padding: '2px 4px', borderRadius: 3,
            border: '1px solid var(--border-default)',
            background: `${secondaryMeta.color}12`,
            color: secondaryMeta.color, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ALL_LENSES.filter(l => l !== lens).map(l => (
            <option key={l} value={l}>{LENS_META[l].label}</option>
          ))}
        </select>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSecondLens(null)}
          style={{ padding: '2px 6px', fontSize: '0.6rem', color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>

      {/* Loading state */}
      {loadingSecond && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)',
          background: `${secondaryMeta.color}08`,
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${secondaryMeta.color}20`,
        }}>
          <Loader2 size={12} className="spin" style={{ color: secondaryMeta.color }} />
          Analyzing with {secondaryMeta.label}…
        </div>
      )}

      {/* Comparison rows */}
      {secondaryAnalysis && comparisonFields.map((field, i) => (
        <ComparisonRow
          key={i}
          field={field}
          primaryMeta={primaryMeta}
          secondaryMeta={secondaryMeta}
        />
      ))}

      {/* Agreement / Divergence summary */}
      {secondaryAnalysis && (
        <div style={{
          padding: '6px 10px',
          background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.7rem', color: 'var(--text-secondary)',
          fontStyle: 'italic',
        }}>
          {comparisonFields.filter(f => f.agreement === 'agree').length} agreement(s),{' '}
          {comparisonFields.filter(f => f.agreement === 'diverge').length} divergence(s)
        </div>
      )}
    </div>
  )
}

function ComparisonRow({ field, primaryMeta, secondaryMeta }) {
  const isAgree = field.agreement === 'agree'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '6px 8px',
      borderRadius: 'var(--radius-sm)',
      borderLeft: `3px solid ${isAgree ? '#2A7D6F' : '#C09A30'}`,
      background: isAgree ? 'rgba(42,125,111,0.04)' : 'rgba(192,154,48,0.04)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.04em', color: 'var(--text-muted)',
      }}>
        {isAgree ? <CheckCircle size={10} style={{ color: '#2A7D6F' }} /> : <AlertTriangle size={10} style={{ color: '#C09A30' }} />}
        {field.label}
        <span style={{ marginLeft: 'auto', fontSize: '0.55rem', fontWeight: 400, fontStyle: 'italic' }}>
          {isAgree ? 'AGREE' : 'DIVERGE'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {/* Primary lens value */}
        <div style={{
          flex: 1, fontSize: '0.7rem', color: 'var(--text-secondary)',
          padding: '3px 6px', borderRadius: 3,
          borderLeft: `2px solid ${primaryMeta.color}`,
          background: `${primaryMeta.color}06`,
        }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 600, color: primaryMeta.color }}>{primaryMeta.short}: </span>
          {field.primaryValue}
        </div>
        {/* Secondary lens value */}
        <div style={{
          flex: 1, fontSize: '0.7rem', color: 'var(--text-secondary)',
          padding: '3px 6px', borderRadius: 3,
          borderLeft: `2px solid ${secondaryMeta.color}`,
          background: `${secondaryMeta.color}06`,
        }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 600, color: secondaryMeta.color }}>{secondaryMeta.short}: </span>
          {field.secondaryValue}
        </div>
      </div>
    </div>
  )
}

// Build comparison fields from two analysis objects
function buildComparison(a, b, lensA, lensB) {
  if (!a || !b) return []
  const fields = []

  // Summary
  if (a.summary && b.summary) {
    fields.push({
      label: 'Summary',
      primaryValue: truncate(a.summary, 120),
      secondaryValue: truncate(b.summary, 120),
      agreement: textSimilarity(a.summary, b.summary) > 0.3 ? 'agree' : 'diverge',
    })
  }

  // Top Fix
  if (a.topFix && b.topFix) {
    fields.push({
      label: 'Top Fix',
      primaryValue: truncate(a.topFix, 100),
      secondaryValue: truncate(b.topFix, 100),
      agreement: textSimilarity(a.topFix, b.topFix) > 0.25 ? 'agree' : 'diverge',
    })
  }

  // Structural Score
  if (a.structuralScore && b.structuralScore) {
    fields.push({
      label: 'Structural Score',
      primaryValue: `${a.structuralScore}/10`,
      secondaryValue: `${b.structuralScore}/10`,
      agreement: Math.abs(a.structuralScore - b.structuralScore) <= 2 ? 'agree' : 'diverge',
    })
  }

  // Key Issues
  if (a.criticalIssues?.length && b.criticalIssues?.length) {
    fields.push({
      label: 'Critical Issues',
      primaryValue: a.criticalIssues[0] ? truncate(a.criticalIssues[0], 80) : '—',
      secondaryValue: b.criticalIssues[0] ? truncate(b.criticalIssues[0], 80) : '—',
      agreement: 'diverge', // issues almost always differ between lenses
    })
  }

  // Arc / Beat position
  if (a.arcPosition && b.arcPosition) {
    fields.push({
      label: 'Arc Position',
      primaryValue: truncate(a.arcPosition, 100),
      secondaryValue: truncate(b.arcPosition, 100),
      agreement: textSimilarity(a.arcPosition, b.arcPosition) > 0.3 ? 'agree' : 'diverge',
    })
  }

  // Next steps
  if (a.nextSteps && b.nextSteps) {
    fields.push({
      label: 'Focus Next',
      primaryValue: truncate(a.nextSteps, 100),
      secondaryValue: truncate(b.nextSteps, 100),
      agreement: textSimilarity(a.nextSteps, b.nextSteps) > 0.25 ? 'agree' : 'diverge',
    })
  }

  return fields
}

function truncate(str, len) {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '…' : str
}

// Very simple word-overlap similarity
function textSimilarity(a, b) {
  if (!a || !b) return 0
  const wordsA = new Set(a.toLowerCase().split(/\s+/))
  const wordsB = new Set(b.toLowerCase().split(/\s+/))
  let overlap = 0
  for (const w of wordsA) if (wordsB.has(w)) overlap++
  return overlap / Math.max(wordsA.size, wordsB.size)
}
