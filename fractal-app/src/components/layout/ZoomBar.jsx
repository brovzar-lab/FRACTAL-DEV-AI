import { Fragment } from 'react'
import { BookOpen, Bookmark, Layers, Clapperboard, Target, ChevronRight } from 'lucide-react'
import useScreenplayStore, { ZOOM_LABELS } from '../../store/screenplayStore'

const ZOOM_ICONS = [BookOpen, Bookmark, Layers, Clapperboard, Target]

export default function ZoomBar() {
  const { zoom, drillOut } = useScreenplayStore()

  return (
    <div className="zoom-bar">
      <span className="zoom-level-label">ZOOM LEVEL</span>
      <div className="zoom-path">
        {ZOOM_LABELS.map((label, level) => {
          const Icon = ZOOM_ICONS[level]
          return (
            <Fragment key={level}>
              {level > 0 && (
                <span className="zoom-connector">
                  <ChevronRight size={14} />
                </span>
              )}
              <button
                className={`zoom-node${level === zoom ? ' active' : ''}`}
                onClick={() => drillOut(level)}
                title={`Zoom to ${label}`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
