import { useEffect, useState, useCallback, useRef } from 'react'
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
import SnapshotView from '../../views/SnapshotView'
import ColorModeSelector from './ColorModeSelector'
import ErrorBoundary from '../shared/ErrorBoundary'

export default function AppShell() {
  const { sidebarOpen, screenplay, activeProjectId, viewType } = useScreenplayStore()
  const setWizardStep = useUIStore(s => s.setWizardStep)

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(220) // matches --sidebar-width default
  const isDragging = useRef(false)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      // Calculate width from left edge of viewport (sidebar starts at x=0)
      const newWidth = Math.max(160, Math.min(400, e.clientX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  // Auto-start wizard for fresh uploads (no existing snapshot)
  useEffect(() => {
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
    <div className="app-shell" role="application" aria-label="Fractal screenplay editor">
      <Header />
      <DemoBanner />
      <div className="app-body">
        {/* Left Rail — Script Tree (resizable) */}
        {sidebarOpen && (
          <>
            <nav className="app-sidebar" style={{ width: sidebarWidth }} aria-label="Script navigator">
              <ScriptTree />
            </nav>
            {/* Drag handle for resize */}
            <div
              className="sidebar-resize-handle"
              onMouseDown={handleMouseDown}
              role="separator"
              aria-label="Resize sidebar"
              aria-orientation="vertical"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setSidebarWidth(w => Math.max(160, w - 20))
                if (e.key === 'ArrowRight') setSidebarWidth(w => Math.min(400, w + 20))
              }}
            />
          </>
        )}

        {/* Center — Canvas or Alternative View */}
        <main className="app-canvas" aria-label="Screenplay analysis canvas">
          {isFractalView ? (
            <>
              <ZoomBar />
              <LensSelector />
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ErrorBoundary title="View failed to render">
                  <FractalCanvas />
                </ErrorBoundary>
              </div>
            </>
          ) : (
            <>
              {/* Shared toolbar for non-fractal views */}
              <div
                role="toolbar"
                aria-label="View controls"
                style={{
                  height: 'var(--zoombar-height)',
                  background: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-default)',
                  display: 'flex', alignItems: 'center',
                  padding: '0 16px', gap: 8, flexShrink: 0,
                }}
              >
                <LensSelector />
                <div style={{ flex: 1 }} />
                <ColorModeSelector />
              </div>
              <ErrorBoundary title="View failed to render">
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {viewType === 'snapshot' && <SnapshotView />}
                  {viewType === 'board' && <BoardView />}
                  {viewType === 'timeline' && <TimelineView />}
                  {viewType === 'outline' && <OutlineView />}
                </div>
              </ErrorBoundary>
            </>
          )}
        </main>

        {/* Right — AI Analysis Panel */}
        <aside className="app-panel" aria-label="AI analysis panel">
          <AIPanel />
        </aside>
      </div>

      {/* Scene Slide-Out Drawer — overlays everything */}
      <SceneDrawer />
      <WizardShell />
    </div>
  )
}
