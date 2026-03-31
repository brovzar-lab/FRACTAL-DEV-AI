import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { saveScreenplayDebounced, loadScreenplay, deleteScreenplay as deleteFromFirestore } from '../services/firestoreSync'

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

export const TASK_PRIORITIES = ['P1', 'P2', 'P3']
export const TASK_STATUSES = ['open', 'in-progress', 'done']

// === Demo Screenplay Factory ===
function createDemoScreenplay() {
  return {
    id: `demo-${Date.now()}`,
    title: 'DEMO: A GHOST STORY',
    pageCount: 94,
    genre: 'Drama / Speculative Fiction',
    uploadedAt: new Date().toISOString(),
    parsed: true,
    acts: [
      {
        id: 'act-1',
        label: 'Act I — Setup',
        pageRange: [1, 24],
        diagnostics: { status: 'pass', note: 'Strong inciting incident at p.12. Opening image establishes tone.' },
        sequences: [
          {
            id: 'seq-1-1',
            label: 'Seq 1: Ordinary World',
            thematicFunction: 'Establish protagonist wound and false belief',
            scenes: [
              {
                id: 'sc-001', heading: 'INT. FARMHOUSE - NIGHT', pageRange: [1,3],
                synopsis: 'C moves through the house he has always known, but something is different.',
                characters: ['C', 'M'],
                diagnostics: { status: 'pass', beatQuestion: 'Will C notice the silence?', hasProtagonist: true, bPresent: true, mPresent: true, oPresent: false, cPresent: true, valueShift: true },
                text: `INT. FARMHOUSE - NIGHT

The house is dark. Still. C (30s, quiet eyes) moves through the kitchen like he owns it. He does.

M (30s) reads by lamplight, doesn't look up.

                              C
                    House feels different.

M turns a page.

                              M
                    It's the same house.

C touches the wall. The paint is cold beneath his fingers.

                              C
                    Something's wrong.

He looks at his hands. Through them.

M is gone. The lamp is gone. The house is empty.

C has been dead for a while now.

CUT TO:`,
                notes: [], tasks: [], beats: [], edits: []
              },
              {
                id: 'sc-002', heading: 'EXT. FARMHOUSE - DAWN', pageRange: [3,5],
                synopsis: 'C watches M leave for work. He cannot speak to her.',
                characters: ['C', 'M'],
                diagnostics: { status: 'warn', beatQuestion: 'Can C get M\'s attention?', hasProtagonist: true, bPresent: true, mPresent: false, oPresent: true, cPresent: true, valueShift: false, notes: 'Middle (M) beat missing — scene needs complication before resolution.' },
                text: `EXT. FARMHOUSE - DAWN

M carries boxes to her car. She moves efficiently, like someone who has learned not to linger.

C follows her. Reaches for her shoulder.

His hand passes through.

She opens the car door. Gets in. Starts the engine.

                              C
                    Don't go yet.

The car backs out of the driveway.

C stands in the empty lot. The house behind him.

CUT TO:`,
                notes: [], tasks: [], beats: [], edits: []
              },
            ]
          },
          {
            id: 'seq-1-2',
            label: 'Seq 2: The Rules of Being Dead',
            thematicFunction: 'Force confrontation with new reality',
            scenes: [
              {
                id: 'sc-003', heading: 'INT. FARMHOUSE - DAY', pageRange: [5,9],
                synopsis: 'New tenants arrive. C watches them move into his home.',
                characters: ['C', 'TENANT 1', 'TENANT 2'],
                diagnostics: { status: 'pass', beatQuestion: 'Will C let them stay?', hasProtagonist: true, bPresent: true, mPresent: true, oPresent: true, cPresent: true, valueShift: true },
                text: `INT. FARMHOUSE - DAY

A MOVING TRUCK out front. New tenants — a young family — carry boxes through the door.

C sits in what used to be his chair.

The father walks THROUGH C without flinching.

                              C
                    This is my house.

Nobody hears. Nobody ever hears.

The family arranges furniture around the ghost who used to live here.`,
                notes: [], tasks: [], beats: [], edits: []
              },
            ]
          }
        ]
      },
      {
        id: 'act-2a',
        label: 'Act II-A — Rising Action',
        pageRange: [25, 52],
        diagnostics: { status: 'warn', note: 'Midpoint reversal arrives at p.54 — 2 pages late. Consider accelerating by cutting the hospital corridor sequence (p.48-51).' },
        sequences: [
          {
            id: 'seq-2-1',
            label: 'Seq 3: Haunting Without Purpose',
            thematicFunction: 'Protagonist tries old solutions to new problem',
            scenes: [
              {
                id: 'sc-004', heading: 'INT. KITCHEN - NIGHT', pageRange: [25,28],
                synopsis: 'C tries to communicate with M using objects. She doesn\'t notice.',
                characters: ['C','M'],
                diagnostics: { status: 'fail', beatQuestion: 'Can C break through?', hasProtagonist: true, bPresent: true, mPresent: true, oPresent: true, cPresent: false, valueShift: false, notes: 'Climax (C) beat absent — scene ends without resolution or reversal.' },
                text: `INT. KITCHEN - NIGHT

C pushes a coffee cup to the edge of the counter.

M sits at the table, writing something. Letters she will not send.

The cup teeters.

C pushes harder. The cup falls. Shatters.

M looks up. Looks at the cup. Looks back at her letter.

She gets up. Sweeps the pieces into the trash.

                              M
                    (to herself)
                    Not again.

She sits back down. Continues writing.

C watches.`,
                notes: [{ id: 'n-001', text: 'The cup is doing too much work. What does C FEEL when she sweeps it up without flinching?', createdAt: '2026-03-30', tag: 'character' }],
                tasks: [], beats: [], edits: []
              },
            ]
          }
        ]
      },
      {
        id: 'act-2b',
        label: 'Act II-B — Dark Night',
        pageRange: [53, 75],
        diagnostics: { status: 'pass', note: 'All Is Lost moment lands hard at p.68. Good use of genre inversion.' },
        sequences: []
      },
      {
        id: 'act-3',
        label: 'Act III — Resolution',
        pageRange: [76, 94],
        diagnostics: { status: 'warn', note: 'Resolution is earned emotionally but thematic statement is implicit. Consider one line that crystallizes the moral argument without spelling it out.' },
        sequences: []
      }
    ]
  }
}

const DEMO_TASKS = [
  {
    id: 't-001', priority: 'P1', status: 'open',
    level: 'scene', linkedId: 'sc-004',
    title: 'Add C beat to kitchen scene (sc-004)',
    description: 'Scene ends without a climax beat. Add a consequence to C\'s attempt — even invisible to M, it should shift C\'s value state.',
    createdAt: '2026-03-30'
  },
  {
    id: 't-002', priority: 'P2', status: 'open',
    level: 'act', linkedId: 'act-2a',
    title: 'Accelerate midpoint by 2 pages',
    description: 'Cut hospital corridor sequence (p.48–51). Midpoint reversal should land at p.52 not p.54.',
    createdAt: '2026-03-30'
  },
  {
    id: 't-003', priority: 'P2', status: 'open',
    level: 'scene', linkedId: 'sc-002',
    title: 'Add Middle beat to EXT. FARMHOUSE - DAWN',
    description: 'Scene has Beginning, Obstacle, Climax but skips the Middle complication. C needs an attempt that intensifies before resolution.',
    createdAt: '2026-03-30'
  },
  {
    id: 't-004', priority: 'P3', status: 'open',
    level: 'act', linkedId: 'act-3',
    title: 'Crystallize thematic statement in Act III',
    description: 'Resolution is emotionally earned. Add one line (action or dialogue, NOT voiceover) that makes the moral argument land without explanation.',
    createdAt: '2026-03-30'
  },
]

// === Zustand Store ===
const useScreenplayStore = create(
  persist(
    (set, get) => ({
      // State
      activeProjectId: null,  // null = show lobby, string = editing project
      screenplay: null,       // null until a project is opened
      zoom: ZOOM_LEVELS.FULL_SCRIPT,
      zoomPath: [],
      activeUnitId: null,
      lens: 'story-grid',
      tasks: [],
      isLoading: false,
      analysisCache: {},
      theme: 'light',
      sidebarOpen: true,
      panelTab: 'diagnosis',

      // Theme
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', next)
        set({ theme: next })
      },

      // === PROJECT MANAGEMENT ===

      // Open a project from Firestore
      openProject: async (projectId) => {
        set({ isLoading: true })
        try {
          const data = await loadScreenplay(projectId)
          if (data?.screenplay) {
            set({
              activeProjectId: projectId,
              screenplay: data.screenplay,
              tasks: data.tasks || [],
              lens: data.lens || 'story-grid',
              zoom: ZOOM_LEVELS.FULL_SCRIPT,
              zoomPath: [],
              activeUnitId: null,
              analysisCache: {},
              isLoading: false,
            })
            console.log('[Store] Opened project:', data.screenplay.title)
            return true
          }
          set({ isLoading: false })
          return false
        } catch (e) {
          console.warn('[Store] Failed to open project:', e.message)
          set({ isLoading: false })
          return false
        }
      },

      // Close current project → go back to lobby
      closeProject: () => {
        // Autosave fires via subscription, so just reset
        set({
          activeProjectId: null,
          screenplay: null,
          tasks: [],
          zoom: ZOOM_LEVELS.FULL_SCRIPT,
          zoomPath: [],
          activeUnitId: null,
          analysisCache: {},
        })
      },

      // Delete a project from Firestore
      deleteProject: async (projectId) => {
        const success = await deleteFromFirestore(projectId)
        // If we're currently editing the deleted project, close it
        if (success && get().activeProjectId === projectId) {
          get().closeProject()
        }
        return success
      },

      // Open demo screenplay as a new project
      openDemoProject: () => {
        const demo = createDemoScreenplay()
        set({
          activeProjectId: demo.id,
          screenplay: demo,
          tasks: [...DEMO_TASKS],
          zoom: ZOOM_LEVELS.FULL_SCRIPT,
          zoomPath: [],
          activeUnitId: null,
          analysisCache: {},
        })
      },

      // === ZOOM NAVIGATION ===

      drillInto: (type, id) => {
        const s = get()
        const zoomMap = { act: 1, sequence: 2, scene: 3, beat: 4 }
        const nextZoom = zoomMap[type] ?? 0
        if (nextZoom > ZOOM_LEVELS.BEAT) return

        let actNode = null
        let seqNode = null
        let scNode = null

        if (type === 'act') {
          actNode = s.screenplay?.acts?.find(a => a.id === id)
        } else if (type === 'sequence') {
          for (const a of (s.screenplay?.acts || [])) {
            const seq = a.sequences?.find(sq => sq.id === id)
            if (seq) { actNode = a; seqNode = seq; break }
          }
        } else if (type === 'scene' || type === 'beat') {
          for (const a of (s.screenplay?.acts || [])) {
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

      goToUnit: (type, id) => {
        const s = get()
        const zoomMap = { act: 1, sequence: 2, scene: 3, beat: 4 }
        const targetZoom = zoomMap[type] ?? 0
        
        let actNode = null
        let seqNode = null
        let scNode = null

        if (type === 'act') {
          actNode = s.screenplay?.acts?.find(a => a.id === id)
        } else if (type === 'sequence') {
          for (const a of (s.screenplay?.acts || [])) {
            const seq = a.sequences?.find(sq => sq.id === id)
            if (seq) { actNode = a; seqNode = seq; break }
          }
        } else if (type === 'scene' || type === 'beat') {
          for (const a of (s.screenplay?.acts || [])) {
            for (const seq of (a.sequences || [])) {
              const sc = seq.scenes?.find(x => x.id === id) // For 'beat', id is still the scene ID right now
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

      // Lens
      setLens: (lensId) => set({ lens: lensId }),

      // Tasks
      addTask: (task) => set(s => ({
        tasks: [...s.tasks, { ...task, id: `t-${Date.now()}`, createdAt: new Date().toISOString().slice(0,10) }]
      })),
      updateTask: (id, updates) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
      reorderTasks: (tasks) => set({ tasks }),

      // Notes — attach to scene
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

      // Scene edits
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
              break
            }
          }
        }
        set({ screenplay })
      },

      // Cache analysis
      cacheAnalysis: (unitId, data) => set(s => ({
        analysisCache: { ...s.analysisCache, [unitId]: { ...data, cached: new Date().toISOString() } }
      })),

      // Upload new screenplay (from UploadModal — creates a new project)
      setScreenplay: (screenplay) => {
        // Ensure it has an ID
        if (!screenplay.id) screenplay.id = `proj-${Date.now()}`
        set({
          activeProjectId: screenplay.id,
          screenplay,
          zoom: ZOOM_LEVELS.FULL_SCRIPT,
          zoomPath: [],
          activeUnitId: null,
          tasks: [],
          analysisCache: {}
        })
      },

      // Panel
      setPanelTab: (tab) => set({ panelTab: tab }),
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      setLoading: (v) => set({ isLoading: v }),

      // Legacy: loadFromFirestore (loads most recent)
      loadFromFirestore: async () => {
        // Now handled by openProject — keeping for backward compat
        return false
      },
    }),
    {
      name: 'fractal-ai-store',
      partialize: (s) => ({ theme: s.theme, lens: s.lens })
    }
  )
)

// Auto-save to Firestore when screenplay or tasks change
useScreenplayStore.subscribe(
  (state) => {
    if (state.screenplay?.id && state.activeProjectId) {
      saveScreenplayDebounced({
        screenplay: state.screenplay,
        tasks: state.tasks,
        lens: state.lens,
      })
    }
  }
)

export default useScreenplayStore

