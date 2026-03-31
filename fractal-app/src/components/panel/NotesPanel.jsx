import { useState } from 'react'
import { Plus, StickyNote, ArrowRight } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'

export default function NotesPanel() {
  const { screenplay, activeUnitId, zoom, addNote, addTask, setPanelTab } = useScreenplayStore()
  const [newNote, setNewNote] = useState('')
  const [tag, setTag] = useState('general')

  // Gather notes from current context
  let notes = []
  if (zoom >= 3 && activeUnitId && screenplay) {
    for (const act of screenplay.acts) {
      for (const seq of act.sequences) {
        const sc = seq.scenes.find(s => s.id === activeUnitId)
        if (sc) { notes = sc.notes || []; break }
      }
    }
  }

  const handleAdd = () => {
    if (!newNote.trim() || !activeUnitId) return
    addNote(activeUnitId, { text: newNote, tag })
    setNewNote('')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {zoom < 3 && (
        <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: 20 }}>
          Open a scene (Zoom 3) to add surgical notes
        </div>
      )}

      {zoom >= 3 && (
        <>
          {/* Add note */}
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a surgical note…"
              rows={3}
              style={{ width: '100%', resize: 'none', marginBottom: 8, fontSize: '0.8rem', padding: '8px 10px' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={tag}
                onChange={e => setTag(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1 }}
              >
                <option value="general">General</option>
                <option value="character">Character</option>
                <option value="structure">Structure</option>
                <option value="dialogue">Dialogue</option>
                <option value="bmoc">BMOC</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleAdd} style={{ gap: 4 }}>
                <Plus size={11} />
                Add
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div className="scroll-y" style={{ flex: 1 }}>
            {notes.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <StickyNote size={24} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                No notes yet for this scene
              </div>
            )}
            {notes.map(n => (
              <div key={n.id} style={{
                padding: '10px 12px', borderBottom: '1px solid var(--border-default)',
                background: 'var(--bg-surface)'
              }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    padding: '1px 6px', fontSize: '0.6rem', fontWeight: 600,
                    borderRadius: 3, background: 'var(--bg-surface-2)', color: 'var(--text-muted)'
                  }}>{n.tag}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{n.createdAt}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {n.text}
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.65rem', padding: '2px 6px', marginTop: 4, color: 'var(--accent-primary)', gap: 3 }}
                  onClick={() => {
                    addTask({
                      priority: 'P2', status: 'open',
                      level: 'scene', linkedId: activeUnitId,
                      title: n.text.slice(0, 60),
                      description: n.text,
                    })
                    setPanelTab('tasks')
                  }}
                >
                  <ArrowRight size={10} /> Convert to Task
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
