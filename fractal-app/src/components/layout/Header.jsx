import { PanelLeftOpen, PanelLeftClose, Moon, Sun, Upload, ArrowLeft, LayoutGrid, Clock, List, Layers, PanelRight, PanelBottom, PanelLeft, RefreshCw, BarChart2, Settings } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'
import UploadModal from '../upload/UploadModal'
import { useState } from 'react'

const VIEW_OPTIONS = [
  { id: 'fractal',  label: 'Fractal',  icon: Layers,     short: 'F' },
  { id: 'snapshot', label: 'Snapshot', icon: BarChart2,   short: 'S' },
  { id: 'board',    label: 'Board',    icon: LayoutGrid,  short: 'B' },
  { id: 'timeline', label: 'Timeline', icon: Clock,       short: 'T' },
  { id: 'outline',  label: 'Outline',  icon: List,        short: 'O' },
]

const DRAWER_OPTIONS = [
  { id: 'right',  icon: PanelRight,  label: 'Right panel' },
  { id: 'bottom', icon: PanelBottom, label: 'Bottom panel' },
  { id: 'left',   icon: PanelLeft,   label: 'Left panel' },
]

export default function Header() {
  const { toggleTheme, toggleSidebar, sidebarOpen, theme, screenplay, closeProject, viewType, setViewType, sceneDrawerDirection, setSceneDrawerDirection } = useScreenplayStore()
  const [showUpload, setShowUpload] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showDrawerPicker, setShowDrawerPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <header className="app-header" style={{ justifyContent: 'space-between' }}>
        {/* Left: logo + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Back to projects */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={closeProject}
            title="Back to projects"
            style={{ color: 'rgba(232,229,222,0.6)' }}
          >
            <ArrowLeft size={16} />
          </button>

          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleSidebar}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{ color: 'rgba(232,229,222,0.6)' }}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Fractal brand mark */}
            <div style={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, #1B4F8A 0%, #7B4F9E 100%)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-editorial)' }}>F</span>
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-editorial)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                lineHeight: 1.1
              }}>
                Fractal-AI
              </div>
              <div style={{ color: 'rgba(232,229,222,0.45)', fontSize: '0.65rem', lineHeight: 1 }}>
                Screenplay Surgery Suite
              </div>
            </div>
          </div>

          {screenplay && (
            <div style={{
              marginLeft: 12,
              paddingLeft: 12,
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(232,229,222,0.7)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-editorial)',
              fontStyle: 'italic'
            }}>
              {screenplay.title}
            </div>
          )}

          {/* View Switcher — only show when in a project */}
          {screenplay && (
            <div style={{
              marginLeft: 12,
              paddingLeft: 12,
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: 2,
              alignItems: 'center'
            }}>
              {VIEW_OPTIONS.map(v => {
                const Icon = v.icon
                const isActive = viewType === v.id
                return (
                  <button
                    key={v.id}
                    className="btn btn-ghost btn-sm"
                    onClick={() => setViewType(v.id)}
                    title={v.label}
                    style={{
                      padding: '4px 8px',
                      gap: 4,
                      color: isActive ? '#fff' : 'rgba(232,229,222,0.45)',
                      background: isActive ? 'rgba(27,79,138,0.35)' : 'transparent',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={13} />
                    <span style={{ display: 'none' }}>{v.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Upload / New Script */}
          <button
            className="btn btn-sm"
            onClick={() => setShowUpload(true)}
            style={{
              background: 'rgba(27,79,138,0.8)',
              color: '#fff',
              borderColor: 'rgba(27,79,138,0.4)',
              gap: 5
            }}
          >
            <Upload size={13} />
            New Script
          </button>

          {/* Switch project */}
          <button
            className="btn btn-sm btn-ghost"
            onClick={closeProject}
            style={{
              color: 'rgba(232,229,222,0.6)',
              gap: 5
            }}
          >
            <ArrowLeft size={13} />
            Projects
          </button>

          {/* Scene Drawer Direction picker */}
          {screenplay && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowDrawerPicker(!showDrawerPicker)}
                title={`Scene panel: ${sceneDrawerDirection}`}
                style={{ color: 'rgba(232,229,222,0.6)' }}
              >
                {sceneDrawerDirection === 'right' ? <PanelRight size={15} /> : sceneDrawerDirection === 'bottom' ? <PanelBottom size={15} /> : <PanelLeft size={15} />}
              </button>
              {showDrawerPicker && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-raised)',
                  padding: 4, zIndex: 200, display: 'flex', gap: 2
                }}>
                  {DRAWER_OPTIONS.map(d => {
                    const DIcon = d.icon
                    return (
                      <button
                        key={d.id}
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setSceneDrawerDirection(d.id); setShowDrawerPicker(false) }}
                        title={d.label}
                        style={{
                          padding: '5px 7px',
                          background: sceneDrawerDirection === d.id ? 'var(--accent-primary)' : 'transparent',
                          color: sceneDrawerDirection === d.id ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        <DIcon size={14} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
              style={{ color: 'rgba(232,229,222,0.6)' }}
            >
              <Settings size={15} />
            </button>
            {showSettings && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-raised)',
                padding: 16, zIndex: 200, width: 260,
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Settings
                </div>

                {/* Theme */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '0.8rem' }}>Theme</span>
                  <button onClick={toggleTheme} className="btn btn-sm btn-ghost" style={{ gap: 5, fontSize: '0.75rem' }}>
                    {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>

                {/* Scene panel direction */}
                {screenplay && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                    <span style={{ fontSize: '0.8rem' }}>Scene panel</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {DRAWER_OPTIONS.map(d => {
                        const DIcon = d.icon
                        return (
                          <button
                            key={d.id}
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSceneDrawerDirection(d.id)}
                            title={d.label}
                            style={{
                              padding: '4px 6px',
                              background: sceneDrawerDirection === d.id ? 'var(--accent-primary)' : 'transparent',
                              color: sceneDrawerDirection === d.id ? '#fff' : 'var(--text-secondary)',
                            }}
                          >
                            <DIcon size={13} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Default view */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '0.8rem' }}>Default view</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{viewType}</span>
                </div>

                {/* Auto-analyze */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '0.8rem' }}>Auto-analyze</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>On</span>
                </div>

                {/* Replace Script */}
                {screenplay && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                    <span style={{ fontSize: '0.8rem' }}>Replace Script</span>
                    <button
                      onClick={() => { setShowReplace(true); setShowSettings(false) }}
                      className="btn btn-sm btn-ghost"
                      style={{ gap: 5, fontSize: '0.75rem' }}
                    >
                      <RefreshCw size={13} /> Upload
                    </button>
                  </div>
                )}

                {/* API status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ fontSize: '0.8rem' }}>AI Engine</span>
                  <span style={{ fontSize: '0.7rem', color: '#2A7D6F', fontWeight: 500 }}>Claude Sonnet</span>
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            title="Toggle theme"
            style={{ color: 'rgba(232,229,222,0.6)' }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {showReplace && <UploadModal onClose={() => setShowReplace(false)} replaceMode />}
    </>
  )
}

