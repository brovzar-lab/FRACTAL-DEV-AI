import { useEffect, useMemo, useState, useCallback } from 'react'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import { X, Save, Copy, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import useScreenplayStore from '../../store/screenplayStore'
import DiagBadge from '../shared/DiagBadge'
import BMOCCard from '../scene/BMOCCard'
import { analyzeScene } from '../../services/claudeService'
import { copyToClipboard, sceneToFountain } from '../../services/exporter'
import AnalysisLoader from '../shared/AnalysisLoader'

// Workflow status config
const STATUS_CONFIG = {
  untouched:     { label: 'Untouched',    color: '#666', bg: 'rgba(100,100,100,0.1)' },
  'in-progress': { label: 'In Progress',  color: '#C09A30', bg: 'rgba(192,154,48,0.1)' },
  revised:       { label: 'Revised',      color: '#1B4F8A', bg: 'rgba(27,79,138,0.1)' },
  approved:      { label: 'Approved',     color: '#2A7D6F', bg: 'rgba(42,125,111,0.1)' },
  flagged:       { label: 'Flagged',      color: '#B84040', bg: 'rgba(184,64,64,0.1)' },
}

// Direction-dependent animation variants
const drawerVariants = {
  right: {
    initial: { x: '100%', opacity: 0.8 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0.8 },
  },
  left: {
    initial: { x: '-100%', opacity: 0.8 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0.8 },
  },
  bottom: {
    initial: { y: '100%', opacity: 0.8 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0.8 },
  },
}

export default function SceneDrawer() {
  const {
    screenplay, sceneDrawerOpen, sceneDrawerId, sceneDrawerDirection,
    closeSceneDrawer, updateSceneText, setSceneStatus,
    lens, cacheAnalysis, analysisCache, startEditSession, endEditSession,
    addTask
  } = useScreenplayStore()

  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(true)
  const [copied, setCopied] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  // Find the scene
  const scene = useMemo(() => {
    if (!screenplay || !sceneDrawerId) return null
    for (const act of screenplay.acts) {
      for (const seq of act.sequences) {
        const found = seq.scenes.find(s => s.id === sceneDrawerId)
        if (found) return found
      }
    }
    return null
  }, [screenplay, sceneDrawerId])

  const cacheKey = scene ? `scene-${scene.id}-${lens}` : null

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Scene text…' })
    ],
    content: scene?.text || '',
    onUpdate: () => setSaved(false),
  })

  // Reset editor when scene changes — defer setSaved to avoid setState-in-effect
  useEffect(() => {
    if (editor && scene) {
      if (scene.text !== editor.getText()) {
        editor.commands.setContent(scene.text || '')
        setTimeout(() => setSaved(true), 0)
      }
    }
  }, [scene?.id])

  // Start edit session when drawer opens, end when it closes
  useEffect(() => {
    if (sceneDrawerOpen && sceneDrawerId) {
      startEditSession(sceneDrawerId)
    }
    return () => {
      if (sceneDrawerId) {
        endEditSession(sceneDrawerId)
      }
    }
  }, [sceneDrawerOpen, sceneDrawerId])

  // Read from cache before the effect to avoid calling setState synchronously inside useEffect
  const cachedDrawerAnalysis = cacheKey ? analysisCache[cacheKey] ?? null : null

  // Load analysis
  useEffect(() => {
    if (!scene || !cacheKey || cachedDrawerAnalysis) return
    const controller = new AbortController()
    setLoading(true)
    setAnalysisError(null)
    analyzeScene(scene, lens)
      .then(r => {
        if (controller.signal.aborted) return
        setAnalysis(r); cacheAnalysis(cacheKey, r)
      })
      .catch(err => {
        if (controller.signal.aborted) return
        console.error('[SceneDrawer] Analysis failed:', err)
        setAnalysisError(err.message || 'Analysis failed.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cacheKey])

  const drawerAnalysis = cachedDrawerAnalysis ?? analysis

  const handleSave = useCallback(() => {
    if (!editor || !scene) return
    updateSceneText(scene.id, editor.getText())
    setSaved(true)
  }, [editor, scene?.id])

  const handleCopy = async () => {
    if (!scene) return
    await copyToClipboard(sceneToFountain(scene))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Keyboard shortcut for save
  useEffect(() => {
    if (!sceneDrawerOpen) return
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
      if (e.key === 'Escape') closeSceneDrawer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sceneDrawerOpen, handleSave])

  // Determine layout based on direction
  const isHorizontal = sceneDrawerDirection === 'right' || sceneDrawerDirection === 'left'
  const variants = drawerVariants[sceneDrawerDirection] || drawerVariants.right

  const drawerStyle = isHorizontal
    ? {
        position: 'fixed',
        top: 'var(--header-height)',
        [sceneDrawerDirection]: 0,
        bottom: 0,
        width: 520,
        maxWidth: '70vw',
        zIndex: 150,
        background: 'var(--bg-surface)',
        borderLeft: sceneDrawerDirection === 'right' ? '1px solid var(--border-default)' : 'none',
        borderRight: sceneDrawerDirection === 'left' ? '1px solid var(--border-default)' : 'none',
        boxShadow: 'var(--shadow-floating)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
    : {
        position: 'fixed',
        left: 0, right: 0,
        bottom: 0,
        height: '45vh',
        maxHeight: 440,
        zIndex: 150,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-default)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }

  const bmocItems = scene ? [
    { key: 'B', label: 'Beginning', ok: analysis?.bmoc?.beginning?.present ?? scene.diagnostics?.bPresent },
    { key: 'M', label: 'Middle',    ok: analysis?.bmoc?.middle?.present    ?? scene.diagnostics?.mPresent },
    { key: 'O', label: 'Obstacle',  ok: analysis?.bmoc?.obstacle?.present  ?? scene.diagnostics?.oPresent },
    { key: 'C', label: 'Climax',    ok: analysis?.bmoc?.climax?.present    ?? scene.diagnostics?.cPresent },
  ] : []

  const statusCfg = STATUS_CONFIG[scene?.workflowStatus] || STATUS_CONFIG.untouched

  return (
    <AnimatePresence>
      {sceneDrawerOpen && scene && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSceneDrawer}
            aria-label="Close scene drawer"
            role="button"
            tabIndex={-1}
            style={{
              position: 'fixed', inset: 0, zIndex: 140,
              background: 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Drawer panel */}
          <motion.div
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            style={drawerStyle}
            role="dialog"
            aria-modal="true"
            aria-label={`Scene details: ${scene.heading}`}
          >
            {/* Header */}
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex', flexDirection: 'column', gap: 6,
              flexShrink: 0, background: 'var(--bg-surface-2)',
            }}>
              {/* Row 1: Scene badge + heading + close button */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div className="zoom-badge zoom-badge-3" style={{ flexShrink: 0, marginTop: 2 }}>Scene</div>
                <h3 style={{
                  fontFamily: 'var(--font-screenplay)', fontSize: '0.8rem', fontWeight: 700,
                  flex: 1, lineHeight: 1.3, margin: 0, wordBreak: 'break-word',
                }}>
                  {scene.heading}
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={closeSceneDrawer} aria-label="Close scene drawer" style={{ padding: '4px 6px', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>

              {/* Row 2: Health + Status + BMOC + Copy + Save */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <DiagBadge status={scene.diagnostics?.status} />

                {/* Workflow status selector */}
                <select
                  value={scene.workflowStatus || 'untouched'}
                  onChange={(e) => setSceneStatus(scene.id, e.target.value)}
                  aria-label="Scene workflow status"
                  style={{
                    padding: '3px 6px', fontSize: '0.65rem', fontWeight: 600,
                    borderRadius: 4, border: '1px solid var(--border-default)',
                    background: statusCfg.bg, color: statusCfg.color,
                    cursor: 'pointer', appearance: 'auto',
                  }}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>

                {/* BMOC quick indicators */}
                <div style={{ display: 'flex', gap: 2 }} role="group" aria-label="BMOC structure indicators">
                  {bmocItems.map(item => (
                    <div key={item.key} title={`${item.label}: ${item.ok === undefined ? 'Unknown' : item.ok ? 'Present' : 'Missing'}`} aria-label={`${item.label} ${item.ok ? 'present' : 'missing'}`} style={{
                      width: 18, height: 18, borderRadius: 3,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.ok === undefined ? 'var(--bg-surface-2)' : item.ok ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
                      border: '1px solid',
                      borderColor: item.ok === undefined ? 'var(--border-default)' : item.ok ? 'rgba(42,125,111,0.3)' : 'rgba(184,64,64,0.3)',
                      fontSize: '0.55rem', fontWeight: 700,
                      color: item.ok === undefined ? 'var(--text-muted)' : item.ok ? 'var(--status-pass)' : 'var(--status-fail)',
                    }}>
                      {item.key}
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1 }} />

                {/* Copy */}
                <button className="btn btn-ghost btn-sm" onClick={handleCopy} title="Copy scene as Fountain" aria-label="Copy scene to clipboard" style={{ padding: '4px 6px' }}>
                  {copied ? <Check size={12} style={{ color: 'var(--status-pass)' }} /> : <Copy size={12} />}
                </button>

                {/* Save */}
                <button
                  className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={handleSave}
                  aria-label={saved ? 'Scene saved' : 'Save scene changes'}
                  style={{ gap: 3, padding: '4px 8px' }}
                >
                  <Save size={12} />
                  {saved ? '' : 'Save'}
                </button>
              </div>
            </div>

            {/* Body — editor + optional analysis side */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isHorizontal ? 'column' : 'row' }}>
              {/* Editor */}
              <div className="scroll-y" style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ padding: '14px 20px', maxWidth: 640, margin: '0 auto' }}>
                  {/* Page range */}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Pages {scene.pageRange[0]}–{scene.pageRange[1]} · {scene.characters?.join(', ')}
                  </div>

                  {/* Dramatic question */}
                  {(analysis?.dramaticQuestion || scene.diagnostics?.beatQuestion) && (
                    <div style={{
                      padding: '6px 10px', background: 'var(--bg-surface-2)',
                      borderRadius: 'var(--radius-md)', marginBottom: 12,
                      fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)',
                      display: 'flex', gap: 5, alignItems: 'center'
                    }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontStyle: 'normal', fontSize: '0.65rem' }}>❓</span>
                      {analysis?.dramaticQuestion || scene.diagnostics?.beatQuestion}
                    </div>
                  )}

                  {/* Editor */}
                  <div
                    className="tiptap-editor"
                    style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-lg)', minHeight: isHorizontal ? 200 : 120,
                      boxShadow: 'var(--shadow-card)', position: 'relative'
                    }}
                  >
                    <EditorContent editor={editor} />
                    {!saved && (
                      <div style={{
                        position: 'absolute', bottom: 6, right: 8,
                        fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic'
                      }}>
                        Unsaved · ⌘S
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis sidebar (only in horizontal mode) */}
              {isHorizontal && (
                <div className="scroll-y" style={{
                  borderTop: '1px solid var(--border-default)',
                  padding: 12, background: 'var(--bg-surface-2)',
                  maxHeight: 200, flexShrink: 0,
                }}>
                  {loading && <AnalysisLoader text="Analyzing…" compact />}
                  {analysisError && !loading && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--status-fail)', padding: '6px 0' }}>
                      ⚠ {analysisError}
                    </div>
                  )}
                  {drawerAnalysis && !loading && (
                    <BMOCCard analysis={drawerAnalysis} onCreateTask={(desc) => {
                      addTask({
                        priority: 'P1', status: 'open',
                        level: 'scene', linkedId: scene.id,
                        title: `Fix: ${scene.heading}`,
                        description: desc,
                      })
                      useScreenplayStore.getState().setPanelTab('tasks')
                    }} />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
