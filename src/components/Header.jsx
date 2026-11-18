
import {
  Activity,
  Pause,
  Play,
  RotateCw
} from 'lucide-react'

export default function Header({
  paused,
  setPaused,
  onTick
}) {
  return (
    <header className="app-header">

      <div className="header-inner">

        <div className="brand-lockup">

          <div className="brand-mark">
            <Activity size={18} strokeWidth={2.2} />
          </div>

          <div>
            <div className="brand-name">
              ColdLife Twin
            </div>

            <div className="brand-subtitle">
              Cold-chain intelligence platform
            </div>
          </div>

        </div>

        <div className="header-actions">

          <button
            type="button"
            onClick={() => setPaused?.(!paused)}
            className="header-button"
            aria-label={
              paused
                ? 'Resume simulation'
                : 'Pause simulation'
            }
            title={
              paused
                ? 'Resume simulation'
                : 'Pause simulation'
            }
          >
            {paused
              ? <Play size={13} />
              : <Pause size={13} />
            }

            <span>
              {paused ? 'Resume' : 'Pause'}
            </span>
          </button>

          <button
            type="button"
            onClick={onTick}
            className="header-button header-button-primary"
          >
            <RotateCw size={13} />
            Run tick
          </button>

        </div>

      </div>

    </header>
  )
}
