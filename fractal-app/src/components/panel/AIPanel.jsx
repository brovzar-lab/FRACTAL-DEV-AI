import { useState } from 'react'
import useScreenplayStore from '../../store/screenplayStore'
import TaskList from '../tasks/TaskList'
import DiagnosisPanel from './DiagnosisPanel'
import NotesPanel from './NotesPanel'

const TABS = [
  { id: 'diagnosis', label: 'Analysis' },
  { id: 'tasks',     label: 'Tasks' },
  { id: 'notes',     label: 'Notes' },
]

export default function AIPanel() {
  const { panelTab, setPanelTab, tasks } = useScreenplayStore()
  const openTasks = tasks.filter(t => t.status !== 'done').length

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
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {panelTab === 'diagnosis' && <DiagnosisPanel />}
        {panelTab === 'tasks'     && <TaskList />}
        {panelTab === 'notes'     && <NotesPanel />}
      </div>
    </div>
  )
}
