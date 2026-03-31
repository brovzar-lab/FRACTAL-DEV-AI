import { useState, useEffect, useMemo } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ZoomIn, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'
import AnalysisLoader from '../components/shared/AnalysisLoader'
import { analyzeSequence } from '../services/claudeService'

export default function SequenceView() {
  const { screenplay, activeUnitId, lens, drillInto, cacheAnalysis, analysisCache } = useScreenplayStore()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scenes, setScenes] = useState([])

  // Find the sequence — MUST be before hooks but NOT cause early return before hooks
  const { seq, parentAct } = useMemo(() => {
    for (const act of screenplay.acts) {
      const found = act.sequences.find(s => s.id === activeUnitId)
      if (found) return { seq: found, parentAct: act }
    }
    return { seq: null, parentAct: null }
  }, [screenplay, activeUnitId])

  const cacheKey = seq ? `seq-${seq.id}-${lens}` : null

  useEffect(() => {
    if (seq) setScenes([...seq.scenes])
  }, [seq?.id])

  useEffect(() => {
    if (!seq || !cacheKey) return
    if (analysisCache[cacheKey]) { setAnalysis(analysisCache[cacheKey]); return }
    setLoading(true)
    analyzeSequence(seq, parentAct, lens)
      .then(r => { setAnalysis(r); cacheAnalysis(cacheKey, r) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [cacheKey])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // NOW we can safely return null after all hooks
  if (!seq) return null

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = scenes.findIndex(s => s.id === active.id)
    const newIdx = scenes.findIndex(s => s.id === over.id)
    setScenes(arrayMove(scenes, oldIdx, newIdx))
  }

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <div className="zoom-badge zoom-badge-2" style={{ marginBottom: 8 }}>Sequence</div>
        <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: '1.3rem', fontWeight: 600, marginBottom: 4 }}>
          {seq.label}
        </h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {seq.thematicFunction}
        </div>
      </div>

      {/* AI Analysis */}
      {loading && <AnalysisLoader text="Analyzing sequence…" />}
      {analysis && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Sequence Question
            </div>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: 6 }}>
              "{analysis.sequenceQuestion}"
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resolution:</span>
              <DiagBadge status={analysis.answer === 'pass' ? 'pass' : analysis.answer === 'fail' ? 'fail' : 'warn'} 
                        label={analysis.answer?.toUpperCase()} />
            </div>
          </div>
          {analysis.recommendation && (
            <div style={{
              padding: '10px 14px', background: 'var(--status-warn-bg)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
              fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic'
            }}>
              <span style={{ fontWeight: 600, color: '#8A6E1F' }}>→ </span>
              {analysis.recommendation}
            </div>
          )}
        </div>
      )}

      {/* Scene cards — drag to reorder */}
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Scenes — drag to reorder
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scenes.map((sc, idx) => (
                <SortableSceneCard key={sc.id} scene={sc} index={idx} onOpen={() => drillInto('scene', sc.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

function SortableSceneCard({ scene, index, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  const bmoc = scene.diagnostics
  const bmocItems = [
    { key: 'B', label: 'Beginning', ok: bmoc?.bPresent },
    { key: 'M', label: 'Middle', ok: bmoc?.mPresent },
    { key: 'O', label: 'Obstacle', ok: bmoc?.oPresent },
    { key: 'C', label: 'Climax', ok: bmoc?.cPresent },
  ]

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="card"
        style={{
          display: 'flex', alignItems: 'stretch',
          borderLeftWidth: 3,
          borderLeftColor: { pass: '#2A7D6F', warn: '#C09A30', fail: '#B84040' }[bmoc?.status] || '#999',
          transition: 'box-shadow var(--transition-fast)',
          cursor: 'default',
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            padding: '0 8px',
            display: 'flex', alignItems: 'center',
            color: 'var(--text-muted)',
            cursor: 'grab',
            borderRight: '1px solid var(--border-default)',
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <GripVertical size={14} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>#{index + 1}</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{scene.heading}</span>
                <DiagBadge status={bmoc?.status} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Pages {scene.pageRange[0]}–{scene.pageRange[1]} · {scene.characters?.join(', ')}
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={onOpen} style={{ gap: 4, flexShrink: 0 }}>
              <ZoomIn size={12} />
              Open
            </button>
          </div>

          {/* Synopsis */}
          {scene.synopsis && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
              {scene.synopsis}
            </div>
          )}

          {/* BMOC indicators */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {bmocItems.map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 7px',
                borderRadius: 4,
                background: item.ok ? 'var(--status-pass-bg)' : 'var(--status-fail-bg)',
                border: '1px solid',
                borderColor: item.ok ? 'rgba(42,125,111,0.2)' : 'rgba(184,64,64,0.2)',
              }}>
                {item.ok
                  ? <CheckCircle size={9} style={{ color: '#1D5B50' }} />
                  : <XCircle size={9} style={{ color: 'var(--status-fail)' }} />
                }
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: item.ok ? '#1D5B50' : 'var(--status-fail)' }}>
                  {item.key}
                </span>
              </div>
            ))}
            {bmoc?.valueShift !== undefined && (
              <div style={{
                padding: '2px 7px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                background: bmoc.valueShift ? 'var(--status-pass-bg)' : 'var(--status-warn-bg)',
                color: bmoc.valueShift ? '#1D5B50' : '#8A6E1F',
                border: '1px solid', borderColor: bmoc.valueShift ? 'rgba(42,125,111,0.2)' : 'rgba(192,154,48,0.2)'
              }}>
                {bmoc.valueShift ? '↕ Value shift' : '↔ No shift'}
              </div>
            )}
          </div>

          {/* Warning note */}
          {bmoc?.notes && (
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--accent-warm)', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
              {bmoc.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
