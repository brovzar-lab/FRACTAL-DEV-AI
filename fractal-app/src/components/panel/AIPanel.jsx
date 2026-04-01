import { useState } from 'react'
import useScreenplayStore from '../../store/screenplayStore'
import TaskList from '../tasks/TaskList'
import DiagnosisPanel from './DiagnosisPanel'
import NotesPanel from './NotesPanel'
import DualLensPanel from './DualLensPanel'
import BatchAnalysis from './BatchAnalysis'
import EppsPassPanel from './EppsPassPanel'

const TABS = [
  { id: 'diagnosis', label: 'Analysis' },
  { id: 'tasks',     label: 'Tasks' },
  { id: 'passes',    label: 'Passes' },
  { id: 'notes',     label: 'Notes' },
]

export default function AIPanel() {
  const { panelTab, setPanelTab, tasks, eppsPasses, activePassId } = useScreenplayStore()
  const openTasks = tasks.filter(t => t.status !== 'done').length
  const activePasses = eppsPasses.filter(p => p.status === 'active').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div className="tab-bar" style={{ flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${panelTab === tab.id ? 'active' : ''}`}
            onClick={() => setPanelTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'tasks' && openTasks > 0 && (
              <span style={{
                marginLeft: 4, background: 'var(--accent-primary)',
                color: '#fff', borderRadius: 10,
                padding: '0 5px', fontSize: '0.6rem', fontWeight: 700
              }}>
                {openTasks}
              </span>
            )}
            {tab.id === 'passes' && activePasses > 0 && (
              <span style={{
                marginLeft: 4, background: '#C09A30',
                color: '#fff', borderRadius: 10,
                padding: '0 5px', fontSize: '0.6rem', fontWeight: 700
              }}>
                {activePasses}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {panelTab === 'diagnosis' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Batch Analysis at top */}
            <div style={{ flexShrink: 0, paddingTop: 10 }}>
              <BatchAnalysis />
            </div>
            {/* Main analysis */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <DiagnosisPanel />
              {/* Dual-lens comparison (appears below analysis) */}
              <DualLensPanel />
            </div>
          </div>
        )}
        {panelTab === 'tasks'     && <TaskList />}
        {panelTab === 'passes'    && <EppsPassPanel />}
        {panelTab === 'notes'     && <NotesPanel />}
      </div>
    </div>
  )
}
