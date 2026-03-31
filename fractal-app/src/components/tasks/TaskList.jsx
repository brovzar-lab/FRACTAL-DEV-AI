import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, ExternalLink, CheckSquare, Square, Trash2 } from 'lucide-react'
import useScreenplayStore from '../../store/screenplayStore'

const PRIORITY_COLORS = {
  P1: { bg: 'var(--status-fail-bg)', border: 'var(--status-fail)', text: 'var(--status-fail)' },
  P2: { bg: 'var(--status-warn-bg)', border: 'var(--accent-gold)', text: 'var(--accent-gold)' },
  P3: { bg: 'var(--status-pass-bg)', border: 'var(--status-pass)', text: 'var(--status-pass)' },
}

const LEVEL_LABELS = { act: 'Act', sequence: 'Seq', scene: 'Scene', beat: 'Beat' }

export default function TaskList() {
  const { tasks, addTask, updateTask, deleteTask, reorderTasks, goToUnit } = useScreenplayStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState({ priority: 'P2', title: '', description: '' })
  const [filter, setFilter] = useState('open')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filtered = tasks.filter(t => filter === 'all' ? true : filter === 'done' ? t.status === 'done' : t.status !== 'done')

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = tasks.findIndex(t => t.id === active.id)
    const newIdx = tasks.findIndex(t => t.id === over.id)
    reorderTasks(arrayMove(tasks, oldIdx, newIdx))
  }

  const handleAdd = () => {
    if (!newTask.title.trim()) return
    addTask(newTask)
    setNewTask({ priority: 'P2', title: '', description: '' })
    setShowAdd(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter + add */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[['open','Open'],['done','Done'],['all','All']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: '3px 8px', fontSize: '0.7rem', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: filter === val ? 'var(--accent-primary)' : 'transparent',
                color: filter === val ? '#fff' : 'var(--text-muted)',
                fontWeight: filter === val ? 600 : 400
              }}
            >
              {label}
              {val === 'open' && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  ({tasks.filter(t => t.status !== 'done').length})
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setShowAdd(true)}
          style={{ gap: 4, padding: '4px 8px' }}
        >
          <Plus size={11} />
          Add
        </button>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div style={{
          padding: 12, background: 'var(--bg-surface-2)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', flexDirection: 'column', gap: 8,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['P1','P2','P3'].map(p => (
              <button
                key={p}
                onClick={() => setNewTask(prev => ({ ...prev, priority: p }))}
                style={{
                  padding: '3px 8px', fontSize: '0.7rem', borderRadius: 4,
                  border: `1px solid ${PRIORITY_COLORS[p].border}`,
                  background: newTask.priority === p ? PRIORITY_COLORS[p].border : 'transparent',
                  color: newTask.priority === p ? '#fff' : PRIORITY_COLORS[p].text,
                  cursor: 'pointer', fontWeight: 600
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Task title…"
            value={newTask.title}
            onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
            style={{ fontSize: '0.8rem', padding: '6px 8px' }}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)…"
            value={newTask.description}
            onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            style={{ fontSize: '0.8rem', padding: '6px 8px', resize: 'none' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add Task</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="scroll-y" style={{ flex: 1 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {filter === 'done' ? 'No completed tasks' : 'No open tasks — great shape!'}
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ padding: '8px 0' }}>
              {filtered.map(task => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onDone={() => updateTask(task.id, { status: task.status === 'done' ? 'open' : 'done' })}
                  onDelete={() => deleteTask(task.id)}
                  onNavigate={() => goToUnit(task.level, task.linkedId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

function SortableTask({ task, onDone, onDelete, onNavigate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const p = PRIORITY_COLORS[task.priority]
  const isDone = task.status === 'done'

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 1,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderLeft: `3px solid ${isDone ? 'var(--border-default)' : p.border}`,
        background: isDone ? 'transparent' : 'var(--bg-surface)',
        transition: 'background var(--transition-fast)',
        borderBottom: '1px solid var(--border-default)',
      }}>
        {/* Drag */}
        <div {...attributes} {...listeners} style={{
          padding: '0 6px', display: 'flex', alignItems: 'center',
          color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0, touchAction: 'none'
        }}>
          <GripVertical size={12} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '9px 8px 9px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
            <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDone ? 'var(--status-pass)' : 'var(--text-muted)', padding: 0, flexShrink: 0, marginTop: 1 }}>
              {isDone ? <CheckSquare size={13} /> : <Square size={13} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '1px 5px', borderRadius: 3, fontSize: '0.6rem', fontWeight: 700,
                  background: p.border, color: '#fff', flexShrink: 0
                }}>{task.priority}</span>
                {task.level && (
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-surface-2)', padding: '1px 5px', borderRadius: 3 }}>
                    {LEVEL_LABELS[task.level]}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4, marginTop: 3,
                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: isDone ? 'line-through' : 'none'
              }}>
                {task.title}
              </div>
              {task.description && (
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4, fontStyle: 'italic' }}>
                  {task.description.slice(0, 120)}{task.description.length > 120 ? '…' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '0 6px', flexShrink: 0 }}>
          {task.linkedId && (
            <button onClick={onNavigate} title="Go to scene" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
              <ExternalLink size={11} />
            </button>
          )}
          <button onClick={onDelete} title="Delete task" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
