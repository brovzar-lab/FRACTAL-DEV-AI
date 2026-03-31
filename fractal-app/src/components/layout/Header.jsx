import { PanelLeftOpen, PanelLeftClose, Moon, Sun, Upload, ArrowLeft } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'
import UploadModal from '../upload/UploadModal'
import { useState } from 'react'

export default function Header() {
  const { toggleTheme, toggleSidebar, sidebarOpen, theme, screenplay, closeProject } = useScreenplayStore()
  const [showUpload, setShowUpload] = useState(false)

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
    </>
  )
}

