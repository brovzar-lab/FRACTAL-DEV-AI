import { useState, useEffect, useMemo } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ZoomIn, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import useScreenplayStore from '../store/screenplayStore'
import DiagBadge from '../components/shared/DiagBadge'
import AnalysisLoader from '../components/shared/AnalysisLoader'
import { analyzeSequence } from '../services/claudeService'
import { getCardStyle } from '../utils/indexCardUtils'

export default function SequenceView() {
  const { screenplay, activeUnitId, lens, drillInto, cacheAnalysis, analysisCache } = useScreenplayStore()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scenes, setScenes] = useState([])
  const [analysisError, setAnalysisError] = useState(null)

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

  // Read from cache before the effect to avoid calling setState synchronously inside useEffect
  const cachedAnalysis = cacheKey ? analysisCache[cacheKey] ?? null : null

  useEffect(() => {
    if (!seq || !cacheKey || cachedAnalysis) return
    const controller = new AbortController()
    setLoading(true)
    setAnalysisError(null)
    analyzeSequence(seq, parentAct, lens)
      .then(r => {
        if (controller.signal.aborted) return
        setAnalysis(r); cacheAnalysis(cacheKey, r)
      })
      .catch(err => {
        if (controller.signal.aborted) return
        console.error('[SequenceView] Analysis failed:', err)
        setAnalysisError(err.message || 'Analysis failed. Please try again.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cacheKey])

  const displayAnalysis = cachedAnalysis ?? analysis

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
      {analysisError && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--status-fail-bg)',
          border: '1px solid rgba(184,64,64,0.3)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--status-fail)',
        }}>
          ⚠ {analysisError}
        </div>
      )}
      {displayAnalysis && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Sequence Question
            </div>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: 6 }}>
              "{displayAnalysis.sequenceQuestion}"
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resolution:</span>
              <DiagBadge status={displayAnalysis.answer === 'pass' ? 'pass' : displayAnalysis.answer === 'fail' ? 'fail' : 'warn'} 
                        label={displayAnalysis.answer?.toUpperCase()} />
            </div>
          </div>
          {displayAnalysis.recommendation && (
            <div style={{
              padding: '10px 14px', background: 'var(--status-warn-bg)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
              fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic'
            }}>
              <span style={{ fontWeight: 600, color: '#8A6E1F' }}>→ </span>
              {displayAnalysis.recommendation}
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
            <div className="card-grid-surface" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

  // DnD transform on wrapper — card rotation/skew on inner div
  const wrapperStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  const cardStyle = getCardStyle(scene.id)

  const bmoc = scene.diagnostics
  const bmocItems = [
    { key: 'B', label: 'Beginning', ok: bmoc?.bPresent },
    { key: 'M', label: 'Middle', ok: bmoc?.mPresent },
    { key: 'O', label: 'Obstacle', ok: bmoc?.oPresent },
    { key: 'C', label: 'Climax', ok: bmoc?.cPresent },
  ]

  return (
    <div ref={setNodeRef} style={wrapperStyle}>
      <div
        className="index-card"
        style={{
          ...cardStyle,
          display: 'flex', alignItems: 'stretch',
          borderLeft: `3px solid ${{ pass: '#2A7D6F', warn: '#C09A30', fail: '#B84040' }[bmoc?.status] || '#999'}`,
          padding: 0,
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            padding: '0 6px',
            display: 'flex', alignItems: 'center',
            color: '#635B52',
            cursor: 'grab',
            borderRight: '1px solid rgba(0,0,0,0.08)',
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <GripVertical size={12} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: '0.55rem', color: '#635B52', fontWeight: 600 }}>#{index + 1}</span>
                <span style={{ fontWeight: 700, fontSize: '0.7rem', color: '#1A1814' }}>{scene.heading}</span>
                <DiagBadge status={bmoc?.status} />
              </div>
              <div style={{ fontSize: '0.6rem', color: '#635B52' }}>
                Pages {scene.pageRange[0]}–{scene.pageRange[1]} · {scene.characters?.join(', ')}
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={onOpen} style={{ gap: 4, flexShrink: 0 }}>
              <ZoomIn size={10} />
              Open
            </button>
          </div>

          {/* Synopsis */}
          {scene.synopsis && (
            <div style={{ fontSize: '0.65rem', color: '#4A4540', marginBottom: 6, fontStyle: 'italic' }}>
              {scene.synopsis}
            </div>
          )}

          {/* BMOC indicators */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {bmocItems.map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 2,
                padding: '1px 5px',
                borderRadius: 2,
                background: item.ok ? '#2A7D6F' : '#B84040',
              }}>
                {item.ok
                  ? <CheckCircle size={7} style={{ color: '#fff' }} />
                  : <XCircle size={7} style={{ color: '#fff' }} />
                }
                <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#fff' }}>
                  {item.key}
                </span>
              </div>
            ))}
            {bmoc?.valueShift !== undefined && (
              <div style={{
                padding: '1px 5px', borderRadius: 2, fontSize: '0.5rem', fontWeight: 600,
                background: bmoc.valueShift ? '#2A7D6F' : '#C09A30',
                color: '#fff',
              }}>
                {bmoc.valueShift ? '↕ Shift' : '↔ No shift'}
              </div>
            )}
          </div>

          {/* Warning note */}
          {bmoc?.notes && (
            <div style={{ marginTop: 4, fontSize: '0.6rem', color: '#B85C2C', display: 'flex', gap: 4, alignItems: 'flex-start' }}>
              <AlertTriangle size={9} style={{ flexShrink: 0, marginTop: 1 }} />
              {bmoc.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
