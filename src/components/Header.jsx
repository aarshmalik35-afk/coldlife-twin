
import { Snowflake, Pause, Play, RotateCw } from 'lucide-react'

export default function Header({ paused, setPaused, onTick }) {
  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-5 py-3 lg:px-7">

        {/* Brand */}

        <div className="flex items-center gap-3">
          <div className="arctic-logo-mark" aria-label="A.R.C.T.I.C. logo">
            <span className="arctic-logo-orbit" />
            <Snowflake size={22} strokeWidth={1.8} />
          </div>

          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-slate-900">
              A.R.C.T.I.C.
            </div>

            <div className="arctic-brand-expansion text-slate-500">
              Autonomous Risk Computation and Temperature Intelligence Core
            </div>
          </div>
        </div>

        {/* Simulation controls */}

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={() => setPaused?.(!paused)}
            className="header-button"
            aria-label={paused ? 'Resume simulation' : 'Pause simulation'}
            title={paused ? 'Resume simulation' : 'Pause simulation'}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}

            <span className="hidden sm:inline">
              {paused ? 'Resume' : 'Pause'}
            </span>
          </button>

          <button
            type="button"
            onClick={onTick}
            className="header-button header-button-primary"
          >
            <RotateCw size={14} />
            <span>Tick</span>
          </button>

        </div>
      </div>
    </header>
  )
}
