import { lazy, Suspense } from 'react'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import useScreenplayStore, { ZOOM_LEVELS } from '../../store/screenplayStore'
import UploadPrompt from '../upload/UploadPrompt'

// Lazy-load views — each becomes its own chunk, only parsed when first visited
const FullScriptView = lazy(() => import('../../views/FullScriptView'))
const ActView        = lazy(() => import('../../views/ActView'))
const SequenceView   = lazy(() => import('../../views/SequenceView'))
const SceneView      = lazy(() => import('../../views/SceneView'))
const BeatView       = lazy(() => import('../../views/BeatView'))

const views = {
  [ZOOM_LEVELS.FULL_SCRIPT]: FullScriptView,
  [ZOOM_LEVELS.ACT]: ActView,
  [ZOOM_LEVELS.SEQUENCE]: SequenceView,
  [ZOOM_LEVELS.SCENE]: SceneView,
  [ZOOM_LEVELS.BEAT]: BeatView,
}

const slideVariants = {
  enter: (direction) => ({
    opacity: 0,
    scale: direction > 0 ? 0.96 : 1.03,
    y: direction > 0 ? 12 : -8,
  }),
  center: { opacity: 1, scale: 1, y: 0 },
  exit: (direction) => ({
    opacity: 0,
    scale: direction > 0 ? 1.02 : 0.97,
    y: direction > 0 ? -8 : 12,
  }),
}

export default function FractalCanvas() {
  const { zoom, screenplay } = useScreenplayStore()

  if (!screenplay) return <UploadPrompt />

  const View = views[zoom] || FullScriptView

  return (
    <AnimatePresence mode="wait" custom={zoom}>
      <motion.div
        key={zoom}
        custom={zoom}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <Suspense fallback={
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Loading…
          </div>
        }>
          <View />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
