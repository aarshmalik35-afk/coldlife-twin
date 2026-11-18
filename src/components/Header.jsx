
import { Activity, Pause, Play, RotateCw } from 'lucide-react'

export default function Header({ paused, setPaused, onTick }) {
  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-5 py-3 lg:px-7">

        {/* Brand */}

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 text-cyan-700 shadow-[0_2px_10px_rgba(28,104,130,.10),inset_0_1px_0_white]">
            <Activity size={19} strokeWidth={2.1} />
          </div>

          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-slate-900">
              ColdLife Twin
            </div>

            <div className="text-[10px] font-semibold uppercase tracking-[.17em] text-slate-500">
              Cold-chain intelligence platform
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
