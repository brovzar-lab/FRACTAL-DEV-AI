import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// === Types / Constants ===
export const ZOOM_LEVELS = {
  FULL_SCRIPT: 0,
  ACT: 1,
  SEQUENCE: 2,
  SCENE: 3,
  BEAT: 4,
}

export const ZOOM_LABELS = ['Full Script', 'Act', 'Sequence', 'Scene', 'Beat']

export const LENSES = [
  { id: 'story-grid', label: 'Story Grid', short: 'SG' },
  { id: 'weiland',    label: 'Weiland',    short: 'KW' },
  { id: 'save-cat',   label: 'Save the Cat', short: 'STC' },
  { id: 'bmoc',       label: 'BMOC',       short: 'BMOC' },
  { id: 'lyons',      label: 'Lyons',      short: 'JL' },
]

// Scene workflow statuses
export const SCENE_STATUSES = ['untouched', 'in-progress', 'revised', 'approved', 'flagged']

// Color modes for visual overlays
export const COLOR_MODES = ['health', 'status', 'methodology', 'tension']

// View types
export const VIEW_TYPES = ['fractal', 'board', 'timeline', 'outline']

// === UI Store ===
const useUIStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', next)
        set({ theme: next })
      },

      // Zoom navigation
      zoom: ZOOM_LEVELS.FULL_SCRIPT,
      zoomPath: [],
      activeUnitId: null,

      // View mode
      viewType: 'fractal', // 'fractal' | 'board' | 'timeline' | 'outline'
      setViewType: (vt) => set({ viewType: vt }),

      // Color mode
      colorMode: 'health', // 'health' | 'status' | 'methodology' | 'tension'
      setColorMode: (cm) => set({ colorMode: cm }),

      // Lens
      lens: 'story-grid',
      setLens: (lensId) => set({ lens: lensId }),

      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      // Right panel
      panelTab: 'diagnosis',
      setPanelTab: (tab) => set({ panelTab: tab }),

      // Wizard step state — controls onboarding wizard overlay
      // 0 = not started, 1-5 = wizard steps in progress, 6 = complete
      // Reset to 0 on project close (not persisted to localStorage)
      wizardStep: 0,
      setWizardStep: (step) => set({ wizardStep: step }),

      // Scene slide-out drawer
      sceneDrawerOpen: false,
      sceneDrawerId: null,
      sceneDrawerDirection: 'right', // 'right' | 'bottom' | 'left'
      openSceneDrawer: (sceneId, direction) => set({
        sceneDrawerOpen: true,
        sceneDrawerId: sceneId,
        ...(direction ? { sceneDrawerDirection: direction } : {})
      }),
      closeSceneDrawer: () => set({ sceneDrawerOpen: false, sceneDrawerId: null }),
      setSceneDrawerDirection: (dir) => set({ sceneDrawerDirection: dir }),

      // === ZOOM NAVIGATION ===
      drillInto: (type, id, screenplay) => {
        const zoomMap = { act: 1, sequence: 2, scene: 3, beat: 4 }
        const nextZoom = zoomMap[type] ?? 0
        if (nextZoom > ZOOM_LEVELS.BEAT) return

        let actNode = null
        let seqNode = null
        let scNode = null

        if (type === 'act') {
          actNode = screenplay?.acts?.find(a => a.id === id)
        } else if (type === 'sequence') {
          for (const a of (screenplay?.acts || [])) {
            const seq = a.sequences?.find(sq => sq.id === id)
            if (seq) { actNode = a; seqNode = seq; break }
          }
        } else if (type === 'scene' || type === 'beat') {
          for (const a of (screenplay?.acts || [])) {
            for (const seq of (a.sequences || [])) {
              const sc = seq.scenes?.find(x => x.id === id)
              if (sc) { actNode = a; seqNode = seq; scNode = sc; break }
            }
          }
        }

        const newPath = []
        if (actNode) newPath.push({ type: 'act', id: actNode.id, label: actNode.label || 'Act', zoom: 1 })
        if (seqNode) newPath.push({ type: 'sequence', id: seqNode.id, label: seqNode.label || 'Sequence', zoom: 2 })
        if (scNode) newPath.push({ type: 'scene', id: scNode.id, label: scNode.heading || 'Scene', zoom: 3 })
        if (type === 'beat') newPath.push({ type: 'beat', id: id, label: 'Beat', zoom: 4 })

        set({
          zoom: nextZoom,
          activeUnitId: id,
          zoomPath: newPath
        })
      },

      drillOut: (toZoom) => {
        const s = get()
        const targetZoom = toZoom ?? Math.max(0, s.zoom - 1)
        const newPath = s.zoomPath.filter(p => p.zoom <= targetZoom)
        const lastEntry = newPath[newPath.length - 1]
        set({
          zoom: targetZoom,
          zoomPath: newPath,
          activeUnitId: lastEntry?.id || null
        })
      },

      goToUnit: (type, id, screenplay) => {
        const zoomMap = { act: 1, sequence: 2, scene: 3, beat: 4 }
        const targetZoom = zoomMap[type] ?? 0

        let actNode = null
        let seqNode = null
        let scNode = null

        if (type === 'act') {
          actNode = screenplay?.acts?.find(a => a.id === id)
        } else if (type === 'sequence') {
          for (const a of (screenplay?.acts || [])) {
            const seq = a.sequences?.find(sq => sq.id === id)
            if (seq) { actNode = a; seqNode = seq; break }
          }
        } else if (type === 'scene' || type === 'beat') {
          for (const a of (screenplay?.acts || [])) {
            for (const seq of (a.sequences || [])) {
              const sc = seq.scenes?.find(x => x.id === id)
              if (sc) { actNode = a; seqNode = seq; scNode = sc; break }
            }
          }
        }

        const newPath = []
        if (actNode) newPath.push({ type: 'act', id: actNode.id, label: actNode.label || 'Act', zoom: 1 })
        if (seqNode) newPath.push({ type: 'sequence', id: seqNode.id, label: seqNode.label || 'Sequence', zoom: 2 })
        if (scNode) newPath.push({ type: 'scene', id: scNode.id, label: scNode.heading || 'Scene', zoom: 3 })
        if (type === 'beat') newPath.push({ type: 'beat', id: id, label: 'Beat', zoom: 4 })

        set({ zoom: targetZoom, zoomPath: newPath, activeUnitId: id })
      },

      // Reset all UI state
      resetUI: () => set({
        zoom: ZOOM_LEVELS.FULL_SCRIPT,
        zoomPath: [],
        activeUnitId: null,
        sceneDrawerOpen: false,
        sceneDrawerId: null,
        wizardStep: 0,
      }),
    }),
    {
      name: 'fractal-ui-store',
      // NOTE: wizardStep is intentionally excluded — session-only, must not persist
      partialize: (s) => ({
        theme: s.theme,
        lens: s.lens,
        viewType: s.viewType,
        colorMode: s.colorMode,
        sceneDrawerDirection: s.sceneDrawerDirection,
      })
    }
  )
)

export default useUIStore
