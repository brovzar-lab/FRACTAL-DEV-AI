/**
 * screenplayStore.js — COMPATIBILITY SHIM
 * 
 * This file now delegates to 4 sub-stores:
 *   - projectStore  (lobby, open/close/delete)
 *   - uiStore       (zoom, lens, panelTab, sidebar, colorMode, viewType, sceneDrawer)
 *   - analysisStore (AI analysis cache, stale detection, batch)
 *   - scriptStore   (screenplay data, scene mutations, tasks, notes — this file)
 * 
 * The default export `useScreenplayStore` is a unified hook that merges
 * all sub-store state + actions into a single object, so existing consumers
 * (20+ components) continue working without any import changes.
 * 
 * New code should import specific stores directly for clarity.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'
import useProjectStore, { createDemoScreenplay, DEMO_TASKS } from './projectStore'
import useUIStore, { ZOOM_LEVELS, ZOOM_LABELS, LENSES, SCENE_STATUSES, COLOR_MODES, VIEW_TYPES } from './uiStore'
import useAnalysisStore from './analysisStore'
import { saveScreenplayDebounced } from '../services/firestoreSync'

// Re-export constants for backward compatibility
export { ZOOM_LEVELS, ZOOM_LABELS, LENSES, SCENE_STATUSES, COLOR_MODES, VIEW_TYPES }

export const TASK_PRIORITIES = ['P1', 'P2', 'P3']
export const TASK_STATUSES = ['open', 'in-progress', 'done']

// === Epps Pass Types (methodology-per-pass from user input) ===
export const EPPS_PASS_TYPES = [
  { id: 'foundation',    label: 'Foundation',    methodology: 'bmoc',       description: 'Protagonist want, stakes, central conflict, ticking clock' },
  { id: 'character',     label: 'Character',     methodology: 'weiland',    description: 'Arcs, psychology, lie/truth, ghost/wound' },
  { id: 'structure',     label: 'Structure',     methodology: 'save-cat',   description: 'STC 15-beat structure, act turning points, midpoint' },
  { id: 'dialogue',      label: 'Dialogue',      methodology: 'bmoc',       description: 'Tactics, subtext, voice distinctiveness' },
  { id: 'scene',         label: 'Scene',         methodology: 'story-grid', description: 'Pacing, tension, value shifts, turning points' },
  { id: 'relationships', label: 'Relationships', methodology: 'lyons',      description: 'Character web, power dynamics, emotional beats' },
  { id: 'theme',         label: 'Theme',         methodology: 'story-grid', description: 'Thematic statement, controlled idea, motifs' },
  { id: 'world',         label: 'World',         methodology: 'story-grid', description: 'Setting, rules, genre conventions, tone' },
  { id: 'setpiece',      label: 'Set Pieces',    methodology: 'bmoc',       description: 'Spectacle moments, visual storytelling, cinematic beats' },
]

// === Content Hash Utility ===
function computeContentHash(text) {
  if (!text) return null
  // Simple djb2 hash — fast, deterministic, sufficient for stale detection
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

// === Script Store (screenplay data, tasks, notes, scene mutations) ===
const useScriptStore = create(
  (set, get) => ({
    screenplay: null,
    tasks: [],

    // Epps Pass System
    eppsPasses: [],           // Array of planned passes
    activePassId: null,       // Currently active pass (one at a time)

    // Set screenplay (from open project or upload)
    setScreenplay: (screenplay, tasks = []) => {
      // Ensure new data model fields exist on all scenes
      const enriched = enrichScreenplay(screenplay)
      set({ screenplay: enriched, tasks })
    },

    // Clear screenplay 
    clearScreenplay: () => set({ screenplay: null, tasks: [], eppsPasses: [], activePassId: null }),

    // === Scene Mutations ===

    // Update scene text with auto-save changelog session
    updateSceneText: (sceneId, newText) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          const scene = seq.scenes.find(sc => sc.id === sceneId)
          if (scene) {
            if (!scene.originalText) scene.originalText = scene.text
            scene.edits.push({ text: newText, savedAt: new Date().toISOString() })
            scene.text = newText
            scene.contentHash = computeContentHash(newText)
            // Auto-transition from 'untouched' to 'in-progress' on first edit
            if (scene.workflowStatus === 'untouched') {
              scene.workflowStatus = 'in-progress'
            }
            break
          }
        }
      }
      set({ screenplay })
    },

    // Update scene workflow status
    setSceneStatus: (sceneId, status) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          const scene = seq.scenes.find(sc => sc.id === sceneId)
          if (scene) {
            scene.workflowStatus = status
            break
          }
        }
      }
      set({ screenplay })
    },

    // Dismiss an AI flag for a scene
    dismissFlag: (sceneId, flagType) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          const scene = seq.scenes.find(sc => sc.id === sceneId)
          if (scene) {
            if (!scene.dismissedFlags) scene.dismissedFlags = []
            if (!scene.dismissedFlags.includes(flagType)) {
              scene.dismissedFlags.push(flagType)
            }
            break
          }
        }
      }
      set({ screenplay })
    },

    // Un-dismiss a flag
    undismissFlag: (sceneId, flagType) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          const scene = seq.scenes.find(sc => sc.id === sceneId)
          if (scene) {
            scene.dismissedFlags = (scene.dismissedFlags || []).filter(f => f !== flagType)
            break
          }
        }
      }
      set({ screenplay })
    },

    // Session-based changelog: start a new session when scene is opened
    startEditSession: (sceneId) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          const scene = seq.scenes.find(sc => sc.id === sceneId)
          if (scene) {
            if (!scene.changelog) scene.changelog = []
            scene.changelog.push({
              id: `cl-${Date.now()}`,
              startedAt: new Date().toISOString(),
              endedAt: null,
              textBefore: scene.text,
              textAfter: null,
            })
            break
          }
        }
      }
      set({ screenplay })
    },

    // Finalize edit session when navigating away
    endEditSession: (sceneId) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          const scene = seq.scenes.find(sc => sc.id === sceneId)
          if (scene && scene.changelog?.length > 0) {
            const lastSession = scene.changelog[scene.changelog.length - 1]
            if (!lastSession.endedAt) {
              lastSession.endedAt = new Date().toISOString()
              lastSession.textAfter = scene.text
              // If no actual changes, remove the empty session entry
              if (lastSession.textBefore === lastSession.textAfter) {
                scene.changelog.pop()
              }
            }
            break
          }
        }
      }
      set({ screenplay })
    },

    // Move scene to different sequence (DND support)
    moveScene: (sceneId, fromSeqId, toSeqId, newIndex) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      let movedScene = null

      // Remove from source
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          if (seq.id === fromSeqId) {
            const idx = seq.scenes.findIndex(sc => sc.id === sceneId)
            if (idx !== -1) {
              movedScene = seq.scenes.splice(idx, 1)[0]
            }
            break
          }
        }
      }

      // Insert into target
      if (movedScene) {
        for (const act of screenplay.acts) {
          for (const seq of act.sequences) {
            if (seq.id === toSeqId) {
              seq.scenes.splice(newIndex, 0, movedScene)
              break
            }
          }
        }
      }

      // Clean up empty sequences
      for (const act of screenplay.acts) {
        act.sequences = act.sequences.filter(seq => seq.scenes.length > 0)
      }

      set({ screenplay })
    },

    // Reorder scenes within a sequence
    reorderScenes: (seqId, sceneIds) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          if (seq.id === seqId) {
            const sceneMap = new Map(seq.scenes.map(sc => [sc.id, sc]))
            seq.scenes = sceneIds.map(id => sceneMap.get(id)).filter(Boolean)
            break
          }
        }
      }
      set({ screenplay })
    },

    // === Tasks ===
    addTask: (task) => set(s => ({
      tasks: [...s.tasks, { ...task, id: `t-${Date.now()}`, createdAt: new Date().toISOString().slice(0,10) }]
    })),
    updateTask: (id, updates) => set(s => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    })),
    deleteTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
    reorderTasks: (tasks) => set({ tasks }),

    // === Notes ===
    addNote: (sceneId, note) => {
      const s = get()
      const screenplay = JSON.parse(JSON.stringify(s.screenplay))
      for (const act of screenplay.acts) {
        for (const seq of act.sequences) {
          const scene = seq.scenes.find(sc => sc.id === sceneId)
          if (scene) {
            scene.notes.push({ id: `n-${Date.now()}`, createdAt: new Date().toISOString().slice(0,10), ...note })
            break
          }
        }
      }
      set({ screenplay })
    },

    // === Epps Pass System ===
    createPass: (passType) => {
      const def = EPPS_PASS_TYPES.find(p => p.id === passType)
      if (!def) return
      const pass = {
        id: `pass-${Date.now()}`,
        type: passType,
        label: def.label,
        methodology: def.methodology,
        description: def.description,
        status: 'planned', // planned | active | completed
        createdAt: new Date().toISOString(),
        completedAt: null,
        focusNotes: [],      // AI-generated guidance for this pass
        linkedTaskIds: [],   // task IDs linked to this pass
        scopeSceneIds: [],   // scenes in scope for this pass (empty = all)
        summary: null,       // completion summary
      }
      set(s => ({ eppsPasses: [...s.eppsPasses, pass] }))
      return pass
    },

    activatePass: (passId) => set(s => ({
      activePassId: passId,
      eppsPasses: s.eppsPasses.map(p =>
        p.id === passId ? { ...p, status: 'active' } : p.status === 'active' ? { ...p, status: 'planned' } : p
      )
    })),

    completePass: (passId, summary) => set(s => ({
      activePassId: s.activePassId === passId ? null : s.activePassId,
      eppsPasses: s.eppsPasses.map(p =>
        p.id === passId ? { ...p, status: 'completed', completedAt: new Date().toISOString(), summary } : p
      )
    })),

    deletePass: (passId) => set(s => ({
      activePassId: s.activePassId === passId ? null : s.activePassId,
      eppsPasses: s.eppsPasses.filter(p => p.id !== passId)
    })),

    updatePass: (passId, updates) => set(s => ({
      eppsPasses: s.eppsPasses.map(p => p.id === passId ? { ...p, ...updates } : p)
    })),

    // Set the chosen methodology/lens for this project
    setMethodology: (methodologyId) => {
      set(s => ({
        screenplay: s.screenplay ? { ...s.screenplay, methodology: methodologyId } : s.screenplay
      }))
    },

    // Save full-script snapshot to screenplay object.
    // The auto-save subscription picks this up and persists to Firestore automatically.
    saveSnapshot: (snapshotData) => {
      set(s => ({
        screenplay: s.screenplay ? {
          ...s.screenplay,
          snapshot: snapshotData,
          snapshotGeneratedAt: new Date().toISOString(),
        } : s.screenplay
      }))
    },
  })
)

// Ensure all scenes have new data model fields
function enrichScreenplay(screenplay) {
  if (!screenplay?.acts) return screenplay
  const sp = JSON.parse(JSON.stringify(screenplay))

  // ── NEW: top-level AI guide fields ──
  if (sp.methodology == null) sp.methodology = null           // string | null — chosen lens id e.g. 'story-grid'
  if (sp.snapshot == null) sp.snapshot = null                 // object | null — full-script snapshot from generateFullSnapshot()
  if (sp.snapshotGeneratedAt == null) sp.snapshotGeneratedAt = null  // ISO string | null — timestamp of last snapshot

  for (const act of sp.acts) {
    for (const seq of (act.sequences || [])) {
      for (const scene of (seq.scenes || [])) {
        if (!scene.workflowStatus) scene.workflowStatus = 'untouched'
        if (!scene.changelog) scene.changelog = []
        if (!scene.contentHash) scene.contentHash = computeContentHash(scene.text)
        if (!scene.dismissedFlags) scene.dismissedFlags = []
        if (!scene.beats) scene.beats = []
        if (!scene.notes) scene.notes = []
        if (!scene.edits) scene.edits = []
        if (!scene.tasks) scene.tasks = []
      }
    }
  }
  return sp
}


// ============================================================
// COMPATIBILITY SHIM — useScreenplayStore
// Merges all 4 sub-stores into one hook for backward compat
// ============================================================

function useScreenplayStore(selector) {
  const project = useProjectStore()
  const ui = useUIStore()
  const analysis = useAnalysisStore()
  const script = useScriptStore()

  // Build the merged state object
  const merged = useMemo(() => ({
    // -- Project state --
    activeProjectId: project.activeProjectId,
    isLoading: project.isLoading,

    // -- UI state --
    theme: ui.theme,
    zoom: ui.zoom,
    zoomPath: ui.zoomPath,
    activeUnitId: ui.activeUnitId,
    lens: ui.lens,
    sidebarOpen: ui.sidebarOpen,
    panelTab: ui.panelTab,
    viewType: ui.viewType,
    colorMode: ui.colorMode,
    sceneDrawerOpen: ui.sceneDrawerOpen,
    sceneDrawerId: ui.sceneDrawerId,
    sceneDrawerDirection: ui.sceneDrawerDirection,
    wizardStep: ui.wizardStep,

    // -- Script state --
    screenplay: script.screenplay,
    tasks: script.tasks,
    eppsPasses: script.eppsPasses,
    activePassId: script.activePassId,

    // -- Analysis state --
    analysisCache: analysis.analysisCache,
    batchRunning: analysis.batchRunning,
    batchProgress: analysis.batchProgress,
    snapshotCache: analysis.snapshotCache,
    snapshotStale: analysis.snapshotStale,

    // -- Actions (project) --
    closeProject: () => {
      project.closeProject()
      script.clearScreenplay()
      ui.resetUI()
      analysis.clearCache()
    },
    deleteProject: async (projectId) => {
      const success = await project.deleteProject(projectId)
      if (success && project.activeProjectId === projectId) {
        script.clearScreenplay()
        ui.resetUI()
        analysis.clearCache()
      }
      return success
    },
    openProject: async (projectId) => {
      project.setLoading(true)
      try {
        const { loadScreenplay } = await import('../services/firestoreSync')
        const data = await loadScreenplay(projectId)
        if (data?.screenplay) {
          project.openProject(projectId, null)
          // Don't use the callback — set state directly
          useProjectStore.setState({ activeProjectId: projectId, isLoading: false })
          script.setScreenplay(data.screenplay, data.tasks || [])
          ui.setLens(data.lens || 'story-grid')
          ui.resetUI()
          analysis.clearCache()
          console.log('[Store] Opened project:', data.screenplay.title)
          return true
        }
        project.setLoading(false)
        return false
      } catch (e) {
        console.warn('[Store] Failed to open project:', e.message)
        project.setLoading(false)
        return false
      }
    },
    openDemoProject: () => {
      const demo = createDemoScreenplay()
      useProjectStore.setState({ activeProjectId: demo.id, isLoading: false })
      script.setScreenplay(demo, [...DEMO_TASKS])
      ui.resetUI()
      analysis.clearCache()
    },

    // -- Actions (UI) --
    toggleTheme: ui.toggleTheme,
    toggleSidebar: ui.toggleSidebar,
    setLens: ui.setLens,
    setPanelTab: ui.setPanelTab,
    setViewType: ui.setViewType,
    setColorMode: ui.setColorMode,
    setLoading: project.setLoading,
    openSceneDrawer: ui.openSceneDrawer,
    closeSceneDrawer: ui.closeSceneDrawer,
    setSceneDrawerDirection: ui.setSceneDrawerDirection,
    setWizardStep: ui.setWizardStep,

    // -- Actions (zoom) — wrappers that pass screenplay for path calculation --
    drillInto: (type, id) => ui.drillInto(type, id, script.screenplay),
    drillOut: ui.drillOut,
    goToUnit: (type, id) => ui.goToUnit(type, id, script.screenplay),

    // -- Actions (script) --
    setScreenplay: (sp) => {
      if (!sp.id) sp.id = `proj-${Date.now()}`
      useProjectStore.setState({ activeProjectId: sp.id, isLoading: false })
      script.setScreenplay(sp)
      ui.resetUI()
      analysis.clearCache()
    },
    updateSceneText: script.updateSceneText,
    setSceneStatus: script.setSceneStatus,
    dismissFlag: script.dismissFlag,
    undismissFlag: script.undismissFlag,
    startEditSession: script.startEditSession,
    endEditSession: script.endEditSession,
    moveScene: script.moveScene,
    reorderScenes: script.reorderScenes,
    addNote: script.addNote,
    addTask: script.addTask,
    updateTask: script.updateTask,
    deleteTask: script.deleteTask,
    reorderTasks: script.reorderTasks,

    // -- Actions (script — AI guide) --
    setMethodology: script.setMethodology,
    saveSnapshot: script.saveSnapshot,

    // -- Actions (Epps) --
    createPass: script.createPass,
    activatePass: script.activatePass,
    completePass: script.completePass,
    deletePass: script.deletePass,
    updatePass: script.updatePass,

    // -- Actions (analysis) --
    cacheAnalysis: analysis.cacheAnalysis,
    isAnalysisStale: analysis.isAnalysisStale,
    invalidateCache: analysis.invalidateCache,
    invalidateSceneCache: analysis.invalidateSceneCache,
    clearCache: analysis.clearCache,
    startBatch: analysis.startBatch,
    updateBatchProgress: analysis.updateBatchProgress,
    endBatch: analysis.endBatch,
    setSnapshot: analysis.setSnapshot,
    markSnapshotStale: analysis.markSnapshotStale,
    clearSnapshot: analysis.clearSnapshot,

    // Legacy
    loadFromFirestore: async () => false,
  }), [project, ui, analysis, script])

  return selector ? selector(merged) : merged
}

// Static getState for non-React contexts (effects, callbacks)
useScreenplayStore.getState = () => {
  const project = useProjectStore.getState()
  const ui = useUIStore.getState()
  const analysis = useAnalysisStore.getState()
  const script = useScriptStore.getState()

  return {
    // State
    activeProjectId: project.activeProjectId,
    isLoading: project.isLoading,
    theme: ui.theme,
    zoom: ui.zoom,
    zoomPath: ui.zoomPath,
    activeUnitId: ui.activeUnitId,
    lens: ui.lens,
    sidebarOpen: ui.sidebarOpen,
    panelTab: ui.panelTab,
    viewType: ui.viewType,
    colorMode: ui.colorMode,
    sceneDrawerOpen: ui.sceneDrawerOpen,
    sceneDrawerId: ui.sceneDrawerId,
    sceneDrawerDirection: ui.sceneDrawerDirection,
    screenplay: script.screenplay,
    tasks: script.tasks,
    eppsPasses: script.eppsPasses,
    activePassId: script.activePassId,
    analysisCache: analysis.analysisCache,
    batchRunning: analysis.batchRunning,
    batchProgress: analysis.batchProgress,
    snapshotCache: analysis.snapshotCache,
    snapshotStale: analysis.snapshotStale,
    wizardStep: ui.wizardStep,

    // Actions (same as hook version)
    closeProject: () => {
      useProjectStore.getState().closeProject()
      useScriptStore.getState().clearScreenplay()
      useUIStore.getState().resetUI()
      useAnalysisStore.getState().clearCache()
    },
    deleteProject: async (projectId) => {
      const ps = useProjectStore.getState()
      const success = await ps.deleteProject(projectId)
      if (success && ps.activeProjectId === projectId) {
        useScriptStore.getState().clearScreenplay()
        useUIStore.getState().resetUI()
        useAnalysisStore.getState().clearCache()
      }
      return success
    },
    openProject: async (projectId) => {
      useProjectStore.getState().setLoading(true)
      try {
        const { loadScreenplay } = await import('../services/firestoreSync')
        const data = await loadScreenplay(projectId)
        if (data?.screenplay) {
          useProjectStore.setState({ activeProjectId: projectId, isLoading: false })
          useScriptStore.getState().setScreenplay(data.screenplay, data.tasks || [])
          useUIStore.getState().setLens(data.lens || 'story-grid')
          useUIStore.getState().resetUI()
          useAnalysisStore.getState().clearCache()
          return true
        }
        useProjectStore.getState().setLoading(false)
        return false
      } catch (e) {
        useProjectStore.getState().setLoading(false)
        return false
      }
    },
    openDemoProject: () => {
      const demo = createDemoScreenplay()
      useProjectStore.setState({ activeProjectId: demo.id, isLoading: false })
      useScriptStore.getState().setScreenplay(demo, [...DEMO_TASKS])
      useUIStore.getState().resetUI()
      useAnalysisStore.getState().clearCache()
    },
    toggleTheme: () => useUIStore.getState().toggleTheme(),
    toggleSidebar: () => useUIStore.getState().toggleSidebar(),
    setLens: (l) => useUIStore.getState().setLens(l),
    setPanelTab: (t) => useUIStore.getState().setPanelTab(t),
    setViewType: (v) => useUIStore.getState().setViewType(v),
    setColorMode: (c) => useUIStore.getState().setColorMode(c),
    setLoading: (v) => useProjectStore.getState().setLoading(v),
    openSceneDrawer: (id, dir) => useUIStore.getState().openSceneDrawer(id, dir),
    closeSceneDrawer: () => useUIStore.getState().closeSceneDrawer(),
    setSceneDrawerDirection: (d) => useUIStore.getState().setSceneDrawerDirection(d),
    setWizardStep: (step) => useUIStore.getState().setWizardStep(step),
    drillInto: (type, id) => useUIStore.getState().drillInto(type, id, useScriptStore.getState().screenplay),
    drillOut: (z) => useUIStore.getState().drillOut(z),
    goToUnit: (type, id) => useUIStore.getState().goToUnit(type, id, useScriptStore.getState().screenplay),
    setScreenplay: (sp) => {
      if (!sp.id) sp.id = `proj-${Date.now()}`
      useProjectStore.setState({ activeProjectId: sp.id, isLoading: false })
      useScriptStore.getState().setScreenplay(sp)
      useUIStore.getState().resetUI()
      useAnalysisStore.getState().clearCache()
    },
    updateSceneText: (id, t) => useScriptStore.getState().updateSceneText(id, t),
    setSceneStatus: (id, s) => useScriptStore.getState().setSceneStatus(id, s),
    dismissFlag: (id, f) => useScriptStore.getState().dismissFlag(id, f),
    undismissFlag: (id, f) => useScriptStore.getState().undismissFlag(id, f),
    startEditSession: (id) => useScriptStore.getState().startEditSession(id),
    endEditSession: (id) => useScriptStore.getState().endEditSession(id),
    moveScene: (...a) => useScriptStore.getState().moveScene(...a),
    reorderScenes: (...a) => useScriptStore.getState().reorderScenes(...a),
    addNote: (...a) => useScriptStore.getState().addNote(...a),
    addTask: (t) => useScriptStore.getState().addTask(t),
    updateTask: (id, u) => useScriptStore.getState().updateTask(id, u),
    deleteTask: (id) => useScriptStore.getState().deleteTask(id),
    reorderTasks: (t) => useScriptStore.getState().reorderTasks(t),
    setMethodology: (id) => useScriptStore.getState().setMethodology(id),
    saveSnapshot: (data) => useScriptStore.getState().saveSnapshot(data),
    createPass: (t) => useScriptStore.getState().createPass(t),
    activatePass: (id) => useScriptStore.getState().activatePass(id),
    completePass: (id, s) => useScriptStore.getState().completePass(id, s),
    deletePass: (id) => useScriptStore.getState().deletePass(id),
    updatePass: (id, u) => useScriptStore.getState().updatePass(id, u),
    cacheAnalysis: (...a) => useAnalysisStore.getState().cacheAnalysis(...a),
    isAnalysisStale: (...a) => useAnalysisStore.getState().isAnalysisStale(...a),
    invalidateCache: (k) => useAnalysisStore.getState().invalidateCache(k),
    invalidateSceneCache: (id) => useAnalysisStore.getState().invalidateSceneCache(id),
    clearCache: () => useAnalysisStore.getState().clearCache(),
    startBatch: (t) => useAnalysisStore.getState().startBatch(t),
    updateBatchProgress: (c, s) => useAnalysisStore.getState().updateBatchProgress(c, s),
    endBatch: () => useAnalysisStore.getState().endBatch(),
    setSnapshot: (...a) => useAnalysisStore.getState().setSnapshot(...a),
    markSnapshotStale: () => useAnalysisStore.getState().markSnapshotStale(),
    clearSnapshot: () => useAnalysisStore.getState().clearSnapshot(),
    loadFromFirestore: async () => false,
  }
}

// Subscribe — for auto-save to Firestore
useScriptStore.subscribe((state) => {
  const projectId = useProjectStore.getState().activeProjectId
  if (state.screenplay?.id && projectId) {
    saveScreenplayDebounced({
      screenplay: state.screenplay,
      tasks: state.tasks,
      lens: useUIStore.getState().lens,
    })
  }
})

export default useScreenplayStore
export { useProjectStore, useUIStore, useAnalysisStore, useScriptStore, computeContentHash }
