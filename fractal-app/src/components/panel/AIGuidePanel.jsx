import { useState, useEffect, useRef, useMemo } from 'react'
import useUIStore from '../../store/uiStore'
import useScreenplayStore from '../../store/screenplayStore'
import useAnalysisStore from '../../store/analysisStore'
import { chatWithGuide } from '../../services/claudeService'
import ChatMessage from './ChatMessage'

// ZOOM_LEVELS: FULL_SCRIPT=0, ACT=1, SEQUENCE=2, SCENE=3, BEAT=4
function findUnit(screenplay, unitType, id) {
  for (const act of (screenplay?.acts || [])) {
    if (unitType === 'act' && act.id === id) return act
    for (const seq of (act.sequences || [])) {
      if (unitType === 'sequence' && seq.id === id) return seq
      for (const scene of (seq.scenes || [])) {
        if ((unitType === 'scene') && scene.id === id) return scene
      }
    }
  }
  return null
}

function buildCurrentContext(zoom, activeUnitId, screenplay) {
  if (zoom === 0 || !activeUnitId) {
    return { unitId: null, unitType: 'full-script', unitData: null }
  }

  const typeMap = { 1: 'act', 2: 'sequence', 3: 'scene', 4: 'scene' }
  const unitType = typeMap[zoom] || 'full-script'

  const unitData = findUnit(screenplay, unitType, activeUnitId)
  return { unitId: activeUnitId, unitType, unitData }
}

export default function AIGuidePanel() {
  const guideMode = useUIStore(s => s.guideMode)
  const setGuideMode = useUIStore(s => s.setGuideMode)
  const zoom = useUIStore(s => s.zoom)
  const activeUnitId = useUIStore(s => s.activeUnitId)

  const screenplay = useScreenplayStore(s => s.screenplay)
  const appendGuideMessage = useScreenplayStore(s => s.appendGuideMessage)

  const snapshotCache = useAnalysisStore(s => s.snapshotCache)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const messages = screenplay?.guideThread || []

  const contextLabel = useMemo(() => {
    if (zoom === 0 || !activeUnitId) return 'Full Script'
    const typeMap = { 1: 'act', 2: 'sequence', 3: 'scene', 4: 'scene' }
    const unitType = typeMap[zoom]
    const unit = findUnit(screenplay, unitType, activeUnitId)
    if (!unit) return 'Full Script'
    if (unitType === 'act') return unit.label || 'Act'
    if (unitType === 'sequence') return unit.label || 'Sequence'
    if (unitType === 'scene') return `${unit.heading || 'Scene'}${unit.pageRange ? ` · p.${unit.pageRange[0]}` : ''}`
    return 'Full Script'
  }, [zoom, activeUnitId, screenplay])

  const handleWhy = async (messageId) => {
    if (isLoading) return
    setIsLoading(true)

    const whyText = 'Why does this matter? Explain the principle behind your last suggestion.'
    const currentMessages = screenplay?.guideThread || []
    const context = buildCurrentContext(zoom, activeUnitId, screenplay)

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: whyText,
      timestamp: new Date().toISOString(),
      contextUnitId: activeUnitId,
      contextUnitType: context.unitType,
      cardType: null,
      cardData: null,
    }
    appendGuideMessage(userMsg)

    const thread = [...currentMessages, userMsg].slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      // Always use coach mode for Why? explanations
      const result = await chatWithGuide(whyText, context, 'coach', thread, screenplay)
      appendGuideMessage({
        id: `msg-${Date.now() + 1}`,
        role: 'ai',
        content: result.content,
        timestamp: new Date().toISOString(),
        contextUnitId: activeUnitId,
        contextUnitType: context.unitType,
        cardType: result.cardType,
        cardData: result.cardData,
      })
    } catch (err) {
      console.error('[AIGuidePanel] Why? failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Show opening message from snapshot cache on first mount (no network call)
  useEffect(() => {
    const thread = screenplay?.guideThread || []
    const opening = snapshotCache?.openingMessage
    if (thread.length === 0 && opening) {
      appendGuideMessage({
        id: `msg-${Date.now()}`,
        role: 'ai',
        content: opening,
        timestamp: new Date().toISOString(),
        contextUnitId: null,
        contextUnitType: 'full-script',
        cardType: null,
        cardData: null,
      })
    }
  }, [snapshotCache?.openingMessage])

  // Auto-scroll to bottom when messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)

    // Capture current messages BEFORE appending so the thread can include userMsg
    const currentMessages = screenplay?.guideThread || []

    // Build context BEFORE creating userMsg so contextUnitType is available
    const context = buildCurrentContext(zoom, activeUnitId, screenplay)

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      contextUnitId: activeUnitId,
      contextUnitType: context.unitType,
      cardType: null,
      cardData: null,
    }
    appendGuideMessage(userMsg)

    // Build thread from pre-append messages + the new userMsg so Claude always
    // sees the user's current turn as the last message (avoids stale closure)
    const thread = [...currentMessages, userMsg].slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const result = await chatWithGuide(text, context, guideMode, thread, screenplay)
      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        role: 'ai',
        content: result.content,
        timestamp: new Date().toISOString(),
        contextUnitId: activeUnitId,
        contextUnitType: context.unitType,
        cardType: result.cardType,
        cardData: result.cardData,
      }
      appendGuideMessage(aiMsg)
    } catch (err) {
      console.error('[AIGuidePanel] Chat failed:', err)
      appendGuideMessage({
        id: `msg-err-${Date.now()}`,
        role: 'ai',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
        contextUnitId: null,
        contextUnitType: null,
        cardType: null,
        cardData: null,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Mode switcher */}
      <div style={{
        display: 'flex',
        gap: '5px',
        padding: '8px 10px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface-2)',
        flexShrink: 0,
      }}>
        {['coach', 'director', 'fast'].map(mode => (
          <button
            key={mode}
            onClick={() => setGuideMode(mode)}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.6875rem',
              fontWeight: guideMode === mode ? 600 : 500,
              textAlign: 'center',
              fontFamily: 'var(--font-ui)',
              textTransform: 'capitalize',
              cursor: 'pointer',
              background: guideMode === mode ? 'var(--accent-primary)' : 'transparent',
              color: guideMode === mode ? 'var(--text-on-accent)' : 'var(--text-muted)',
              border: guideMode === mode ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
              transition: 'all 0.15s ease',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Context bar — shows current navigation context */}
      <div style={{
        padding: '5px 10px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}>
          Viewing:
        </span>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '0.6875rem',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {contextLabel}
        </span>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--bg-canvas)',
      }}>
        {messages.length === 0 && !snapshotCache && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-editorial)',
                fontSize: '1rem',
                color: 'var(--text-muted)',
                marginBottom: '8px',
              }}>
                Run a full-script analysis first
              </p>
              <p style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
              }}>
                Upload a screenplay to get started.
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onWhy={msg.role === 'ai' ? handleWhy : undefined}
          />
        ))}

        {isLoading && (
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            padding: '4px 2px',
          }}>
            Guide is thinking…
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        gap: '7px',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask anything about your script…"
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            fontSize: '0.8125rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0 }}
        >
          {isLoading ? '…' : '↑'}
        </button>
      </div>
    </div>
  )
}
