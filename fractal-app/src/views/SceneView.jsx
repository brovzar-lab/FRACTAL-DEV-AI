import { useState, useEffect, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Save, RotateCcw, Microscope, GitCompare, Copy, Check } from 'lucide-react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'
import AnalysisLoader from '../components/shared/AnalysisLoader'
import BMOCCard from '../components/scene/BMOCCard'
import DiffView from '../components/scene/DiffView'
import RewriteSuggestion from '../components/scene/RewriteSuggestion'
import { analyzeScene } from '../services/claudeService'
import { copyToClipboard, sceneToFountain } from '../services/exporter'

export default function SceneView() {
  const { screenplay, activeUnitId, lens, drillInto, updateSceneText, cacheAnalysis, analysisCache } = useScreenplayStore()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(true)
  const [showDiff, setShowDiff] = useState(false)
  const [copied, setCopied] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  // Find scene via useMemo — no early return before hooks
  const scene = useMemo(() => {
    for (const act of screenplay.acts) {
      for (const seq of act.sequences) {
        const found = seq.scenes.find(s => s.id === activeUnitId)
        if (found) return found
      }
    }
    return null
  }, [screenplay, activeUnitId])

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

  // Reset editor when scene changes
  useEffect(() => {
    if (editor && scene && scene.text !== editor.getText()) {
      editor.commands.setContent(scene.text || '')
      setSaved(true)
      setShowDiff(false)
    }
  }, [scene?.id])

  // Read from cache before the effect to avoid calling setState synchronously inside useEffect
  const cachedAnalysis = cacheKey ? analysisCache[cacheKey] ?? null : null

  // Load analysis
  useEffect(() => {
    if (!scene || !cacheKey || cachedAnalysis) return
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
        console.error('[SceneView] Analysis failed:', err)
        setAnalysisError(err.message || 'Analysis failed. Please try again.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cacheKey])

  const displayAnalysis = cachedAnalysis ?? analysis

  const handleSave = useCallback(() => {
    if (!editor || !scene) return
    const text = editor.getText()
    updateSceneText(scene.id, text)
    setSaved(true)
  }, [editor, scene?.id])

  // Keyboard save
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  const handleCopy = async () => {
    if (!scene) return
    const text = sceneToFountain(scene)
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Safe to return null now — all hooks are above
  if (!scene) return null

  const bmocItems = [
    { key: 'B', label: 'Beginning', ok: displayAnalysis?.bmoc?.beginning?.present ?? scene.diagnostics?.bPresent },
    { key: 'M', label: 'Middle',    ok: displayAnalysis?.bmoc?.middle?.present    ?? scene.diagnostics?.mPresent },
    { key: 'O', label: 'Obstacle',  ok: displayAnalysis?.bmoc?.obstacle?.present  ?? scene.diagnostics?.oPresent },
    { key: 'C', label: 'Climax',    ok: displayAnalysis?.bmoc?.climax?.present    ?? scene.diagnostics?.cPresent },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Scene toolbar */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="zoom-badge zoom-badge-3">Scene</div>
          <h2 style={{ fontFamily: 'var(--font-screenplay)', fontSize: '0.875rem', fontWeight: 700 }}>
            {scene.heading}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            p.{scene.pageRange[0]}–{scene.pageRange[1]}
          </span>
          <DiagBadge status={scene.diagnostics?.status} />
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* BMOC quick indicators */}
          <div style={{ display: 'flex', gap: 3, marginRight: 4 }}>
            {bmocItems.map(item => (
              <div key={item.key} style={{
                width: 20, height: 20, borderRadius: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: item.ok === undefined ? 'var(--bg-surface-2)' : item.ok ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
                border: '1px solid',
                borderColor: item.ok === undefined ? 'var(--border-default)' : item.ok ? 'rgba(42,125,111,0.3)' : 'rgba(184,64,64,0.3)',
                fontSize: '0.6rem', fontWeight: 700,
                color: item.ok === undefined ? 'var(--text-muted)' : item.ok ? 'var(--status-pass)' : 'var(--status-fail)'
              }}>
                {item.key}
              </div>
            ))}
          </div>

          {/* Show diff toggle */}
          {scene.originalText && (
            <button
              className={`btn btn-sm ${showDiff ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setShowDiff(!showDiff)}
              style={{ gap: 4 }}
              title="Toggle before/after diff"
            >
              <GitCompare size={12} />
              Diff
            </button>
          )}

          {/* Copy scene */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleCopy}
            style={{ gap: 4 }}
            title="Copy scene as Fountain"
          >
            {copied ? <Check size={12} style={{ color: 'var(--status-pass)' }} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* Zoom to beat */}
          <button className="btn btn-ghost btn-sm" onClick={() => drillInto('beat', scene.id)} style={{ gap: 4 }}>
            <Microscope size={12} />
            Beat
          </button>

          {/* Revert */}
          {scene.originalText && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { updateSceneText(scene.id, scene.originalText); editor?.commands.setContent(scene.originalText); setShowDiff(false) }}
              title="Revert to original"
            >
              <RotateCcw size={12} />
            </button>
          )}

          {/* Save */}
          <button
            className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-primary'}`}
            onClick={handleSave}
            style={{ gap: 4 }}
          >
            <Save size={12} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor + analysis */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Scene editor — left side */}
        <div className="scroll-y" style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '20px 28px', maxWidth: 680, margin: '0 auto' }}>
            {/* Dramatic question */}
            {(analysis?.dramaticQuestion || scene.diagnostics?.beatQuestion) && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 16,
                fontSize: '0.8rem',
                fontStyle: 'italic',
                color: 'var(--text-secondary)',
                display: 'flex', gap: 6, alignItems: 'center'
              }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontStyle: 'normal', fontSize: '0.7rem' }}>❓</span>
                {analysis?.dramaticQuestion || scene.diagnostics?.beatQuestion}
              </div>
            )}

            {/* Diff view or Editor */}
            {showDiff ? (
              <DiffView original={scene.originalText} current={scene.text} />
            ) : (
              <div
                className="tiptap-editor"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  minHeight: 400,
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative'
                }}
              >
                <EditorContent editor={editor} />
                {!saved && (
                  <div style={{
                    position: 'absolute', bottom: 8, right: 10,
                    fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic'
                  }}>
                    Unsaved changes · ⌘S to save
                  </div>
                )}
              </div>
            )}

            {/* AI Rewrite Suggestion */}
            <div style={{ marginTop: 16 }}>
              <RewriteSuggestion scene={scene} editor={editor} />
            </div>
          </div>
        </div>

        {/* BMOC analysis — right side (condensed) */}
        <div className="scroll-y" style={{
          width: 280,
          borderLeft: '1px solid var(--border-default)',
          padding: 14,
          display: 'flex', flexDirection: 'column', gap: 12,
          background: 'var(--bg-surface-2)',
          flexShrink: 0
        }}>
          {loading && <AnalysisLoader text="Analyzing…" compact />}
          {analysisError && (
            <div style={{ padding: '10px 12px', background: 'var(--status-fail-bg)', border: '1px solid rgba(184,64,64,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--status-fail)' }}>
              ⚠ {analysisError}
            </div>
          )}
          {displayAnalysis && !loading && (
            <BMOCCard analysis={displayAnalysis} onCreateTask={(desc) => {
              useScreenplayStore.getState().addTask({
                priority: 'P1', status: 'open',
                level: 'scene', linkedId: scene.id,
                title: `Fix: ${scene.heading}`,
                description: desc,
              })
              useScreenplayStore.getState().setPanelTab('tasks')
            }} />
          )}
          {!displayAnalysis && !loading && !analysisError && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>
              BMOC analysis will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
