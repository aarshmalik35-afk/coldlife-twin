
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock3,
  Coins,
  Package,
  ShieldCheck,
  Truck,
  Wifi,
  WifiOff,
  LoaderCircle,
  RefreshCw,
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
  tick,
  health
} from '../api/coldlifeApi'


function BackendConnectionBanner({ status, onRetry }) {
  const connected = status?.ok === true
  const checking = status?.checking === true

  const title = checking
    ? 'Checking backend connection'
    : connected
      ? 'Backend connected'
      : 'Backend disconnected'

  const detail = checking
    ? 'Verifying Supabase REST API availability…'
    : connected
      ? 'Supabase REST API is reachable. Dashboard data is being served from your database.'
      : (
          status?.message ||
          'Unable to reach Supabase. Check your project URL, public key, network and database policies.'
        )

  return (
    <div
      className={`connection-banner ${
        checking
          ? 'is-checking'
          : connected
            ? 'is-online'
            : 'is-offline'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="connection-copy">
        <span className="connection-icon">
          {checking ? (
            <LoaderCircle size={17} className="spin" />
          ) : connected ? (
            <Wifi size={17} />
          ) : (
            <WifiOff size={17} />
          )}
        </span>

        <div>
          <div className="connection-title">{title}</div>
          <div className="connection-detail">{detail}</div>
        </div>
      </div>

      {!connected && !checking && (
        <button
          onClick={onRetry}
          className="connection-retry"
        >
          <RefreshCw size={13} />
          Retry connection
        </button>
      )}

      {connected && (
        <span className="connection-state">ONLINE</span>
      )}
    </div>
  )
}


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

  const [backend, setBackend] = useState({
    checking: true,
    ok: false,
    message: ''
  })


  const refresh = useCallback(async () => {
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
    } catch (error) {
      console.error(
        '[ColdLife] Dashboard refresh failed:',
        error
      )
    } finally {
      setLoading(false)
    }
  }, [selected])


  const checkBackend = useCallback(async () => {
    setBackend(current => ({
      ...current,
      checking: true
    }))

    const result = await health()

    setBackend({
      ...result,
      checking: false
    })
  }, [])


  useEffect(() => {
    refresh()
    checkBackend()

    const refreshId = setInterval(() => {
      if (!paused) refresh()
    }, 5000)

    const healthId = setInterval(checkBackend, 15000)

    const tickId = setInterval(async () => {
      if (!paused) {
        try {
          await tick()
        } catch (error) {
          console.warn(
            '[ColdLife] Simulation tick failed:',
            error
          )
        }

        await refresh()
        await checkBackend()
      }
    }, 15000)

    const onRefresh = () => refresh()

    window.addEventListener(
      'coldlife-refresh',
      onRefresh
    )

    return () => {
      clearInterval(refreshId)
      clearInterval(healthId)
      clearInterval(tickId)

      window.removeEventListener(
        'coldlife-refresh',
        onRefresh
      )
    }
  }, [paused, refresh, checkBackend])


  const shipment =
    data.shipments.find(x => x.id === selected) ||
    data.shipments[0]

  const criticalCount = useMemo(
    () => data.shipments.filter(isCriticalShipment).length,
    [data.shipments]
  )


  const runTick = async () => {
    try {
      await tick()
      await refresh()
      await checkBackend()
    } catch (error) {
      console.error(
        '[ColdLife] Manual tick failed:',
        error
      )
    }
  }


  if (loading && !shipment) {
    return (
      <div className="app-loading">
        Loading ColdLife Twin…
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="app-loading error">
        No shipment data available.
      </div>
    )
  }


  return (
    <div className="app-shell">

      <Header
        paused={paused}
        setPaused={setPaused}
        onTick={runTick}
      />

      <main className="dashboard-content">

        {/* BACKEND CONNECTION */}

        <BackendConnectionBanner
          status={backend}
          onRetry={checkBackend}
        />


        {/* DASHBOARD INTRODUCTION */}

        <section className="dashboard-heading">

          <div className="eyebrow">
            OPERATIONS <span>/</span> LIVE DIGITAL TWIN
          </div>

          <h1>Fleet Command Centre</h1>

          <p>
            Live pharmaceutical cold-chain telemetry,
            risk prediction and controlled intervention.
          </p>

          <div className="simulation-status">
            <i />
            Simulation {paused ? 'paused' : 'running'}
            <span>·</span>
            refreshes every 5 sec
          </div>

        </section>


        {/* SIX KPI CARDS */}

        <section
          className="kpi-grid"
          aria-label="Fleet overview"
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
            sub="requires intervention"
            icon={AlertTriangle}
          />

          <KpiCard
            label="Avg survival"
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


        {/* CRITICAL SHIPMENT INTERVENTION */}

        <section className="critical-section">

          <CriticalCasesStrip
            shipments={data.shipments}
            onSelect={setSelected}
          />

        </section>


        {/* FLEET MAP + SHIPMENT DETAILS */}

        <section className="map-detail-grid">

          <div className="glass map-panel">

            <div className="panel-heading">

              <div className="panel-title">
                Live Fleet Map
              </div>

              <div className="panel-subtitle">
                MUMBAI OPERATIONS ZONE · LIVE VEHICLES AND COLD HUBS
              </div>

            </div>

            <div className="map-viewport">

              <FleetMap
                shipments={data.shipments}
                storages={data.storages}
                onSelect={setSelected}
              />

            </div>

          </div>


          <div className="shipment-panel-wrap">

            <ShipmentTwinPanel
              s={shipment}
              onAccept={() =>
                nav(`/shipments/${shipment.id}`)
              }
            />

          </div>

        </section>


        {/* ANALYTICS: TWO CHARTS */}

        <section className="analytics-grid">

          <div className="glass chart-panel">

            <div className="panel-title">
              Temperature trajectory
            </div>

            <div className="panel-subtitle">
              LIVE SENSOR SIGNAL · PERMITTED RANGE SHADED
            </div>

            <TemperatureChart
              data={shipment.tempHistory}
              safeMin={shipment.safeMin}
              safeMax={shipment.safeMax}
            />

          </div>


          <div className="glass chart-panel">

            <div className="panel-title">
              Survival / risk trend
            </div>

            <div className="panel-subtitle">
              PRODUCT VIABILITY SCORE
            </div>

            <RiskTrendChart
              values={shipment.riskHistory}
            />

          </div>

        </section>


        {/* OPERATIONAL DETAILS: THREE COLUMNS */}

        <section className="operations-grid">

          <div className="glass operation-panel">

            <div className="panel-title">
              Chain of custody
            </div>

            <CustodyTimeline
              events={shipment.events}
            />

          </div>


          <div className="operation-panel">

            <VehicleHealthCard s={shipment} />

          </div>


          <div className="operation-panel">

            <DriverBehaviorCard s={shipment} />

          </div>

        </section>


        {/* ACTIVE ALERTS */}

        <section className="glass alerts-panel">

          <div className="alerts-heading">

            <div>
              <div className="panel-title">
                Active alerts
              </div>

              <div className="panel-subtitle">
                PRIORITISED BY OPERATIONAL IMPACT
              </div>
            </div>

            <button
              onClick={() => nav('/alerts')}
              className="view-all"
            >
              View all →
            </button>

          </div>

          <AlertFeed
            alerts={data.alerts}
            onOpen={() => {}}
          />

        </section>


        <footer className="dashboard-footer">
          Operational telemetry and risk status are sourced
          from Supabase. Gemini is reserved for optional
          AI-generated insights.
        </footer>

      </main>

    </div>
  )
}
