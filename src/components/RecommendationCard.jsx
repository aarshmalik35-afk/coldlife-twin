import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, LoaderCircle, Sparkles, Snowflake, TriangleAlert, Zap } from 'lucide-react'
import { getGeminiPrediction, performShipmentAction } from '../api/coldlifeApi'

const n = (v, f = 0) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : f
}

function instantPrediction(s = {}) {
  const temps = (s.tempHistory || []).slice(-5).map(x => n(x.temp ?? x.temperature ?? x.value))
  const last = temps.at(-1) ?? n(s.temperature)
  const first = temps[0] ?? last
  const slope = temps.length > 1 ? (last - first) / (temps.length - 1) : 0
  const predictedTemp = last + slope * 2.2
  const safeMax = n(s.safeMax, 8)
  const safeMin = n(s.safeMin, 2)
  const survival = n(s.survival, 95)

  let risk = 'low'
  if (
    s.status === 'critical' ||
    predictedTemp >= safeMax + 0.5 ||
    predictedTemp <= safeMin - 0.5 ||
    survival <= 70
  ) risk = 'critical'
  else if (
    predictedTemp > safeMax ||
    predictedTemp < safeMin ||
    survival < 90
  ) risk = 'medium'

  const riskScore =
    risk === 'critical' ? Math.max(82, 100 - survival) :
    risk === 'medium' ? Math.max(45, 100 - survival) :
    Math.max(8, 100 - survival)

  return {
    risk_level: risk,
    risk_score: Math.round(riskScore),
    predicted_temperature_15m: Number(predictedTemp.toFixed(1)),
    predicted_survival_30m: Math.max(
      20,
      Math.min(100, Math.round(survival - Math.max(0, predictedTemp - safeMax) * 2.5))
    ),
    minutes_to_critical: risk === 'critical' ? 10 : risk === 'medium' ? 30 : null,
    cooling_action: risk === 'critical'
      ? 'Boost cooling and hold for quality review'
      : risk === 'medium'
        ? 'Increase cooling and monitoring frequency'
        : 'Maintain current reefer setting',
    recommendation: s.recommendation || 'Continue monitoring.',
    explanation: 'Instant estimate from the latest temperature slope, survival score and configured safe range.',
    confidence: 72,
    source: 'instant',
  }
}

function styleFor(risk) {
  if (risk === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-200'
  if (risk === 'high') return 'border-orange-400/30 bg-orange-400/10 text-orange-200'
  if (risk === 'medium') return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
}

export default function RecommendationCard({ shipment, onAccept, onActionComplete }) {
  const s = shipment || {}
  const immediate = useMemo(() => instantPrediction(s), [
    s?.id,
    s?.temperature,
    s?.survival,
    s?.status,
    s?.safeMin,
    s?.safeMax,
    s?.tempHistory,
  ])

  const [prediction, setPrediction] = useState(immediate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setPrediction(immediate)
    setError('')
  }, [s?.id, immediate])

  const runShipmentAction = async (action) => {
    if (!s?.id || actionLoading) return
    setActionLoading(action)
    setActionMessage('')
    setActionError('')

    try {
      const result = await performShipmentAction(
        s.id,
        action,
        action === 'QUARANTINE'
          ? 'Operator initiated quarantine from shipment detail.'
          : 'Operator initiated reefer cooling boost from shipment detail.'
      )

      if (result?.ok === false) {
        throw new Error(result.error || 'The database did not confirm this action.')
      }

      setActionMessage(
        action === 'QUARANTINE'
          ? 'Shipment successfully quarantined.'
          : 'Cooling boost applied successfully.'
      )
      if (onActionComplete) await onActionComplete()
    } catch (e) {
      setActionError(e?.message || 'The shipment action could not be completed.')
    } finally {
      setActionLoading('')
    }
  }

  const runAI = async () => {
    if (!s?.id) return
    setPrediction(immediate) // show result immediately
    setLoading(true)
    setError('')

    try {
      const result = await getGeminiPrediction(s)
      setPrediction({ ...result, source: result.cached ? 'gemini-cache' : 'gemini' })
    } catch (e) {
      setError('Gemini refinement unavailable; showing instant prediction.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <BrainCircuit size={17} className="text-cyan-300" />
            AI prediction
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Instant local risk + fast Gemini refinement
          </div>
        </div>

        <button
          type="button"
          onClick={runAI}
          disabled={loading || !s?.id}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-400/15 disabled:opacity-50"
        >
          {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Refining…' : 'Fast AI'}
        </button>
      </div>

      <div className={`mt-4 rounded-xl border p-3 ${styleFor(prediction.risk_level)}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              Predicted risk
            </div>
            <div className="mt-1 text-lg font-extrabold capitalize">
              {prediction.risk_level}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">{n(prediction.risk_score).toFixed(0)}</div>
            <div className="text-[10px] opacity-70">/100</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-700/50 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Temperature +15m</div>
          <div className="mt-1 text-lg font-black text-slate-100">
            {n(prediction.predicted_temperature_15m).toFixed(1)}°C
          </div>
        </div>
        <div className="rounded-xl border border-slate-700/50 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Survival +30m</div>
          <div className="mt-1 text-lg font-black text-slate-100">
            {n(prediction.predicted_survival_30m).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700/50 p-3 text-sm leading-6 text-slate-300">
        <div className="flex items-center gap-2 font-semibold text-cyan-200">
          <Snowflake size={15} />
          {prediction.cooling_action}
        </div>
        <div className="mt-2">{prediction.recommendation}</div>
        <div className="mt-2 text-xs text-slate-500">{prediction.explanation}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-600">
          <span>Confidence {n(prediction.confidence).toFixed(0)}%</span>
          {Number(prediction.minutes_to_critical) > 0 && (
            <span>· critical in ~{prediction.minutes_to_critical} min</span>
          )}
          <span>· source {prediction.source || 'instant'}</span>
        </div>
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs text-cyan-200">
          <Zap size={14} />
          Instant result shown. Gemini is refining it with a smaller low-latency request.
        </div>
      )}

      {s.status === 'critical' && (
        <div className="mt-3 flex gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200">
          <TriangleAlert size={16} className="shrink-0" />
          Critical shipment state is active.
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs text-amber-300">{error}</div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => runShipmentAction('BOOST_COOLING')}
          disabled={Boolean(actionLoading)}
          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-3 py-2.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/25 disabled:cursor-wait disabled:opacity-55"
        >
          <Snowflake size={14} />
          {actionLoading === 'BOOST_COOLING' ? 'Boosting…' : 'Boost cooling'}
        </button>
        <button
          type="button"
          onClick={() => runShipmentAction('QUARANTINE')}
          disabled={Boolean(actionLoading)}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-300/15 px-3 py-2.5 text-xs font-bold text-red-100 transition hover:bg-red-300/25 disabled:cursor-wait disabled:opacity-55"
        >
          <TriangleAlert size={14} />
          {actionLoading === 'QUARANTINE' ? 'Quarantining…' : 'Quarantine'}
        </button>
      </div>

      {actionMessage && (
        <div role="status" className="mt-2 text-xs text-emerald-300">{actionMessage}</div>
      )}
      {actionError && (
        <div role="alert" className="mt-2 text-xs text-red-300">{actionError}</div>
      )}

      {onAccept && (
        <button
          type="button"
          onClick={() => onAccept(s.id)}
          className="mt-4 w-full rounded-xl bg-cyan-400/10 px-3 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-400/15"
        >
          Accept recommended action
        </button>
      )}
    </div>
  )
}
