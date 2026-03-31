import { useEffect } from 'react'
import useScreenplayStore from '../store/screenplayStore'

/**
 * Global keyboard shortcuts for Fractal-AI
 * 
 * ⌘+↑     Zoom out one level
 * ⌘+↓     Zoom into first child at current level
 * ⌘+1-5   Jump to zoom level 0-4
 * Esc      Close modals / deselect
 * Tab      Cycle panel tabs (when panel focused)
 */
export default function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e) => {
      const isMeta = e.metaKey || e.ctrlKey
      const store = useScreenplayStore.getState()

      // ⌘+↑ — Zoom out
      if (isMeta && e.key === 'ArrowUp') {
        e.preventDefault()
        store.drillOut()
        return
      }

      // ⌘+↓ — Zoom into first child
      if (isMeta && e.key === 'ArrowDown') {
        e.preventDefault()
        const { zoom, screenplay, activeUnitId } = store

        if (zoom === 0 && screenplay.acts.length > 0) {
          store.drillInto('act', screenplay.acts[0].id)
        } else if (zoom === 1 && activeUnitId) {
          const act = screenplay.acts.find(a => a.id === activeUnitId)
          if (act?.sequences?.length > 0) {
            store.drillInto('sequence', act.sequences[0].id)
          }
        } else if (zoom === 2 && activeUnitId) {
          for (const act of screenplay.acts) {
            const seq = act.sequences.find(s => s.id === activeUnitId)
            if (seq?.scenes?.length > 0) {
              store.drillInto('scene', seq.scenes[0].id)
              return
            }
          }
        } else if (zoom === 3 && activeUnitId) {
          store.drillInto('beat', activeUnitId)
        }
        return
      }

      // ⌘+1 through ⌘+5 — jump to zoom level
      if (isMeta && e.key >= '1' && e.key <= '5') {
        const targetZoom = parseInt(e.key) - 1 // 0-4
        if (targetZoom <= store.zoom) {
          e.preventDefault()
          store.drillOut(targetZoom)
        }
        return
      }

      // Escape — close modals / go to full script
      if (e.key === 'Escape') {
        if (store.zoom > 0) {
          store.drillOut(0)
        }
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
