import { useState, useEffect } from 'react'
import { Upload, FileText, Clock, Trash2, Plus, Film, Sparkles, FolderOpen } from 'lucide-react'
import useScreenplayStore from '../store/screenplayStore'
import { listScreenplays } from '../services/firestoreSync'
import UploadModal from '../components/upload/UploadModal'

function timeAgo(date) {
  if (!date) return 'never'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProjectLobby() {
  const { openProject, openDemoProject, deleteProject, isLoading } = useScreenplayStore()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')

  // Load project list on mount
  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    const list = await listScreenplays()
    setProjects(list)
    setLoading(false)
  }

  async function handleDelete(e, projectId) {
    e.stopPropagation()
    if (deleteConfirm === projectId) {
      await deleteProject(projectId)
      setDeleteConfirm(null)
      loadProjects()
    } else {
      setDeleteConfirm(projectId)
      // Auto-clear after 3s
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const filtered = search
    ? projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : projects

  return (
    <div className="lobby">
      {/* Background pattern */}
      <div className="lobby-bg" />

      <div className="lobby-content">
        {/* Brand header */}
        <div className="lobby-brand">
          <div className="lobby-logo">
            <div className="lobby-logo-mark">
              <span>F</span>
            </div>
            <div>
              <h1 className="lobby-title">Fractal-AI</h1>
              <p className="lobby-subtitle">Screenplay Surgery Suite</p>
            </div>
          </div>
          <p className="lobby-tagline">
            AI-powered structural analysis for screenwriters. Upload a script, choose your lens, and operate.
          </p>
        </div>

        {/* Search + Actions */}
        {projects.length > 3 && (
          <div className="lobby-search">
            <input
              type="text"
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="lobby-search-input"
            />
          </div>
        )}

        {/* Project grid */}
        <div className="lobby-grid">
          {/* Upload new card — always first */}
          <button className="lobby-card lobby-card--new" onClick={() => setShowUpload(true)}>
            <div className="lobby-card__icon lobby-card__icon--new">
              <Plus size={28} strokeWidth={1.5} />
            </div>
            <div className="lobby-card__info">
              <span className="lobby-card__title">Upload Screenplay</span>
              <span className="lobby-card__meta">PDF · FDX · Fountain · TXT</span>
            </div>
          </button>

          {/* Demo card — always available */}
          <button className="lobby-card lobby-card--demo" onClick={openDemoProject}>
            <div className="lobby-card__icon lobby-card__icon--demo">
              <Sparkles size={22} strokeWidth={1.5} />
            </div>
            <div className="lobby-card__info">
              <span className="lobby-card__title">Demo: A Ghost Story</span>
              <span className="lobby-card__meta">94 pp · Drama / Speculative Fiction</span>
            </div>
            <span className="lobby-card__badge">Demo</span>
          </button>

          {/* Loading state */}
          {loading && (
            <div className="lobby-card lobby-card--loading">
              <div className="lobby-spinner" />
              <span className="lobby-card__meta">Loading projects…</span>
            </div>
          )}

          {/* Saved projects */}
          {filtered.map(project => (
            <div
              key={project.id}
              className="lobby-card lobby-card--clickable"
              onClick={() => !isLoading && openProject(project.id)}
              style={{ opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
              role="button"
              tabIndex={0}
            >
              <div className="lobby-card__icon">
                <FileText size={20} strokeWidth={1.5} />
              </div>
              <div className="lobby-card__info">
                <span className="lobby-card__title">{project.title}</span>
                <span className="lobby-card__meta">
                  {project.pageCount > 0 && `${project.pageCount} pp`}
                  {project.pageCount > 0 && project.genre && ' · '}
                  {project.genre}
                </span>
              </div>
              <div className="lobby-card__footer">
                <span className="lobby-card__time">
                  <Clock size={11} />
                  {timeAgo(project.updatedAt)}
                </span>
                <button
                  className={`lobby-card__delete ${deleteConfirm === project.id ? 'lobby-card__delete--confirm' : ''}`}
                  onClick={e => handleDelete(e, project.id)}
                  title={deleteConfirm === project.id ? 'Click again to confirm' : 'Delete project'}
                >
                  <Trash2 size={13} />
                  {deleteConfirm === project.id && <span>Confirm?</span>}
                </button>
              </div>
            </div>
          ))}

          {/* Empty filtered state */}
          {!loading && filtered.length === 0 && projects.length > 0 && (
            <div className="lobby-empty">
              <FolderOpen size={24} strokeWidth={1.5} />
              <span>No projects match "{search}"</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="lobby-footer">
          <Film size={13} />
          <span>Projects auto-save to Firestore · Switch between scripts anytime</span>
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => { setShowUpload(false); loadProjects() }} />}

      {isLoading && (
        <div className="lobby-loading-overlay">
          <div className="lobby-spinner lobby-spinner--lg" />
          <span>Loading project…</span>
        </div>
      )}
    </div>
  )
}
