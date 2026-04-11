import { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, Loader } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'
import { parseScreenplayFile } from '../../services/parser'
import { parseScreenplayWithClaude } from '../../services/claudeService'

const ACCEPTED = '.pdf,.fdx,.fountain,.txt'
const STAGES = ['Uploading file…', 'Extracting text…', 'AI parsing structure…', 'Building fractal tree…']

export default function UploadModal({ onClose, replaceMode = false }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [stage, setStage] = useState(-1)  // -1 = idle, 0-3 = processing, 4 = done
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const { setScreenplay } = useScreenplayStore()

  const handleFile = (f) => {
    if (!f) return
    const name = f.name.toLowerCase()
    if (!name.match(/\.(pdf|fdx|fountain|txt)$/)) {
      setError('Please upload a PDF, FDX, Fountain, or TXT file.')
      return
    }
    setFile(f)
    setError(null)
  }

  const handleProcess = async () => {
    if (!file) return
    setError(null)
    try {
      setStage(0)
      await delay(300)

      setStage(1)
      const { rawText, pageCount } = await parseScreenplayFile(file)

      setStage(2)
      const screenplay = await parseScreenplayWithClaude(rawText, pageCount, file.name.replace(/\.[^.]+$/, ''))

      setStage(3)
      await delay(400)

      setStage(4)
      await delay(600)

      if (replaceMode) {
        // Replace screenplay data in current project, keep project ID
        const currentId = useScreenplayStore.getState().screenplay?.id
        if (currentId) screenplay.id = currentId
      }
      setScreenplay(screenplay)
      onClose()
    } catch (e) {
      console.error(e)
      setError(e.message || 'Something went wrong. Please try again.')
      setStage(-1)
    }
  }

  const isProcessing = stage >= 0 && stage < 4

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }} onClick={e => { if (e.target === e.currentTarget && !isProcessing) onClose() }}>
      <div className="card-raised animate-scale-in" style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.1rem', fontWeight: 600 }}>
              {replaceMode ? 'Replace Screenplay' : 'Upload Screenplay'}
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              PDF · Final Draft (.fdx) · Fountain · Plain text
            </div>
          </div>
          {!isProcessing && (
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ padding: 22 }}>
          {/* Drop zone */}
          {stage < 0 && (
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => inputRef.current?.click()}
              style={{ marginBottom: 16 }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />

              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(27,79,138,0.1) 0%, rgba(123,79,158,0.1) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 4
              }}>
                <Upload size={22} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
              </div>

              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Drop your screenplay here
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                or click to browse
              </div>
            </div>
          )}

          {/* Selected file */}
          {file && stage < 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              marginBottom: 16
            }}>
              <FileText size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
              <button onClick={() => setFile(null)} className="btn btn-ghost btn-icon" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            </div>
          )}

          {/* Processing stages */}
          {stage >= 0 && (
            <div style={{ marginBottom: 16 }}>
              {STAGES.map((label, idx) => {
                const done = idx < stage
                const active = idx === stage
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    opacity: idx > stage ? 0.35 : 1,
                    transition: 'opacity var(--transition-base)'
                  }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'var(--status-pass-bg)' : active ? 'rgba(27,79,138,0.1)' : 'var(--bg-surface-2)', border: `1px solid ${done ? 'rgba(42,125,111,0.3)' : active ? 'rgba(27,79,138,0.3)' : 'var(--border-default)'}` }}>
                      {done ? <CheckCircle size={13} style={{ color: 'var(--status-pass)' }} />
                             : active ? <Loader size={13} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                             : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-strong)' }} />}
                    </div>
                    <span style={{ fontSize: '0.83rem', color: done ? 'var(--status-pass)' : active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 500 : 400 }}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 12px', background: 'var(--status-fail-bg)',
              border: '1px solid rgba(184,64,64,0.25)', borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem', color: 'var(--status-fail)', marginBottom: 16
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isProcessing && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleProcess}
                  disabled={!file}
                  style={{ flex: 1, justifyContent: 'center', opacity: !file ? 0.5 : 1 }}
                >
                  {replaceMode ? 'Re-parse & Replace' : 'Parse & Analyze'}
                </button>
                <button className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </>
            )}
            {isProcessing && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', flex: 1, paddingTop: 4 }}>
                Claude is reading your screenplay… (~30–60s for a feature)
                {replaceMode && <div style={{ fontSize: '0.7rem', color: '#C09A30', marginTop: 4 }}>⚠ This will replace all scenes and analysis in the current project.</div>}
              </div>
            )}
          </div>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  )
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }
