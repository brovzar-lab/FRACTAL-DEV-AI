import useScreenplayStore from '../../store/screenplayStore'
import TaskList from '../tasks/TaskList'
import NotesPanel from './NotesPanel'
import EppsPassPanel from './EppsPassPanel'
import AIGuidePanel from './AIGuidePanel'

const TABS = [
  { id: 'guide',  label: 'Guide ✦' },
  { id: 'tasks',  label: 'Tasks' },
  { id: 'passes', label: 'Passes' },
  { id: 'notes',  label: 'Notes' },
]

export default function AIPanel() {
  const { panelTab, setPanelTab, tasks, eppsPasses } = useScreenplayStore()
  const openTasks = tasks.filter(t => t.status !== 'done').length
  const activePasses = eppsPasses.filter(p => p.status === 'active').length

  // Legacy migration: 'diagnosis' was the old tab id; treat it as 'guide'
  const activeTab = panelTab === 'diagnosis' ? 'guide' : panelTab

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div className="tab-bar" style={{ flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
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
        {activeTab === 'guide'  && <AIGuidePanel />}
        {activeTab === 'tasks'  && <TaskList />}
        {activeTab === 'passes' && <EppsPassPanel />}
        {activeTab === 'notes'  && <NotesPanel />}
      </div>
    </div>
  )
}
