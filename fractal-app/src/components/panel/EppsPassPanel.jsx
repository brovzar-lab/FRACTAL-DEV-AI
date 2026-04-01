/**
 * EppsPassPanel — Methodology-driven rewriting pass planner.
 * Each pass maps to one screenwriting methodology (BMOC, Weiland, etc.)
 * and can scope to specific scenes or the entire screenplay.
 */
import { useState, useMemo } from 'react'
import {
  Plus, Play, Check, Trash2, ChevronDown, ChevronRight,
  Target, Sparkles, BookOpen, Clock, Layers,
  GripVertical, Eye
} from 'lucide-react'
import useScreenplayStore, { EPPS_PASS_TYPES } from '../../store/screenplayStore'

const METHODOLOGY_COLORS = {
  'bmoc': '#C09A30',
  'weiland': '#7B4F9E',
  'save-cat': '#2A7D6F',
  'story-grid': '#1B4F8A',
  'lyons': '#B84040',
}

const STATUS_CONFIG = {
  planned:   { label: 'Planned',   icon: Clock,    color: 'var(--text-muted)' },
  active:    { label: 'Active',    icon: Play,     color: '#C09A30' },
  completed: { label: 'Done',      icon: Check,    color: '#2A7D6F' },
}

export default function EppsPassPanel() {
  const {
    eppsPasses, activePassId, tasks, screenplay,
    createPass, activatePass, completePass, deletePass, updatePass,
    setLens, setPanelTab
  } = useScreenplayStore()

  const [showAdd, setShowAdd] = useState(false)
  const [expandedPass, setExpandedPass] = useState(null)

  // Group passes by status
  const grouped = useMemo(() => {
    const active = eppsPasses.filter(p => p.status === 'active')
    const planned = eppsPasses.filter(p => p.status === 'planned')
    const completed = eppsPasses.filter(p => p.status === 'completed')
    return { active, planned, completed }
  }, [eppsPasses])

  // Count all scenes for scope display
  const allScenes = useMemo(() => {
    if (!screenplay?.acts) return []
    return screenplay.acts.flatMap(a => a.sequences.flatMap(s => s.scenes))
  }, [screenplay])

  // Which pass types are already added
  const usedTypes = new Set(eppsPasses.map(p => p.type))

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingBottom: 8, borderBottom: '1px solid var(--border-default)',
      }}>
        <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, flex: 1 }}>Epps Rewriting Passes</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: '3px 8px', fontSize: '0.65rem', gap: 3,
            color: 'var(--accent-primary)',
            border: '1px dashed rgba(27,79,138,0.3)',
          }}
        >
          <Plus size={11} />
          Add Pass
        </button>
      </div>

      {/* Explainer (if no passes) */}
      {eppsPasses.length === 0 && !showAdd && (
        <div style={{
          padding: '16px 12px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: '0.75rem',
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        }}>
          <BookOpen size={24} strokeWidth={1.5} style={{ opacity: 0.4 }} />
          <div>Plan your rewriting passes using methodology-driven focus areas.</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Each pass activates a specific lens and scopes your analysis to what matters for that rewrite.
          </div>
        </div>
      )}

      {/* Add pass selector */}
      {showAdd && (
        <div style={{
          padding: 10, background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
            Choose a pass type
          </div>
          {EPPS_PASS_TYPES.map(pt => {
            const used = usedTypes.has(pt.id)
            const methColor = METHODOLOGY_COLORS[pt.methodology] || '#888'
            return (
              <button
                key={pt.id}
                disabled={used}
                onClick={() => { createPass(pt.id); setShowAdd(false) }}
                style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid transparent',
                  background: used ? 'transparent' : 'var(--bg-surface)',
                  opacity: used ? 0.4 : 1,
                  cursor: used ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                className={used ? '' : 'btn-hover'}
              >
                <div style={{
                  width: 4, height: 24, borderRadius: 2,
                  background: methColor, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{pt.label}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{pt.description}</div>
                </div>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, padding: '1px 5px',
                  borderRadius: 100, background: `${methColor}15`, color: methColor,
                }}>
                  {pt.methodology.toUpperCase()}
                </span>
                {used && <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Added</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Active passes (highlighted) */}
      {grouped.active.map(pass => (
        <PassCard
          key={pass.id}
          pass={pass}
          expanded={expandedPass === pass.id}
          onToggle={() => setExpandedPass(expandedPass === pass.id ? null : pass.id)}
          tasks={tasks.filter(t => pass.linkedTaskIds?.includes(t.id))}
          allScenes={allScenes}
          onActivate={() => activatePass(pass.id)}
          onComplete={() => completePass(pass.id, `Completed ${pass.label} pass.`)}
          onDelete={() => deletePass(pass.id)}
          onUpdate={(u) => updatePass(pass.id, u)}
          onFocusLens={() => setLens(pass.methodology)}
          isActive
        />
      ))}

      {/* Planned passes */}
      {grouped.planned.length > 0 && (
        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>
          Planned ({grouped.planned.length})
        </div>
      )}
      {grouped.planned.map(pass => (
        <PassCard
          key={pass.id}
          pass={pass}
          expanded={expandedPass === pass.id}
          onToggle={() => setExpandedPass(expandedPass === pass.id ? null : pass.id)}
          tasks={tasks.filter(t => pass.linkedTaskIds?.includes(t.id))}
          allScenes={allScenes}
          onActivate={() => activatePass(pass.id)}
          onComplete={() => completePass(pass.id, `Completed ${pass.label} pass.`)}
          onDelete={() => deletePass(pass.id)}
          onUpdate={(u) => updatePass(pass.id, u)}
          onFocusLens={() => setLens(pass.methodology)}
        />
      ))}

      {/* Completed passes */}
      {grouped.completed.length > 0 && (
        <>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>
            Completed ({grouped.completed.length})
          </div>
          {grouped.completed.map(pass => (
            <PassCard
              key={pass.id}
              pass={pass}
              expanded={expandedPass === pass.id}
              onToggle={() => setExpandedPass(expandedPass === pass.id ? null : pass.id)}
              tasks={[]}
              allScenes={allScenes}
              onDelete={() => deletePass(pass.id)}
              onUpdate={(u) => updatePass(pass.id, u)}
              onFocusLens={() => setLens(pass.methodology)}
              isDone
            />
          ))}
        </>
      )}
    </div>
  )
}

function PassCard({
  pass, expanded, onToggle, tasks, allScenes,
  onActivate, onComplete, onDelete, onUpdate, onFocusLens,
  isActive, isDone,
}) {
  const methColor = METHODOLOGY_COLORS[pass.methodology] || '#888'
  const statusCfg = STATUS_CONFIG[pass.status]
  const StatusIcon = statusCfg.icon
  const scopeCount = pass.scopeSceneIds?.length || allScenes.length

  return (
    <div style={{
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${isActive ? methColor + '40' : 'var(--border-default)'}`,
      background: isActive ? `${methColor}06` : 'var(--bg-surface)',
      overflow: 'hidden',
      transition: 'all var(--transition-fast)',
    }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 10px', cursor: 'pointer',
        }}
      >
        {/* Status icon */}
        <StatusIcon size={12} style={{ color: statusCfg.color, flexShrink: 0 }} />

        {/* Methodology color bar */}
        <div style={{ width: 3, height: 20, borderRadius: 2, background: methColor, flexShrink: 0 }} />

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: isDone ? 'line-through' : 'none',
            opacity: isDone ? 0.6 : 1,
          }}>
            {pass.label}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            {pass.description?.slice(0, 50)}
          </div>
        </div>

        {/* Scope badge */}
        <span style={{
          fontSize: '0.55rem', fontWeight: 600, padding: '1px 5px',
          borderRadius: 100, background: `${methColor}12`, color: methColor,
        }}>
          {pass.scopeSceneIds?.length ? `${pass.scopeSceneIds.length} sc.` : 'All'}
        </span>

        {/* Expand chevron */}
        {expanded ? <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '0 10px 10px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex', flexDirection: 'column', gap: 6,
          paddingTop: 8,
        }}>
          {/* Methodology info */}
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            fontSize: '0.65rem', color: methColor, fontWeight: 600,
          }}>
            <Sparkles size={11} />
            Lens: {pass.methodology?.toUpperCase()}
            <button
              className="btn btn-ghost btn-sm"
              onClick={onFocusLens}
              style={{ fontSize: '0.6rem', padding: '2px 6px', marginLeft: 'auto', gap: 3, color: methColor }}
            >
              <Eye size={10} />
              Focus Lens
            </button>
          </div>

          {/* Scope selector */}
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Target size={10} />
            Scope: {pass.scopeSceneIds?.length ? `${pass.scopeSceneIds.length} of ${allScenes.length} scenes` : `All ${allScenes.length} scenes`}
          </div>

          {/* Linked tasks */}
          {tasks.length > 0 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {tasks.length} linked task(s)
              {tasks.filter(t => t.status === 'done').length > 0 && (
                <span style={{ color: '#2A7D6F', marginLeft: 4 }}>
                  ({tasks.filter(t => t.status === 'done').length} done)
                </span>
              )}
            </div>
          )}

          {/* Completion info */}
          {isDone && pass.completedAt && (
            <div style={{ fontSize: '0.65rem', color: '#2A7D6F', fontStyle: 'italic' }}>
              ✓ Completed {new Date(pass.completedAt).toLocaleDateString()}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {!isDone && !isActive && (
              <button
                className="btn btn-sm"
                onClick={onActivate}
                style={{
                  fontSize: '0.65rem', padding: '4px 10px', gap: 3,
                  background: methColor, color: '#fff', border: 'none',
                }}
              >
                <Play size={10} />
                Start Pass
              </button>
            )}
            {isActive && (
              <button
                className="btn btn-sm"
                onClick={onComplete}
                style={{
                  fontSize: '0.65rem', padding: '4px 10px', gap: 3,
                  background: '#2A7D6F', color: '#fff', border: 'none',
                }}
              >
                <Check size={10} />
                Complete
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={onDelete}
              style={{ fontSize: '0.65rem', padding: '4px 8px', color: 'var(--status-fail)' }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
