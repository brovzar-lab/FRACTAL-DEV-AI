import { useMemo } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'

const SEQ_COLORS = [
  { bg: 'rgba(27,79,138,0.06)', border: '#1B4F8A', header: 'rgba(27,79,138,0.10)' },
  { bg: 'rgba(42,125,111,0.06)', border: '#2A7D6F', header: 'rgba(42,125,111,0.10)' },
  { bg: 'rgba(184,92,44,0.06)', border: '#B85C2C', header: 'rgba(184,92,44,0.10)' },
  { bg: 'rgba(123,79,158,0.06)', border: '#7B4F9E', header: 'rgba(123,79,158,0.10)' },
  { bg: 'rgba(192,154,48,0.06)', border: '#C09A30', header: 'rgba(192,154,48,0.10)' },
]

const STATUS_COLORS = { pass: '#2A7D6F', warn: '#C09A30', fail: '#B84040' }

const STATUS_WORKFLOW_COLORS = {
  untouched: '#888',
  'in-progress': '#C09A30',
  revised: '#1B4F8A',
  approved: '#2A7D6F',
  flagged: '#B84040',
}

export default function BoardView() {
  const { screenplay, openSceneDrawer, colorMode, reorderScenes } = useScreenplayStore()

  const allSequences = useMemo(() => {
    if (!screenplay?.acts) return []
    const seqs = []
    screenplay.acts.forEach(act => {
      act.sequences.forEach(seq => {
        seqs.push({ ...seq, actLabel: act.label, actId: act.id })
      })
    })
    return seqs
  }, [screenplay])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  if (!screenplay) return null
  if (allSequences.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No sequences found. Upload or parse a screenplay first.
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div className="scroll-y" style={{
        flex: 1, display: 'flex', gap: 12, padding: '16px 12px',
        overflowX: 'auto', overflowY: 'hidden',
        alignItems: 'flex-start',
      }}>
        {allSequences.map((seq, si) => {
          const seqColor = SEQ_COLORS[si % SEQ_COLORS.length]

          const handleDragEnd = ({ active, over }) => {
            if (!over || active.id === over.id) return
            const oldIds = seq.scenes.map(s => s.id)
            const oldIdx = oldIds.indexOf(active.id)
            const newIdx = oldIds.indexOf(over.id)
            if (oldIdx === -1 || newIdx === -1) return
            reorderScenes(seq.id, arrayMove(oldIds, oldIdx, newIdx))
          }

          return (
            <div
              key={seq.id}
              style={{
                minWidth: 240, maxWidth: 300, width: 270,
                flexShrink: 0,
                background: seqColor.bg,
                border: `1px solid ${seqColor.border}30`,
                borderRadius: 'var(--radius-lg)',
                display: 'flex', flexDirection: 'column',
                maxHeight: '100%',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '10px 12px',
                background: seqColor.header,
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                borderBottom: `1px solid ${seqColor.border}30`,
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: seqColor.border, marginBottom: 2 }}>
                  {seq.label}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {seq.thematicFunction} · {seq.scenes.length} scenes
                </div>
              </div>

              {/* Cards */}
              <div className="scroll-y" style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={seq.scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {seq.scenes.map(sc => (
                      <SortableCard key={sc.id} scene={sc} seqColor={seqColor} colorMode={colorMode} onOpen={() => openSceneDrawer(sc.id)} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SortableCard({ scene, seqColor, colorMode, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  // Card border color depends on color mode
  let borderColor = seqColor.border // default: sequence color
  if (colorMode === 'health') {
    borderColor = STATUS_COLORS[scene.diagnostics?.status] || '#999'
  } else if (colorMode === 'status') {
    borderColor = STATUS_WORKFLOW_COLORS[scene.workflowStatus] || '#888'
  }

  const bmocItems = [
    { key: 'B', ok: scene.diagnostics?.bPresent },
    { key: 'M', ok: scene.diagnostics?.mPresent },
    { key: 'O', ok: scene.diagnostics?.oPresent },
    { key: 'C', ok: scene.diagnostics?.cPresent },
  ]

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="card"
        onClick={onOpen}
        style={{
          cursor: 'pointer',
          borderLeftWidth: 3,
          borderLeftColor: borderColor,
          transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
          padding: 0,
          overflow: 'hidden',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-raised)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            style={{
              padding: '0 6px', display: 'flex', alignItems: 'center',
              color: 'var(--text-muted)', cursor: 'grab',
              borderRight: '1px solid var(--border-default)',
              flexShrink: 0, touchAction: 'none',
            }}
          >
            <GripVertical size={12} />
          </div>

          <div style={{ flex: 1, padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
              <div style={{ fontWeight: 600, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {scene.heading}
              </div>
              <DiagBadge status={scene.diagnostics?.status} />
            </div>

            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              p.{scene.pageRange[0]}–{scene.pageRange[1]}
            </div>

            {/* BMOC dots */}
            <div style={{ display: 'flex', gap: 3 }}>
              {bmocItems.map(item => (
                <div key={item.key} style={{
                  width: 16, height: 16, borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.ok ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
                  fontSize: '0.55rem', fontWeight: 700,
                  color: item.ok ? 'var(--status-pass)' : 'var(--status-fail)',
                }}>
                  {item.key}
                </div>
              ))}
            </div>

            {/* Warning note */}
            {scene.diagnostics?.notes && (
              <div style={{ marginTop: 4, fontSize: '0.6rem', color: 'var(--accent-warm)', display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                <AlertTriangle size={9} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {scene.diagnostics.notes}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
