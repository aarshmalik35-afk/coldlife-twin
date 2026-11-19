import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BrainCircuit } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { getShipment, getStorages } from '../api/coldlifeApi'
import FleetMap from '../components/FleetMap'
import TemperatureChart from '../components/TemperatureChart'
import RiskTrendChart from '../components/RiskTrendChart'
import SurvivalGauge from '../components/SurvivalGauge'
import StatusBadge from '../components/StatusBadge'
import RecommendationCard from '../components/RecommendationCard'
import CustodyTimeline from '../components/CustodyTimeline'
import VehicleHealthCard from '../components/VehicleHealthCard'
import DriverBehaviorCard from '../components/DriverBehaviorCard'

export default function ShipmentDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [s, setS] = useState(null)
  const [storages, setStorages] = useState([])
  const [pageError, setPageError] = useState('')

  const refreshShipment = useCallback(async () => {
    try {
      const fresh = await getShipment(id)
      setS(fresh)
      setPageError('')
      return fresh
    } catch (error) {
      setPageError(error?.message || 'Could not refresh shipment data.')
      throw error
    }
  }, [id])

  useEffect(() => {
    let active = true

    getShipment(id)
      .then(value => { if (active) setS(value) })
      .catch(error => { if (active) setPageError(error?.message || 'Could not load shipment.') })

    getStorages()
      .then(value => { if (active) setStorages(value) })
      .catch(error => { if (active) setPageError(error?.message || 'Could not load storage locations.') })

    // The dashboard already polls live Supabase state. Shipment detail must
    // do the same; otherwise its telemetry, driver, vehicle and custody cards
    // stay frozen after the first page load.
    const refreshId = window.setInterval(() => {
      getShipment(id)
        .then(value => { if (active) setS(value) })
        .catch(error => {
          if (active) setPageError(error?.message || 'Could not refresh shipment data.')
        })
    }, 5000)

    return () => {
      active = false
      window.clearInterval(refreshId)
    }
  }, [id])

  if (!s) {
    return (
      <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-3 text-slate-400">
        {pageError ? <span role="alert" className="text-red-300">{pageError}</span> : 'Loading shipment…'}
        {pageError && <button onClick={refreshShipment} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Retry</button>}
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg p-5 lg:p-8">
      <main className="mx-auto max-w-[1600px]">
        <button onClick={() => nav('/')} className="mb-5 flex items-center gap-2 text-xs text-slate-400">
          <ArrowLeft size={15}/> Back to command centre
        </button>

        {pageError && <div role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{pageError}</div>}

        <div className="glass mb-5 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-slate-500">{s.id} · {s.batch} · {s.vehicle}</div>
              <h1 className="mt-1 text-3xl font-extrabold">{s.product}</h1>
              <div className="mt-2 text-sm text-slate-400">{s.driver} · {s.driverStyle} driving profile</div>
            </div>
            <div className="flex items-center gap-5">
              <SurvivalGauge value={s.survival}/>
              <StatusBadge status={s.status} shipment={s}/>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
          <div className="glass rounded-2xl p-3"><FleetMap shipments={[s]} storages={storages}/></div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 font-semibold"><BrainCircuit size={18} className="text-cyan-300"/> AI analysis</div>
            <div className="mt-5"><RecommendationCard shipment={s} onActionComplete={refreshShipment}/></div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-5"><div className="font-semibold">Temperature history</div><TemperatureChart data={s.tempHistory} safeMin={s.safeMin} safeMax={s.safeMax}/></div>
          <div className="glass rounded-2xl p-5"><div className="font-semibold">Survival trajectory</div><RiskTrendChart values={s.riskHistory}/></div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <VehicleHealthCard s={s}/>
          <DriverBehaviorCard s={s}/>
          <div className="glass rounded-2xl p-5"><div className="mb-4 font-semibold">Chain of custody</div><CustodyTimeline events={s.events}/></div>
        </div>
      </main>
    </div>
  )
}
