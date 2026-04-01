import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveScreenplayDebounced, loadScreenplay, deleteScreenplay as deleteFromFirestore } from '../services/firestoreSync'

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
                workflowStatus: 'untouched',
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
                notes: [], tasks: [], beats: [], edits: [],
                changelog: [], contentHash: null, dismissedFlags: [],
              },
              {
                id: 'sc-002', heading: 'EXT. FARMHOUSE - DAWN', pageRange: [3,5],
                synopsis: 'C watches M leave for work. He cannot speak to her.',
                characters: ['C', 'M'],
                workflowStatus: 'untouched',
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
                notes: [], tasks: [], beats: [], edits: [],
                changelog: [], contentHash: null, dismissedFlags: [],
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
                workflowStatus: 'untouched',
                diagnostics: { status: 'pass', beatQuestion: 'Will C let them stay?', hasProtagonist: true, bPresent: true, mPresent: true, oPresent: true, cPresent: true, valueShift: true },
                text: `INT. FARMHOUSE - DAY

A MOVING TRUCK out front. New tenants — a young family — carry boxes through the door.

C sits in what used to be his chair.

The father walks THROUGH C without flinching.

                              C
                    This is my house.

Nobody hears. Nobody ever hears.

The family arranges furniture around the ghost who used to live here.`,
                notes: [], tasks: [], beats: [], edits: [],
                changelog: [], contentHash: null, dismissedFlags: [],
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
                workflowStatus: 'untouched',
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
                tasks: [], beats: [], edits: [],
                changelog: [], contentHash: null, dismissedFlags: [],
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

// === Project Store ===
const useProjectStore = create(
  persist(
    (set, get) => ({
      // State
      activeProjectId: null,
      isLoading: false,

      // Open a project from Firestore
      openProject: async (projectId, setScreenplayState) => {
        set({ isLoading: true })
        try {
          const data = await loadScreenplay(projectId)
          if (data?.screenplay) {
            set({ activeProjectId: projectId, isLoading: false })
            if (setScreenplayState) setScreenplayState(data)
            console.log('[ProjectStore] Opened project:', data.screenplay.title)
            return true
          }
          set({ isLoading: false })
          return false
        } catch (e) {
          console.warn('[ProjectStore] Failed to open project:', e.message)
          set({ isLoading: false })
          return false
        }
      },

      // Close current project
      closeProject: () => {
        set({ activeProjectId: null })
      },

      // Delete a project from Firestore
      deleteProject: async (projectId) => {
        const success = await deleteFromFirestore(projectId)
        if (success && get().activeProjectId === projectId) {
          get().closeProject()
        }
        return success
      },

      // Open demo
      openDemoProject: () => {
        const demo = createDemoScreenplay()
        set({ activeProjectId: demo.id })
        return { screenplay: demo, tasks: [...DEMO_TASKS] }
      },

      setLoading: (v) => set({ isLoading: v }),
    }),
    {
      name: 'fractal-project-store',
      partialize: () => ({}) // nothing to persist for now
    }
  )
)

export default useProjectStore
export { createDemoScreenplay, DEMO_TASKS }
