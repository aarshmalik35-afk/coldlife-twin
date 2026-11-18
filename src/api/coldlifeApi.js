
import { supabase, checkSupabaseConnection } from '../lib/supabase'

const num = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const p1 = toRad(lat1)
  const p2 = toRad(lat2)
  const dp = toRad(Number(lat2) - Number(lat1))
  const dl = toRad(Number(lon2) - Number(lon1))
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const formatEtaClock = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const computeEta = ({ row, vehicle, destination }) => {
  const now = Date.now()
  const dbEta = row?.eta ? new Date(row.eta) : null
  let minutes = null
  let distanceKm = null

  const lat = num(row?.latitude)
  const lng = num(row?.longitude)
  const dLat = num(destination?.latitude ?? destination?.lat, NaN)
  const dLng = num(destination?.longitude ?? destination?.lng, NaN)

  if (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Number.isFinite(dLat) && Number.isFinite(dLng)
  ) {
    distanceKm = haversineKm(lat, lng, dLat, dLng)
  }

  if (dbEta && !Number.isNaN(dbEta.getTime()) && dbEta.getTime() > now + 60_000) {
    minutes = Math.max(1, Math.round((dbEta.getTime() - now) / 60_000))
  } else if (Number.isFinite(distanceKm)) {
    const speed = Math.max(24, Math.min(72, num(vehicle?.speed_kmh, 42)))
    minutes = Math.max(5, Math.round((distanceKm / speed) * 60))
  } else {
    minutes = 35
  }

  const etaDate = new Date(now + minutes * 60_000)

  return {
    etaMinutes: minutes,
    etaText: `${minutes} min`,
    etaDisplay: `${minutes} min · ${formatEtaClock(etaDate)}`,
    etaClock: formatEtaClock(etaDate),
    etaAt: etaDate.toISOString(),
    estimatedArrival: etaDate.toISOString(),
    distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null,
    remainingKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null,
  }
}

const labelTime = (iso, fallback = '') => {
  if (!iso) return fallback
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const safe = async (promise, fallback = []) => {
  try {
    const { data, error } = await promise
    if (error) {
      console.warn('[ColdLife] optional query failed:', error.message)
      return fallback
    }
    return data ?? fallback
  } catch (e) {
    console.warn('[ColdLife] optional query exception:', e?.message || e)
    return fallback
  }
}

const fallbackStorages = [
  {
    id: 'HUB-MUM-01',
    code: 'HUB-MUM-01',
    name: 'Mumbai Central Cold Hub',
    city: 'Mumbai',
    lat: 19.076,
    lng: 72.8777,
    latitude: 19.076,
    longitude: 72.8777,
    status: 'operational',
    safeMin: 2,
    safeMax: 8,
  },
  {
    id: 'HUB-NAVI-01',
    code: 'HUB-NAVI-01',
    name: 'Navi Mumbai Distribution Hub',
    city: 'Navi Mumbai',
    lat: 19.033,
    lng: 73.0297,
    latitude: 19.033,
    longitude: 73.0297,
    status: 'operational',
    safeMin: 2,
    safeMax: 8,
  },
  {
    id: 'HUB-THA-01',
    code: 'HUB-THA-01',
    name: 'Thane Cold Storage',
    city: 'Thane',
    lat: 19.2183,
    lng: 72.9781,
    latitude: 19.2183,
    longitude: 72.9781,
    status: 'operational',
    safeMin: 2,
    safeMax: 8,
  },
]

const fallbackRows = [
  {
    id: 'fallback-1',
    tracking_code: 'CLT-2401',
    product_name: 'Insulin Glargine',
    batch_no: 'INS-2026-A14',
    quantity: 480,
    status: 'in_transit',
    priority: 'normal',
    current_temp_c: 4.2,
    current_humidity_pct: 58,
    survival_score: 98,
    risk_level: 'low',
    recommendation: 'Conditions stable. Continue standard monitoring.',
    latitude: 19.090,
    longitude: 72.890,
    target_temp_min_c: 2,
    target_temp_max_c: 8,
    vehicle_id: 'fv1',
    started_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'fallback-2',
    tracking_code: 'CLT-2402',
    product_name: 'mRNA Vaccine',
    batch_no: 'VAC-2026-B07',
    quantity: 1200,
    status: 'in_transit',
    priority: 'high',
    current_temp_c: 6.4,
    current_humidity_pct: 62,
    survival_score: 91,
    risk_level: 'medium',
    recommendation: 'Cooling recovered after intervention. Continue enhanced monitoring.',
    latitude: 19.060,
    longitude: 72.930,
    target_temp_min_c: 2,
    target_temp_max_c: 8,
    vehicle_id: 'fv2',
    started_at: new Date(Date.now() - 8400000).toISOString(),
  },
  {
    id: 'fallback-3',
    tracking_code: 'CLT-2403',
    product_name: 'Biologic Therapy',
    batch_no: 'BIO-2026-C09',
    quantity: 180,
    status: 'quarantined',
    priority: 'critical',
    current_temp_c: 10.8,
    current_humidity_pct: 74,
    survival_score: 54,
    risk_level: 'critical',
    recommendation: 'Quarantine shipment and require trained quality review before release.',
    latitude: 19.130,
    longitude: 72.850,
    target_temp_min_c: 2,
    target_temp_max_c: 8,
    vehicle_id: 'fv3',
    started_at: new Date(Date.now() - 9600000).toISOString(),
  },
  {
    id: 'fallback-4',
    tracking_code: 'CLT-2404',
    product_name: 'Oncology Injectables',
    batch_no: 'ONC-2026-D12',
    quantity: 320,
    status: 'in_transit',
    priority: 'critical',
    current_temp_c: 3.9,
    current_humidity_pct: 55,
    survival_score: 96,
    risk_level: 'low',
    recommendation: 'Priority shipment: maintain expedited route and receiving handoff.',
    latitude: 19.180,
    longitude: 72.970,
    target_temp_min_c: 2,
    target_temp_max_c: 8,
    vehicle_id: 'fv4',
    started_at: new Date(Date.now() - 6500000).toISOString(),
  },
]

const fallbackVehicles = [
  {
    id: 'fv1',
    code: 'CL-REEFER-01',
    registration_no: 'MH01CL1001',
    driver_name: 'Arjun Mehta',
    status: 'in_transit',
    battery_pct: 94,
    speed_kmh: 46,
    fuel_level_pct: 86,
    fuel_consumption_lph: 8.1,
    engine_temp_c: 84,
    reefer_power_pct: 70,
  },
  {
    id: 'fv2',
    code: 'CL-REEFER-02',
    registration_no: 'MH02CL2002',
    driver_name: 'Neha Kapoor',
    status: 'alert',
    battery_pct: 88,
    speed_kmh: 42,
    fuel_level_pct: 78,
    fuel_consumption_lph: 8.8,
    engine_temp_c: 86,
    reefer_power_pct: 83,
  },
  {
    id: 'fv3',
    code: 'CL-REEFER-03',
    registration_no: 'MH03CL3003',
    driver_name: 'Riya Sharma',
    status: 'alert',
    battery_pct: 78,
    speed_kmh: 29,
    fuel_level_pct: 69,
    fuel_consumption_lph: 9.5,
    engine_temp_c: 91,
    reefer_power_pct: 96,
  },
  {
    id: 'fv4',
    code: 'CL-REEFER-04',
    registration_no: 'MH04CL4004',
    driver_name: 'Kabir Malhotra',
    status: 'in_transit',
    battery_pct: 96,
    speed_kmh: 55,
    fuel_level_pct: 91,
    fuel_consumption_lph: 8.4,
    engine_temp_c: 83,
    reefer_power_pct: 68,
  },
]

function makeHistory(row, count = 24) {
  const baseTemp = num(row.current_temp_c, 4.5)
  const baseSurvival = num(row.survival_score, 95)

  return Array.from({ length: count }, (_, i) => {
    const t = i - (count - 1)
    const critical = row.risk_level === 'critical'
    const watch = row.risk_level === 'medium' || row.risk_level === 'high'

    const temp = critical
      ? baseTemp - 1.8 + i * (1.8 / (count - 1)) + Math.sin(i / 2) * 0.25
      : watch
        ? baseTemp - 0.8 + Math.sin(i / 3) * 0.9
        : baseTemp + Math.sin(i / 3) * 0.25

    const survival = critical
      ? Math.max(baseSurvival, 83 - i * 1.25)
      : watch
        ? Math.min(98, baseSurvival + (count - 1 - i) * 0.2)
        : Math.min(99, baseSurvival + Math.sin(i / 4) * 0.5)

    return {
      id: `generated-${row.id}-${i}`,
      shipment_id: row.id,
      recorded_at: new Date(Date.now() + t * 15000).toISOString(),
      temperature_c: Number(temp.toFixed(2)),
      humidity_pct: num(row.current_humidity_pct, 58) + Math.sin(i / 4) * 2,
      battery_pct: 95 - i * 0.08,
      speed_kmh: 38 + Math.sin(i / 2.5) * 10,
      fuel_level_pct: 82 - i * 0.06,
      fuel_consumption_lph: 7.8 + Math.abs(Math.sin(i / 3)) * 1.5,
      survival_score: Number(survival.toFixed(1)),
    }
  })
}

function mapStorage(s) {
  return {
    ...s,
    id: s.code || s.id,
    storageId: s.code || s.id,
    lat: num(s.latitude ?? s.lat),
    lng: num(s.longitude ?? s.lng),
    latitude: num(s.latitude ?? s.lat),
    longitude: num(s.longitude ?? s.lng),
    safeMin: num(s.target_temp_min_c ?? s.safeMin, 2),
    safeMax: num(s.target_temp_max_c ?? s.safeMax, 8),
  }
}

async function loadBundle() {
  let shipments = await safe(
    supabase.from('shipments').select('*').order('updated_at', { ascending: false }),
    []
  )

  let vehicles = await safe(supabase.from('vehicles').select('*'), [])
  let storages = await safe(supabase.from('cold_storages').select('*'), [])

  const [telemetry, risks, custody, driver, health, alerts] = await Promise.all([
    safe(supabase.from('telemetry').select('*').order('recorded_at', { ascending: true }).limit(1500), []),
    safe(supabase.from('risk_history').select('*').order('recorded_at', { ascending: true }).limit(1500), []),
    safe(supabase.from('custody_events').select('*').order('recorded_at', { ascending: true }).limit(500), []),
    safe(supabase.from('driver_behavior_snapshots').select('*').order('recorded_at', { ascending: true }).limit(1000), []),
    safe(supabase.from('vehicle_health_snapshots').select('*').order('recorded_at', { ascending: true }).limit(1000), []),
    safe(supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(100), []),
  ])

  if (!shipments.length) shipments = fallbackRows
  if (!vehicles.length) vehicles = fallbackVehicles
  if (!storages.length) storages = fallbackStorages

  return {
    shipments,
    vehicles,
    storages,
    telemetry,
    risks,
    custody,
    driver,
    health,
    alerts,
  }
}

function latest(items, predicate) {
  return [...items].reverse().find(predicate) || {}
}

function statusFor(row) {
  const temp = num(row.current_temp_c)
  const safeMax = num(row.target_temp_max_c, 8)
  const safeMin = num(row.target_temp_min_c, 2)
  const survival = num(row.survival_score, 95)
  const risk = String(row.risk_level || '').toLowerCase()
  const operational = String(row.status || '').toLowerCase()

  if (
    operational === 'quarantined' ||
    risk === 'critical' ||
    temp >= safeMax + 0.5 ||
    temp <= safeMin - 0.5 ||
    survival <= 70
  ) return 'critical'

  if (
    risk === 'high' ||
    risk === 'medium' ||
    temp > safeMax ||
    temp < safeMin ||
    survival < 90
  ) return 'watch'

  if (String(row.priority || '').toLowerCase() === 'critical') return 'rerouted'
  return 'safe'
}


function mapShipment(row, bundle) {
  let vehicle = bundle.vehicles.find(v => v.id === row.vehicle_id) || {}

  if (!vehicle.id && String(row.id).startsWith('fallback-')) {
    vehicle = fallbackVehicles[Number(row.id.split('-')[1]) - 1] || fallbackVehicles[0]
  }

  const destination = bundle.storages.find(
    s =>
      s.id === row.destination_storage_id ||
      s.code === row.destination_storage_id ||
      s.storageId === row.destination_storage_id
  ) || bundle.storages.at(-1) || null

  const etaInfo = computeEta({ row, vehicle, destination })

  let telemetry = bundle.telemetry
    .filter(t => t.shipment_id === row.id)
    .slice(-60)

  if (!telemetry.length) telemetry = makeHistory(row, 24)

  const riskRows = bundle.risks
    .filter(r => r.shipment_id === row.id)
    .slice(-60)

  const custodyRows = bundle.custody
    .filter(c => c.shipment_id === row.id)
    .slice(-30)

  const driver = latest(
    bundle.driver,
    d => d.shipment_id === row.id || d.vehicle_id === row.vehicle_id
  )

  const health = latest(
    bundle.health,
    h => h.vehicle_id === row.vehicle_id || h.shipment_id === row.id
  )

  const alerts = bundle.alerts.filter(a => a.shipment_id === row.id)

  const fuel = num(
    health.fuel_pct ??
    health.fuel_level_pct ??
    telemetry.at(-1)?.fuel_level_pct ??
    vehicle.fuel_level_pct,
    75
  )

  const fuelConsumption = num(
    health.fuel_consumption_lph ??
    telemetry.at(-1)?.fuel_consumption_lph ??
    vehicle.fuel_consumption_lph,
    8.2
  )

  const tempHistory = telemetry.map((t, i) => ({
    time: labelTime(t.recorded_at, `T${i + 1}`),
    temp: num(t.temperature_c),
    temperature: num(t.temperature_c),
    value: num(t.temperature_c),
    humidity: num(t.humidity_pct),
    battery: num(t.battery_pct, 90),
    speed: num(t.speed_kmh, 40),
    fuel: num(t.fuel_level_pct, fuel),
  }))

  const riskHistory = riskRows.length
    ? riskRows.map(r => num(r.survival_score, row.survival_score))
    : telemetry.map(t => num(t.survival_score, row.survival_score))

  let events = custodyRows.map((e, i) => ({
    id: e.id || `${row.id}-event-${i}`,
    time: labelTime(e.recorded_at ?? e.occurred_at),
    title: e.title || e.event_type || 'Custody event',
    label: e.title || e.event_type || 'Custody event',
    description: e.description || e.location || e.location_name || '',
    detail: e.description || e.location || e.location_name || '',
    actor: e.actor,
    location: e.location ?? e.location_name,
    status: e.status || (e.event_type === 'alert' ? 'critical' : 'complete'),
  }))

  if (!events.length) {
    const start = row.started_at || new Date(Date.now() - 7200000).toISOString()

    events = [
      {
        id: `${row.id}-load`,
        time: labelTime(start),
        title: 'Product loaded & seal verified',
        label: 'Product loaded & seal verified',
        description: 'Cold-chain handoff completed at origin hub.',
        detail: 'Cold-chain handoff completed at origin hub.',
        status: 'complete',
      },
      {
        id: `${row.id}-depart`,
        time: labelTime(new Date(new Date(start).getTime() + 20 * 60000).toISOString()),
        title: 'Vehicle departed',
        label: 'Vehicle departed',
        description: 'Refrigerated vehicle departed with continuous monitoring active.',
        detail: 'Refrigerated vehicle departed with continuous monitoring active.',
        status: 'complete',
      },
      {
        id: `${row.id}-checkpoint`,
        time: 'Live',
        title: 'Live telemetry checkpoint',
        label: 'Live telemetry checkpoint',
        description: `${num(row.current_temp_c).toFixed(1)}°C · survival ${num(row.survival_score).toFixed(0)}% · fuel ${fuel.toFixed(0)}%`,
        detail: `${num(row.current_temp_c).toFixed(1)}°C · survival ${num(row.survival_score).toFixed(0)}% · fuel ${fuel.toFixed(0)}%`,
        status: row.risk_level === 'critical' ? 'critical' : 'active',
      },
    ]
  }

  const speed = num(vehicle.speed_kmh, 42)

  const driverScore = num(
    driver.driver_score,
    row.risk_level === 'critical'
      ? 76
      : row.risk_level === 'medium'
        ? 87
        : 93
  )

  const overallHealth = num(
    health.overall_health_pct ?? health.overall_health,
    row.risk_level === 'critical' ? 68 : row.risk_level === 'medium' ? 88 : 95
  )

  const reeferHealth = num(
    health.reefer_health_pct ?? health.reefer_health,
    row.risk_level === 'critical' ? 58 : row.risk_level === 'medium' ? 80 : 96
  )

  const compressor = num(
    health.compressor_efficiency_pct ?? health.compressor_efficiency,
    row.risk_level === 'critical' ? 54 : row.risk_level === 'medium' ? 75 : 94
  )

  const effectiveStatus = statusFor(row)

  const effectiveRisk = effectiveStatus === 'critical'
    ? 'critical'
    : effectiveStatus === 'watch'
      ? (row.risk_level === 'high' ? 'high' : 'medium')
      : (row.risk_level || 'low')

  const currentTemp = num(row.current_temp_c, telemetry.at(-1)?.temperature_c)
  const safeMax = num(row.target_temp_max_c, 8)

  const coolingHealth = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        num(health.reefer_health_pct ?? health.reefer_health, reeferHealth) -
        Math.max(0, currentTemp - safeMax) * 7
      )
    )
  )

  return {
    id: row.tracking_code || row.id,
    shipmentId: row.tracking_code || row.id,
    trackingCode: row.tracking_code || row.id,
    _dbId: row.id,
    shipmentUUID: row.id,

    product: row.product_name || 'Temperature-sensitive medicine',
    productName: row.product_name || 'Temperature-sensitive medicine',
    batch: row.batch_no || 'DEMO-BATCH',
    quantity: num(row.quantity, 1),

    vehicle: vehicle.code || vehicle.registration_no || 'CL-REEFER-DEMO',
    vehicleId: vehicle.code || vehicle.id || 'CL-REEFER-DEMO',
    vehicleName: vehicle.registration_no || vehicle.code || 'Reefer vehicle',
    driver: vehicle.driver_name || 'ColdLife Driver',
    driverName: vehicle.driver_name || 'ColdLife Driver',

    status: effectiveStatus,
    shipmentStatus: row.status || 'in_transit',
    operationalStatus: row.status || 'in_transit',
    riskLevel: effectiveRisk,
    priority: row.priority || 'normal',
    recommendation: row.recommendation || 'Continue monitoring.',

    temperature: currentTemp,
    currentTemperature: currentTemp,
    humidity: num(row.current_humidity_pct, telemetry.at(-1)?.humidity_pct),
    survival: num(row.survival_score, 95),
    survivalScore: num(row.survival_score, 95),
    safeMin: num(row.target_temp_min_c, 2),
    safeMax: num(row.target_temp_max_c, 8),

    lat: num(row.latitude, 19.076),
    lng: num(row.longitude, 72.8777),
    latitude: num(row.latitude, 19.076),
    longitude: num(row.longitude, 72.8777),

    eta: etaInfo.etaText,
    etaText: etaInfo.etaText,
    etaDisplay: etaInfo.etaDisplay,
    etaMinutes: etaInfo.etaMinutes,
    etaClock: etaInfo.etaClock,
    etaAt: etaInfo.etaAt,
    estimatedArrival: etaInfo.estimatedArrival,
    distanceKm: etaInfo.distanceKm,
    remainingKm: etaInfo.remainingKm,
    destination: destination?.name || destination?.city || 'Destination cold hub',
    destinationName: destination?.name || destination?.city || 'Destination cold hub',

    tempHistory,
    riskHistory,
    survivalHistory: riskHistory,
    events,
    chainOfCustody: events,

    fuel,
    fuelLevel: fuel,
    fuelPct: fuel,
    fuelLevelPct: fuel,
    fuelConsumption,
    fuelConsumptionLph: fuelConsumption,

    battery: num(vehicle.battery_pct, 90),
    batteryPct: num(vehicle.battery_pct, 90),
    speed,
    speedKmh: speed,
    engineTemp: num(health.engine_temp_c ?? vehicle.engine_temp_c, 84),
    engineTempC: num(health.engine_temp_c ?? vehicle.engine_temp_c, 84),
    reeferPower: num(vehicle.reefer_power_pct, 72),

    overallHealth,
    vehicleHealth: overallHealth,
    vehicleHealthScore: overallHealth,
    reeferHealth: coolingHealth,
    coolingHealth,
    coolingHealthPct: coolingHealth,
    reeferUnitHealth: coolingHealth,
    compressorEfficiency: compressor,
    compressorHealth: compressor,
    batteryHealth: num(
      health.battery_health_pct ?? health.battery_health,
      num(vehicle.battery_pct, 90)
    ),
    coolant: num(health.coolant_pct, 91),
    coolantPct: num(health.coolant_pct, 91),
    tirePressure: num(health.tyre_pressure_psi ?? health.tire_pressure_psi, 34.5),
    tirePressurePsi: num(health.tyre_pressure_psi ?? health.tire_pressure_psi, 34.5),
    gpsHealth: num(health.gps_signal_pct ?? health.gps_health, 97),
    doorStatus: health.door_status || 'closed',
    serviceDueKm: num(health.service_due_km, 2500),

    driverScore,
    safetyScore: driverScore,
    driverStyle: driver.style || driver.driving_style ||
      (driverScore >= 92 ? 'smooth' : driverScore >= 84 ? 'balanced' : 'aggressive'),
    avgSpeed: num(driver.avg_speed_kmh, speed - 3),
    averageSpeed: num(driver.avg_speed_kmh, speed - 3),
    maxSpeed: num(driver.max_speed_kmh, speed + 10),
    harshBraking: num(
      driver.harsh_braking_count ?? driver.harsh_brakes,
      row.risk_level === 'critical' ? 3 : 1
    ),
    harshBrakes: num(
      driver.harsh_braking_count ?? driver.harsh_brakes,
      row.risk_level === 'critical' ? 3 : 1
    ),
    harshAcceleration: num(
      driver.harsh_accel_count ?? driver.harsh_accels,
      row.risk_level === 'critical' ? 2 : 1
    ),
    harshAccelerations: num(
      driver.harsh_accel_count ?? driver.harsh_accels,
      row.risk_level === 'critical' ? 2 : 1
    ),
    sharpTurns: num(driver.cornering_count ?? driver.sharp_turns, 1),
    speedingEvents: num(driver.speeding_events, row.risk_level === 'critical' ? 2 : 0),
    idleMinutes: num(driver.idle_minutes, 2),
    fatigueScore: num(driver.fatigue_score, row.risk_level === 'critical' ? 31 : 12),
    ecoScore: num(driver.eco_score, driverScore - 3),

    criticalMinutes: effectiveStatus === 'critical' ? 12 : effectiveStatus === 'watch' ? 28 : 60,
    alerts,
    telemetry,
  }
}

export async function getShipments() {
  const bundle = await loadBundle()

  const demo = bundle.shipments.filter(
    s => /^CLT-240[1-4]$/.test(String(s.tracking_code || ''))
  )

  const rows = demo.length ? demo : bundle.shipments

  return rows.map(row => mapShipment(row, bundle))
}

export async function getShipment(identifier) {
  const shipments = await getShipments()

  const found = shipments.find(s =>
    s.id === identifier ||
    s.shipmentId === identifier ||
    s._dbId === identifier
  )

  if (!found) throw new Error(`Shipment not found: ${identifier}`)
  return found
}




export async function getDashboard() {
  const [shipments, fleet, interventionRows] = await Promise.all([
    getShipments(),
    getFleet(),
    safe(
      supabase
        .from('intervention_ledger')
        .select('shipment_id, outcome, loss_avoided_inr, verified_at')
        .eq('outcome', 'successful'),
      []
    ),
  ])

  const active = shipments.filter(
    s => s.shipmentStatus !== 'delivered'
  )

  const critical = shipments.filter(s => {
    const temp = num(s.temperature ?? s.currentTemperature)
    const safeMin = num(s.safeMin, 2)
    const safeMax = num(s.safeMax, 8)
    const survival = num(s.survival ?? s.survivalScore, 95)
    const risk = String(s.riskLevel ?? '').toLowerCase()
    const operational = String(
      s.shipmentStatus ?? s.operationalStatus ?? ''
    ).toLowerCase()

    return (
      s.status === 'critical' ||
      operational === 'quarantined' ||
      risk === 'critical' ||
      temp >= safeMax + 0.5 ||
      temp <= safeMin - 0.5 ||
      survival <= 70
    )
  })

  const avg = shipments.length
    ? shipments.reduce(
        (sum, s) => sum + num(s.survival),
        0
      ) / shipments.length
    : 0

  // Only verified successful interventions count.
  const successfulInterventions = interventionRows.filter(
    row => row.outcome === 'successful' && row.verified_at
  )

  // Sum the verified protected value.
  const lossAvoidedInr = successfulInterventions.reduce(
    (sum, row) => sum + num(row.loss_avoided_inr),
    0
  )

  // Count each shipment only once, even if it had
  // multiple successful interventions.
  const batchesSaved = new Set(
    successfulInterventions.map(row => row.shipment_id)
  ).size

  // Display in lakhs for larger amounts, otherwise rupees.
  const lossAvoided = lossAvoidedInr >= 100000
    ? `₹${(lossAvoidedInr / 100000).toFixed(2)}L`
    : `₹${Math.round(lossAvoidedInr).toLocaleString('en-IN')}`

  return {
    activeFleet: fleet.length,
    fleetActive: fleet.length,
    activeShipments: active.length,
    totalShipments: shipments.length,
    criticalShipments: critical.length,

    criticalCases: critical.map(s => ({
      id: s.id,
      product: s.product,
      temperature: s.temperature,
      survival: s.survival,
    })),

    avgSurvival: Number(avg.toFixed(1)),
    averageSurvivalScore: Number(avg.toFixed(1)),

    // Ledger-backed metrics.
    lossAvoided,
    lossAvoidedInr,
    batchesSaved,
    verifiedInterventions: successfulInterventions.length,

    // Not yet backed by verified delivery outcomes.
    onTime: null,
    onTimeDelivery: null,

    lowFuelVehicles: shipments.filter(
      s => s.fuelLevelPct < 30
    ).length,
  }
}



export async function getFleet() {
  let vehicles = await safe(
    supabase.from('vehicles').select('*').order('code'),
    []
  )

  if (!vehicles.length) vehicles = fallbackVehicles

  return vehicles.map(v => ({
    ...v,
    id: v.code || v.id,
    _dbId: v.id,
    vehicleId: v.code || v.id,
    vehicleName: v.registration_no || v.code || 'Reefer vehicle',
    driverName: v.driver_name || 'ColdLife Driver',
    driver: v.driver_name || 'ColdLife Driver',
    vehicleStatus: v.status || 'in_transit',
    riskLevel: v.status === 'alert' ? 'high' : 'low',
    lat: num(v.latitude, 19.076),
    lng: num(v.longitude, 72.8777),
    latitude: num(v.latitude, 19.076),
    longitude: num(v.longitude, 72.8777),
    battery: num(v.battery_pct, 90),
    batteryPct: num(v.battery_pct, 90),
    speed: num(v.speed_kmh, 40),
    speedKmh: num(v.speed_kmh, 40),
    fuelLevelPct: num(v.fuel_level_pct, 75),
    fuelConsumptionLph: num(v.fuel_consumption_lph, 8.2),
    engineTempC: num(v.engine_temp_c, 84),
    reeferPower: num(v.reefer_power_pct, 72),
  }))
}

export async function getStorages() {
  let rows = await safe(
    supabase.from('cold_storages').select('*').order('name'),
    []
  )

  if (!rows.length) rows = fallbackStorages
  return rows.map(mapStorage)
}

export const getColdStorages = getStorages

export async function getAlerts() {
  return await safe(
    supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(100),
    []
  )
}

export async function getScenarios() {
  return await safe(
    supabase.from('scenarios').select('*').eq('is_active', true),
    [
      { scenario_key: 'healthy_delivery', name: 'Healthy delivery' },
      { scenario_key: 'recoverable_cooling_failure', name: 'Recoverable cooling failure' },
      { scenario_key: 'critical_quarantine', name: 'Critical quarantine' },
      { scenario_key: 'priority_shipment', name: 'Priority shipment' },
    ]
  )
}

export async function health() {
  return checkSupabaseConnection()
}

export const getHealth = health

// Manual simulation tick.
// The automatic simulation is handled by Supabase Cron.
export async function tick() {
  const { data, error } = await supabase.rpc('run_live_demo_tick')

  if (error) {
    console.error('[ColdLife] Simulation tick failed:', error.message)
    throw new Error(error.message || 'Simulation tick failed')
  }

  if (!data) {
    throw new Error('Simulation returned no result.')
  }

  return data
}

export const runSimulationTick = tick

export async function scenario(name) {
  const { data, error } = await supabase.rpc(
    'run_simulation_tick',
    { p_scenario_key: name }
  )

  if (!error) return data
  return tick()
}

export async function getChainOfCustody(identifier = null) {
  if (identifier) return (await getShipment(identifier)).events

  const shipments = await getShipments()

  return shipments.flatMap(s =>
    s.events.map((e, i) => ({
      ...e,
      id: e.id || `${s.id}-${i}`,
      shipmentId: s.id,
    }))
  )
}

export async function resetSimulation() {
  const { data, error } = await supabase.rpc('reset_live_demo')

  if (!error) return data
  return { success: true, fallback: true }
}

export async function performShipmentActionByDbId(
  shipmentDbId,
  actionName,
  notes = ''
) {
  const { data, error } = await supabase.rpc('perform_shipment_action', {
    p_shipment_id: shipmentDbId,
    p_action: actionName,
    p_notes: notes || `Dashboard action: ${actionName}`,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data }
}

export async function performShipmentAction(
  identifier,
  actionName,
  notes = ''
) {
  const shipment = await getShipment(identifier)
  let action = String(actionName || '').toUpperCase()

  if (action === 'ACCEPT_RECOMMENDATION') {
    action =
      shipment.status === 'critical'
        ? 'QUARANTINE'
        : shipment.status === 'watch'
          ? 'PRIORITIZE'
          : 'RESUME'
  }

  if (![
    'QUARANTINE',
    'PRIORITIZE',
    'RESUME',
    'MARK_DELIVERED',
    'RESET_MONITORING',
    'BOOST_COOLING',
  ].includes(action)) {
    action = 'RESUME'
  }

  const { data, error } = await supabase.rpc('perform_shipment_action', {
    p_shipment_id: shipment._dbId,
    p_action: action,
    p_notes: notes || `Dashboard action: ${action}`,
  })

  if (error) {
    console.warn('[ColdLife] action RPC unavailable:', error.message)
    return { ok: false, fallback: true }
  }

  return data
}

export async function action(identifier, payload = {}) {
  return performShipmentAction(
    identifier,
    payload.action || payload.type || 'RESUME',
    payload.notes || ''
  )
}

export async function acknowledgeAlert(alertId) {
  const { data, error } = await supabase.rpc(
    'acknowledge_alert',
    { p_alert_id: alertId }
  )

  if (error) return { ok: false }
  return data
}

// --------------------------------------------------
// Gemini prediction integration
// --------------------------------------------------

const geminiPredictionCache = new Map()

export async function getGeminiPrediction(shipmentOrIdentifier) {
  const shipment = typeof shipmentOrIdentifier === 'string'
    ? await getShipment(shipmentOrIdentifier)
    : shipmentOrIdentifier

  if (!shipment) {
    throw new Error('Shipment is required for AI prediction')
  }

  const cacheKey = shipment.id || shipment.shipmentId
  const cached = geminiPredictionCache.get(cacheKey)

  if (cached && Date.now() - cached.time < 20_000) {
    return { ...cached.value, cached: true }
  }

  const temps = (shipment.tempHistory || [])
    .slice(-6)
    .map(x => Number(x.temp ?? x.temperature ?? x.value))

  const survivalTrend = (shipment.riskHistory || [])
    .slice(-6)
    .map(Number)

  const payload = {
    shipmentId: shipment.id,
    product: shipment.product,
    status: shipment.status,
    riskLevel: shipment.riskLevel,
    temperature: shipment.temperature,
    safeMin: shipment.safeMin,
    safeMax: shipment.safeMax,
    survival: shipment.survival,
    fuelLevelPct: shipment.fuelLevelPct,
    coolingHealthPct: shipment.coolingHealthPct ?? shipment.reeferHealth,
    compressorEfficiency: shipment.compressorEfficiency,
    speedKmh: shipment.speedKmh,
    etaMinutes: shipment.etaMinutes,
    recentTemperatures: temps,
    recentSurvival: survivalTrend,
  }

  const { data, error } = await supabase.functions.invoke('gemini-predict', {
    body: payload,
  })

  if (error) throw error

  if (!data?.insight) {
    throw new Error(data?.error || 'Gemini did not return an AI insight')
  }

  geminiPredictionCache.set(cacheKey, {
    time: Date.now(),
    value: data.insight,
  })

  return data.insight
}

// --------------------------------------------------
// Compatibility subscription interface
// The current REST adapter does not provide WebSockets.
// Dashboard refresh should use REST polling.
// --------------------------------------------------

export function subscribeToColdLifeUpdates(callback) {
  const channel = supabase
    .channel('coldlife-live-safe')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shipments' },
      callback
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vehicles' },
      callback
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'telemetry' },
      callback
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export async function diagnoseBackend() {
  const checks = {}

  for (const table of [
    'shipments',
    'vehicles',
    'cold_storages',
    'telemetry',
    'custody_events',
    'driver_behavior_snapshots',
    'vehicle_health_snapshots',
    'risk_history',
  ]) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      checks[table] = {
        count: count ?? 0,
        error: error?.message || null,
      }
    } catch (e) {
      checks[table] = {
        count: 0,
        error: e?.message || String(e),
      }
    }
  }

  return checks
}
