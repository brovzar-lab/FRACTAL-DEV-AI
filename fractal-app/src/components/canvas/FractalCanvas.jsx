import { AnimatePresence, motion } from 'framer-motion'
import useScreenplayStore, { ZOOM_LEVELS } from '../../store/screenplayStore'
import FullScriptView from '../../views/FullScriptView'
import ActView from '../../views/ActView'
import SequenceView from '../../views/SequenceView'
import SceneView from '../../views/SceneView'
import BeatView from '../../views/BeatView'
import UploadPrompt from '../upload/UploadPrompt'

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
        <View />
      </motion.div>
    </AnimatePresence>
  )
}
