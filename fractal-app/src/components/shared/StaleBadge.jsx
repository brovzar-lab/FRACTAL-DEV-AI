/**
 * StaleBadge — Visual indicator when a scene's analysis is out of date.
 * Shows when scene content has changed since the last AI analysis.
 */
import { RefreshCw } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'

export default function StaleBadge({ sceneId, style = {} }) {
  const { analysisCache, lens } = useScreenplayStore()
  
  // Find the scene to get its current content hash
  const { screenplay } = useScreenplayStore.getState()
  if (!screenplay || !sceneId) return null

  let scene = null
  for (const act of screenplay.acts) {
    for (const seq of act.sequences) {
      const found = seq.scenes.find(s => s.id === sceneId)
      if (found) { scene = found; break }
    }
    if (scene) break
  }

  if (!scene) return null

  const key = `scene-${sceneId}-${lens}`
  const entry = analysisCache[key]

  // Not stale if: no entry (show "not yet analyzed" elsewhere), or hashes match
  if (!entry) return null
  if (!entry.contentHash || !scene.contentHash) return null
  if (entry.contentHash === scene.contentHash) return null

  // It's stale!
  return (
    <span
      title="Analysis is out of date — scene has been edited since last analysis"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: '0.55rem', fontWeight: 600,
        color: '#C09A30',
        padding: '1px 5px',
        borderRadius: 100,
        background: 'rgba(192,154,48,0.1)',
        border: '1px solid rgba(192,154,48,0.2)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <RefreshCw size={8} />
      Stale
    </span>
  )
}

/**
 * InlineStaleDot — tiny dot indicator for space-constrained layouts (e.g., sidebar)
 */
export function InlineStaleDot({ sceneId }) {
  const { analysisCache, lens } = useScreenplayStore()
  const { screenplay } = useScreenplayStore.getState()
  if (!screenplay || !sceneId) return null

  let scene = null
  for (const act of screenplay.acts) {
    for (const seq of act.sequences) {
      const found = seq.scenes.find(s => s.id === sceneId)
      if (found) { scene = found; break }
    }
    if (scene) break
  }

  if (!scene) return null

  const key = `scene-${sceneId}-${lens}`
  const entry = analysisCache[key]
  if (!entry || !entry.contentHash || !scene.contentHash) return null
  if (entry.contentHash === scene.contentHash) return null

  return (
    <span
      title="Analysis stale"
      style={{
        width: 5, height: 5, borderRadius: '50%',
        background: '#C09A30',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}
