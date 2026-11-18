
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock3,
  Coins,
  Package,
  ShieldCheck,
  Truck
} from 'lucide-react'

import Header from '../components/Header'
import KpiCard from '../components/KpiCard'
import FleetMap from '../components/FleetMap'
import ShipmentTwinPanel from '../components/ShipmentTwinPanel'
import TemperatureChart from '../components/TemperatureChart'
import RiskTrendChart from '../components/RiskTrendChart'
import CustodyTimeline from '../components/CustodyTimeline'
import VehicleHealthCard from '../components/VehicleHealthCard'
import DriverBehaviorCard from '../components/DriverBehaviorCard'
import AlertFeed from '../components/AlertFeed'
import CriticalCasesStrip, {
  isCriticalShipment
} from '../components/CriticalCasesStrip'

import {
  getAlerts,
  getDashboard,
  getShipments,
  getStorages,
  tick
} from '../api/coldlifeApi'

export default function Dashboard() {
  const nav = useNavigate()

  const [data, setData] = useState({
    dashboard: {},
    shipments: [],
    storages: [],
    alerts: []
  })

  const [selected, setSelected] = useState('CLT-2403')
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const [
        dashboard,
        shipments,
        storages,
        alerts
      ] = await Promise.all([
        getDashboard(),
        getShipments(),
        getStorages(),
        getAlerts()
      ])

      setData({
        dashboard,
        shipments,
        storages,
        alerts
      })

      if (
        !shipments.find(x => x.id === selected) &&
        shipments[0]
      ) {
        setSelected(shipments[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()

    const refreshId = setInterval(() => {
      if (!paused) refresh()
    }, 5000)

    const tickId = setInterval(async () => {
      if (!paused) {
        await tick()
        await refresh()
      }
    }, 15000)

    const onRefresh = () => refresh()

    window.addEventListener('coldlife-refresh', onRefresh)

    return () => {
      clearInterval(refreshId)
      clearInterval(tickId)
      window.removeEventListener(
        'coldlife-refresh',
        onRefresh
      )
    }
  }, [paused])

  const s =
    data.shipments.find(x => x.id === selected) ||
    data.shipments[0]

  const criticalCount = useMemo(
    () => data.shipments.filter(isCriticalShipment).length,
    [data.shipments]
  )

  if (loading && !s) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center text-slate-400">
        Loading ColdLife Twin…
      </div>
    )
  }

  if (!s) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center text-red-300">
        No shipment data available.
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg">

      <Header
        paused={paused}
        setPaused={setPaused}
        onTick={async () => {
          await tick()
          await refresh()
        }}
      />

      <main className="dashboard-main">

        {/* INTRODUCTION */}

        <section className="dashboard-intro">
          <div>
            <div className="eyebrow">
              Operations / Live digital twin
            </div>

            <h1 className="page-title">
              Fleet command centre
            </h1>

            <p className="page-description">
              A consolidated view of fleet movement, cargo
              condition and cold-chain risk across your operation.
            </p>
          </div>

          <div className="live-indicator">
            <span className="live-dot" />
            Simulation {paused ? 'paused' : 'running'}
            <span aria-hidden="true">·</span>
            refreshes every 5 sec
          </div>
        </section>

        {/* FLEET OVERVIEW */}

        <section
          className="kpi-grid"
          aria-label="Fleet overview metrics"
        >
          <KpiCard
            label="Active fleet"
            value={
              data.dashboard.activeFleet ??
              data.shipments.length
            }
            sub="refrigerated vehicles"
            icon={Truck}
          />

          <KpiCard
            label="Active shipments"
            value={
              data.dashboard.activeShipments ??
              data.shipments.length
            }
            sub="tracked digital twins"
            icon={Package}
          />

          <KpiCard
            label="Critical shipments"
            value={criticalCount}
            sub="require intervention"
            icon={AlertTriangle}
          />

          <KpiCard
            label="Average survival"
            value={`${data.dashboard.avgSurvival ?? 0}%`}
            sub="predicted viability"
            icon={ShieldCheck}
          />

          <KpiCard
            label="On-time delivery"
            value={`${data.dashboard.onTime ?? 0}%`}
            sub="current forecast"
            icon={Clock3}
          />

          <KpiCard
            label="Loss avoided"
            value={data.dashboard.lossAvoided ?? '₹0'}
            sub={`${data.dashboard.batchesSaved ?? 0} batches saved`}
            icon={Coins}
          />
        </section>

        {/* CRITICAL SHIPMENTS */}

        <CriticalCasesStrip
          shipments={data.shipments}
          onSelect={setSelected}
        />

        {/* LIVE MAP + SELECTED SHIPMENT */}

        <section className="map-detail-grid">

          <div className="glass map-panel">

            <div className="map-panel-heading">
              <div className="section-heading">
                Fleet in motion
              </div>

              <div className="section-kicker">
                Mumbai operations zone · vehicles and cold-storage hubs
              </div>
            </div>

            <div className="map-frame">
              <FleetMap
                shipments={data.shipments}
                storages={data.storages}
                onSelect={setSelected}
              />
            </div>

          </div>

          <ShipmentTwinPanel
            s={s}
            onAccept={() => nav(`/shipments/${s.id}`)}
          />

        </section>

        {/* ANALYTICS */}

        <section className="chart-grid">

          <div className="glass p-5">
            <div className="section-heading">
              Temperature trajectory
            </div>

            <div className="text-xs text-slate-500">
              Shipment temperature against its permitted range
            </div>

            <TemperatureChart
              data={s.tempHistory}
              safeMin={s.safeMin}
              safeMax={s.safeMax}
            />
          </div>

          <div className="glass p-5">
            <div className="section-heading">
              Survival / risk trend
            </div>

            <div className="text-xs text-slate-500">
              Product viability score over the journey
            </div>

            <RiskTrendChart values={s.riskHistory} />
          </div>

        </section>

        {/* OPERATIONAL INTELLIGENCE */}

        <section className="detail-grid">

          <div className="glass p-5">
            <div className="mb-4 section-heading">
              Chain of custody
            </div>

            <CustodyTimeline events={s.events} />
          </div>

          <VehicleHealthCard s={s} />

          <DriverBehaviorCard s={s} />

        </section>

        {/* ALERTS */}

        <section className="glass alerts-panel p-5">

          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="section-heading">
                Active alerts
              </div>

              <div className="section-kicker">
                Prioritised by operational impact
              </div>
            </div>

            <button
              onClick={() => nav('/alerts')}
              className="text-xs font-bold text-cyan-700 hover:text-cyan-900"
            >
              View all alerts →
            </button>
          </div>

          <AlertFeed
            alerts={data.alerts}
            onOpen={() => {}}
          />

        </section>

      </main>
    </div>
  )
}
