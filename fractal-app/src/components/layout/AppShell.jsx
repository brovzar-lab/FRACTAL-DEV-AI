import { useState } from 'react'
import useScreenplayStore from '../../store/screenplayStore'
import ScriptTree from './ScriptTree'
import ZoomBar from './ZoomBar'
import LensSelector from './LensSelector'
import AIPanel from '../panel/AIPanel'
import Header from './Header'
import FractalCanvas from '../canvas/FractalCanvas'
import DemoBanner from '../shared/DemoBanner'
import ProjectLobby from '../../views/ProjectLobby'

export default function AppShell() {
  const { sidebarOpen, screenplay, activeProjectId } = useScreenplayStore()

  // No active project → show lobby
  if (!activeProjectId || !screenplay) {
    return <ProjectLobby />
  }

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

        {/* Center — Fractal Canvas */}
        <div className="app-canvas">
          <ZoomBar />
          <LensSelector />
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <FractalCanvas />
          </div>
        </div>

        {/* Right — AI Analysis Panel */}
        <div className="app-panel">
          <AIPanel />
        </div>
      </div>
    </div>
  )
}

