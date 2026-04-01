import { useEffect } from 'react'
import useScreenplayStore from '../../store/screenplayStore'
import useUIStore from '../../store/uiStore'
import ScriptTree from './ScriptTree'
import ZoomBar from './ZoomBar'
import LensSelector from './LensSelector'
import AIPanel from '../panel/AIPanel'
import Header from './Header'
import FractalCanvas from '../canvas/FractalCanvas'
import DemoBanner from '../shared/DemoBanner'
import ProjectLobby from '../../views/ProjectLobby'
import SceneDrawer from './SceneDrawer'
import WizardShell from '../wizard/WizardShell'
import BoardView from '../../views/BoardView'
import TimelineView from '../../views/TimelineView'
import OutlineView from '../../views/OutlineView'
import ColorModeSelector from './ColorModeSelector'

export default function AppShell() {
  const { sidebarOpen, screenplay, activeProjectId, viewType } = useScreenplayStore()
  const setWizardStep = useUIStore(s => s.setWizardStep)

  // Auto-start wizard for fresh uploads (no existing snapshot)
  useEffect(() => {
    // Read wizardStep live from the store, not from the closure
    // (dependency array is [screenplay?.id] so wizardStep is intentionally excluded)
    const currentWizardStep = useUIStore.getState().wizardStep
    if (screenplay && !screenplay.snapshot && currentWizardStep === 0) {
      setWizardStep(1)
    }
  }, [screenplay?.id])

  // No active project → show lobby
  if (!activeProjectId || !screenplay) {
    return <ProjectLobby />
  }

  // Determine if we show fractal canvas or an alternative view
  const isFractalView = viewType === 'fractal'

  return (
    <div className="app-shell">
      <Header />
      <DemoBanner />
      <div className="app-body">
        {/* Left Rail — Script Tree */}
        {sidebarOpen && (
          <div className="app-sidebar">
            <ScriptTree />
          </div>
        )}

        {/* Center — Canvas or Alternative View */}
        <div className="app-canvas">
          {isFractalView ? (
            <>
              <ZoomBar />
              <LensSelector />
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <FractalCanvas />
              </div>
            </>
          ) : (
            <>
              {/* Shared toolbar for non-fractal views */}
              <div style={{
                height: 'var(--zoombar-height)',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center',
                padding: '0 16px', gap: 8, flexShrink: 0,
              }}>
                <LensSelector />
                <div style={{ flex: 1 }} />
                <ColorModeSelector />
              </div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {viewType === 'board' && <BoardView />}
                {viewType === 'timeline' && <TimelineView />}
                {viewType === 'outline' && <OutlineView />}
              </div>
            </>
          )}
        </div>

        {/* Right — AI Analysis Panel */}
        <div className="app-panel">
          <AIPanel />
        </div>
      </div>

      {/* Scene Slide-Out Drawer — overlays everything */}
      <SceneDrawer />
      <WizardShell />
    </div>
  )
}
