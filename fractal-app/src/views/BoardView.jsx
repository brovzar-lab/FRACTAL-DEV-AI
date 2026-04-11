import { useMemo } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'
import { getCardStyle } from '../utils/indexCardUtils'

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
              <div className="scroll-y card-grid-surface" style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
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

  // DnD transform on wrapper — card rotation/skew on inner div (no conflict)
  const wrapperStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  // Card border color depends on color mode
  let borderColor = seqColor.border
  if (colorMode === 'health') {
    borderColor = STATUS_COLORS[scene.diagnostics?.status] || '#999'
  } else if (colorMode === 'status') {
    borderColor = STATUS_WORKFLOW_COLORS[scene.workflowStatus] || '#888'
  }

  const cardStyle = getCardStyle(scene.id)

  const bmocItems = [
    { key: 'B', ok: scene.diagnostics?.bPresent },
    { key: 'M', ok: scene.diagnostics?.mPresent },
    { key: 'O', ok: scene.diagnostics?.oPresent },
    { key: 'C', ok: scene.diagnostics?.cPresent },
  ]

  return (
    <div ref={setNodeRef} style={wrapperStyle}>
      <div
        className="index-card"
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
        role="button"
        tabIndex={0}
        aria-label={`Scene: ${scene.heading}, pages ${scene.pageRange[0]} to ${scene.pageRange[1]}`}
        style={{
          ...cardStyle,
          borderLeft: `3px solid ${borderColor}`,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            style={{
              padding: '0 5px', display: 'flex', alignItems: 'center',
              color: '#635B52', cursor: 'grab',
              borderRight: '1px solid rgba(0,0,0,0.08)',
              flexShrink: 0, touchAction: 'none',
            }}
          >
            <GripVertical size={10} />
          </div>

          <div style={{ flex: 1, padding: '6px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
              <div style={{ fontWeight: 700, fontSize: '0.65rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', flex: 1, color: '#1A1814' }}>
                {scene.heading}
              </div>
              <DiagBadge status={scene.diagnostics?.status} />
            </div>

            <div style={{ fontSize: '0.55rem', color: '#635B52', marginBottom: 3 }}>
              p.{scene.pageRange[0]}–{scene.pageRange[1]}
            </div>

            {/* BMOC dots */}
            <div style={{ display: 'flex', gap: 2 }} role="group" aria-label="BMOC structure">
              {bmocItems.map(item => (
                <div key={item.key} title={`${item.key}: ${item.ok ? 'Present' : 'Missing'}`} aria-label={`${item.key} ${item.ok ? 'present' : 'missing'}`} style={{
                  width: 12, height: 12, borderRadius: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.ok ? '#2A7D6F' : '#B84040',
                  fontSize: '0.45rem', fontWeight: 700,
                  color: '#fff',
                }}>
                  {item.key}
                </div>
              ))}
            </div>

            {/* Warning note */}
            {scene.diagnostics?.notes && (
              <div style={{ marginTop: 3, fontSize: '0.5rem', color: '#B85C2C', display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <AlertTriangle size={8} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
