/**
 * BatchAnalysis — Analyze all scenes in one click with progress bar.
 * Re-uses existing analyzeScene() calls sequentially to stay under rate limits.
 */
import { useState, useMemo, useCallback } from 'react'
import { Play, Square, Loader2, CheckCircle, AlertTriangle, Zap, RefreshCw } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'
import { analyzeScene } from '../../services/claudeService'

export default function BatchAnalysis() {
  const {
    screenplay, lens, analysisCache,
    cacheAnalysis, batchRunning, batchProgress,
    startBatch, updateBatchProgress, endBatch,
    isAnalysisStale, 
  } = useScreenplayStore()

  const [cancelled, setCancelled] = useState(false)
  const [results, setResults] = useState(null)

  // Gather all scenes
  const allScenes = useMemo(() => {
    if (!screenplay?.acts) return []
    return screenplay.acts.flatMap(a =>
      a.sequences.flatMap(s => s.scenes.map(sc => ({ ...sc, seqLabel: s.label })))
    )
  }, [screenplay])

  // Count cached/stale/missing
  const stats = useMemo(() => {
    let cached = 0, stale = 0, missing = 0
    for (const sc of allScenes) {
      const key = `scene-${sc.id}-${lens}`
      const entry = analysisCache[key]
      if (!entry) { missing++; continue }
      if (entry.contentHash && sc.contentHash && entry.contentHash !== sc.contentHash) {
        stale++
      } else {
        cached++
      }
    }
    return { cached, stale, missing, total: allScenes.length }
  }, [allScenes, lens, analysisCache])

  const handleRun = useCallback(async (onlyStale = false) => {
    if (batchRunning) return
    setCancelled(false)
    setResults(null)

    const scenesToAnalyze = allScenes.filter(sc => {
      const key = `scene-${sc.id}-${lens}`
      const entry = analysisCache[key]
      if (!entry) return true // missing
      if (onlyStale && entry.contentHash && sc.contentHash && entry.contentHash !== sc.contentHash) return true
      if (!onlyStale) return true // re-analyze all
      return false
    })

    if (scenesToAnalyze.length === 0) {
      setResults({ analyzed: 0, errors: 0, skipped: allScenes.length })
      return
    }

    startBatch(scenesToAnalyze.length)
    let analyzed = 0, errors = 0

    for (let i = 0; i < scenesToAnalyze.length; i++) {
      // Check cancellation
      if (cancelled) break

      const sc = scenesToAnalyze[i]
      updateBatchProgress(i + 1, sc.heading)

      try {
        const result = await analyzeScene(sc, lens)
        cacheAnalysis(`scene-${sc.id}-${lens}`, result, sc.contentHash)
        analyzed++
      } catch (e) {
        console.warn(`[Batch] Error analyzing ${sc.heading}:`, e.message)
        errors++
      }

      // Small delay to avoid hammering the API
      if (i < scenesToAnalyze.length - 1) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    endBatch()
    setResults({ analyzed, errors, skipped: allScenes.length - scenesToAnalyze.length })
  }, [allScenes, lens, analysisCache, batchRunning, cancelled])

  const handleCancel = () => {
    setCancelled(true)
    endBatch()
  }

  if (!screenplay) return null

  return (
    <div style={{
      margin: '0 14px', padding: 10,
      background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Zap size={12} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', flex: 1 }}>
          Batch Analysis
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          {lens.toUpperCase()} lens
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Stat label="Total" value={stats.total} color="var(--text-secondary)" />
        <Stat label="Cached" value={stats.cached} color="#2A7D6F" />
        <Stat label="Stale" value={stats.stale} color="#C09A30" />
        <Stat label="Missing" value={stats.missing} color="#B84040" />
      </div>

      {/* Progress bar (when running) */}
      {batchRunning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            height: 6, borderRadius: 3, background: 'var(--bg-surface)',
            overflow: 'hidden', border: '1px solid var(--border-default)',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, var(--accent-primary), #2A7D6F)',
              width: `${(batchProgress.current / batchProgress.total) * 100}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.6rem', color: 'var(--text-muted)',
          }}>
            <Loader2 size={10} className="spin" />
            {batchProgress.current}/{batchProgress.total} — {batchProgress.currentScene}
          </div>
        </div>
      )}

      {/* Results */}
      {results && !batchRunning && (
        <div style={{
          display: 'flex', gap: 8, fontSize: '0.65rem', alignItems: 'center',
          padding: '4px 8px', borderRadius: 'var(--radius-sm)',
          background: results.errors > 0 ? 'rgba(192,154,48,0.08)' : 'rgba(42,125,111,0.08)',
        }}>
          {results.errors === 0 ? (
            <CheckCircle size={11} style={{ color: '#2A7D6F' }} />
          ) : (
            <AlertTriangle size={11} style={{ color: '#C09A30' }} />
          )}
          <span style={{ color: 'var(--text-secondary)' }}>
            {results.analyzed} analyzed · {results.skipped} skipped · {results.errors} error(s)
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4 }}>
        {!batchRunning ? (
          <>
            <button
              className="btn btn-sm"
              onClick={() => handleRun(false)}
              disabled={allScenes.length === 0}
              style={{
                fontSize: '0.65rem', padding: '4px 10px', gap: 4,
                background: 'var(--accent-primary)', color: '#fff', border: 'none',
              }}
            >
              <Play size={10} />
              Analyze All ({stats.missing + stats.stale + stats.cached})
            </button>
            {stats.stale > 0 && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleRun(true)}
                style={{ fontSize: '0.65rem', padding: '4px 8px', gap: 3, color: '#C09A30' }}
              >
                <RefreshCw size={10} />
                Re-analyze Stale ({stats.stale})
              </button>
            )}
          </>
        ) : (
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleCancel}
            style={{ fontSize: '0.65rem', padding: '4px 10px', gap: 3, color: 'var(--status-fail)' }}
          >
            <Square size={10} />
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
