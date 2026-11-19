import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { performShipmentAction } from '../api/coldlifeApi'


const DEFAULT_CENTER = [19.0760, 72.8777]

const n = (v, fallback = 0) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : fallback
}

function stateFor(s = {}) {
  const temp = n(s.temperature ?? s.currentTemperature)
  const min = n(s.safeMin, 2)
  const max = n(s.safeMax, 8)
  const survival = n(s.survival ?? s.survivalScore, 95)
  const risk = String(s.riskLevel ?? '').toLowerCase()
  const op = String(s.shipmentStatus ?? s.operationalStatus ?? '').toLowerCase()

  if (
    op === 'quarantined' ||
    risk === 'critical' ||
    temp >= max + 0.5 ||
    temp <= min - 0.5 ||
    survival <= 70
  ) return 'critical'

  if (
    risk === 'high' ||
    risk === 'medium' ||
    temp > max ||
    temp < min ||
    survival < 90
  ) return 'watch'

  if (String(s.priority || '').toLowerCase() === 'critical') return 'priority'
  return 'safe'
}

function markerIcon(status) {
  const config = {
    safe: ['#10b981', '#ecfdf5'],
    watch: ['#f59e0b', '#fffbeb'],
    critical: ['#ef4444', '#fff1f2'],
    priority: ['#a855f7', '#faf5ff'],
  }
  const [border, bg] = config[status] || config.safe

  return L.divIcon({
    className: 'coldlife-vehicle-icon',
    html: `<div class="coldlife-marker ${status === 'critical' ? 'coldlife-marker-critical' : ''}"
      style="background:${bg};border-color:${border}">🚚</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  })
}

function hubIcon() {
  return L.divIcon({
    className: 'coldlife-hub-icon',
    html: `<div class="coldlife-hub">❄️</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function shipmentPopup(s) {
  const status = stateFor(s)
  const temp = n(s.temperature ?? s.currentTemperature)
  const survival = n(s.survival ?? s.survivalScore)
  const fuel = n(s.fuelLevelPct ?? s.fuelPct ?? s.fuel)
  const fuelRate = n(s.fuelConsumptionLph ?? s.fuelConsumption)
  const cooling = n(s.coolingHealthPct ?? s.coolingHealth ?? s.reeferHealth)
  const reeferPower = n(s.reeferPower)
  const eta = s.etaDisplay || s.etaText || s.eta ||
    (Number.isFinite(Number(s.etaMinutes)) ? `${Math.round(Number(s.etaMinutes))} min` : 'Calculating')

  return `
    <div class="coldlife-popup">
      <div class="coldlife-popup-top">
        <div>
          <div class="coldlife-code">${escapeHtml(s.id || s.shipmentId)}</div>
          <div class="coldlife-product">${escapeHtml(s.product || s.productName || 'Cold-chain shipment')}</div>
          <div class="coldlife-sub">${escapeHtml(s.vehicleName || s.vehicle)} · ${escapeHtml(s.driverName || s.driver)}</div>
        </div>
        <div class="coldlife-state coldlife-state-${status}">${status}</div>
      </div>

      ${status === 'critical' ? `
        <div class="coldlife-critical-box">
          ⚠ CRITICAL — immediate intervention required
        </div>
      ` : ''}

      <div class="coldlife-grid">
        <div class="coldlife-cell"><small>TEMP</small><b>${temp.toFixed(1)}°C</b></div>
        <div class="coldlife-cell"><small>SURVIVAL</small><b>${survival.toFixed(0)}%</b></div>
        <div class="coldlife-cell"><small>ETA</small><b>${escapeHtml(eta)}</b></div>
      </div>

      <div class="coldlife-row">
        <span>⛽ Fuel</span>
        <b>${fuel.toFixed(1)}% · ${fuelRate.toFixed(1)} L/h</b>
      </div>
      <div class="coldlife-meter"><i style="width:${Math.max(0, Math.min(100, fuel))}%"></i></div>

      <div class="coldlife-row">
        <span>❄ Cooling</span>
        <b>${cooling.toFixed(0)}% · power ${reeferPower.toFixed(0)}%</b>
      </div>
      <div class="coldlife-meter"><i style="width:${Math.max(0, Math.min(100, cooling))}%"></i></div>

      <div class="coldlife-actions">
        <button data-coldlife-action="BOOST_COOLING" data-shipment="${escapeHtml(s.id || s.shipmentId || '')}">
          ❄ Boost cooling
        </button>
        <button class="danger" data-coldlife-action="QUARANTINE" data-shipment="${escapeHtml(s._dbId || s.shipmentUUID || '')}">
          ⚠ Quarantine
        </button>
      </div>
      <div class="coldlife-action-status" data-action-status></div>
    </div>
  `
}

export default function FleetMap({
  shipments = [],
  storages = [],
  onSelect = () => {},
}) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const fittedRef = useRef('')

  const fitKey = useMemo(() => {
    const ids = [
      ...shipments.map((s, i) => s._dbId || s.shipmentUUID || s.id || s.shipmentId || `s${i}`),
      ...storages.map((s, i) => s._dbId || s.storageId || s.code || s.id || `h${i}`),
    ]
    return ids.map(String).sort().join('|')
  }, [shipments, storages])

  useEffect(() => {
    if (!elRef.current || mapRef.current) return

    const map = L.map(elRef.current, {
      center: DEFAULT_CENTER,
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const group = L.layerGroup().addTo(map)

    mapRef.current = map
    layerRef.current = group

    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)

    setTimeout(() => map.invalidateSize(), 100)
    setTimeout(() => map.invalidateSize(), 500)

    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = layerRef.current
    if (!map || !group) return

    group.clearLayers()
    const bounds = []

    for (const s of shipments) {
      const lat = n(s.lat ?? s.latitude, NaN)
      const lng = n(s.lng ?? s.longitude, NaN)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

      bounds.push([lat, lng])
      const status = stateFor(s)

      const marker = L.marker([lat, lng], {
        icon: markerIcon(status),
        title: `${s.id || s.shipmentId || ''} ${status}`,
      }).addTo(group)

      marker.bindPopup(shipmentPopup(s), {
        minWidth: 310,
        maxWidth: 360,
      })

      marker.on('click', () => {
        onSelect?.(s.id || s.shipmentId)
      })

      marker.on('popupopen', (event) => {
        const root = event.popup.getElement()
        if (!root) return

        root.querySelectorAll('[data-coldlife-action]').forEach((button) => {
          button.addEventListener('click', async (ev) => {
            ev.preventDefault()
            ev.stopPropagation()

            const actionName = button.getAttribute('data-coldlife-action')
            const shipmentDbId = button.getAttribute('data-shipment')
            const statusEl = root.querySelector('[data-action-status]')

            if (!shipmentDbId) {
              if (statusEl) statusEl.textContent = 'Database shipment ID unavailable'
              return
            }

            button.disabled = true
            if (statusEl) statusEl.textContent = 'Sending…'

            try {
              const result = await performShipmentAction(
                shipmentDbId,
                actionName,
                `Map control: ${actionName}`
              )
              if (!result || result.ok !== true) {
                throw new Error(result?.error || 'Supabase did not confirm the shipment action.')
              }

              if (statusEl) {
                statusEl.textContent =
                  actionName === 'BOOST_COOLING'
                    ? 'Cooling boost activated'
                    : 'Shipment quarantined'
              }
              window.dispatchEvent(new Event('coldlife-refresh'))
            } catch (error) {
              if (statusEl) statusEl.textContent = error?.message || 'Action failed'
            } finally {
              button.disabled = false
            }
          }, { once: true })
        })
      })
    }

    for (const h of storages) {
      const lat = n(h.lat ?? h.latitude, NaN)
      const lng = n(h.lng ?? h.longitude, NaN)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

      bounds.push([lat, lng])
      L.marker([lat, lng], { icon: hubIcon() })
        .addTo(group)
        .bindPopup(`<b>${escapeHtml(h.name || h.code || 'Cold hub')}</b><br>${escapeHtml(h.city || '')}`)
    }

    if (fittedRef.current !== fitKey) {
      fittedRef.current = fitKey

      if (bounds.length === 1) {
        map.setView(bounds[0], 12)
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 })
      } else {
        map.setView(DEFAULT_CENTER, 10)
      }
    }

    setTimeout(() => map.invalidateSize(), 50)
  }, [shipments, storages, fitKey, onSelect])

  return (
    <div className="coldlife-map-shell">
      <style>{`
        .coldlife-map-shell {
          position:relative;
          width:100%;
          height:520px;
          min-height:520px;
          overflow:hidden;
          border-radius:18px;
          background:#dbeafe;
          border:1px solid rgba(148,163,184,.35);
        }
        .coldlife-map-canvas {
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          z-index:1;
        }
        .coldlife-map-shell .leaflet-container {
          width:100% !important;
          height:100% !important;
          min-height:520px !important;
        }
        .coldlife-marker {
          width:42px;
          height:42px;
          border-radius:50%;
          border:4px solid;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:20px;
          box-shadow:0 6px 20px rgba(15,23,42,.28);
        }
        @keyframes coldlife-critical-pulse {
          0%,100% { transform:scale(1); box-shadow:0 0 0 4px rgba(239,68,68,.18); }
          50% { transform:scale(1.16); box-shadow:0 0 0 12px rgba(239,68,68,.03); }
        }
        .coldlife-marker-critical { animation:coldlife-critical-pulse 1s infinite; }
        .coldlife-hub {
          width:34px;height:34px;border-radius:9px;
          display:flex;align-items:center;justify-content:center;
          background:#0f172a;border:2px solid #38bdf8;
          box-shadow:0 5px 15px rgba(15,23,42,.25);
        }
        .coldlife-popup { color:#0f172a; font-family:Inter,system-ui,sans-serif; }
        .coldlife-popup-top { display:flex; justify-content:space-between; gap:12px; }
        .coldlife-code { font-size:11px; font-weight:800; color:#64748b; }
        .coldlife-product { font-size:16px; font-weight:900; margin-top:2px; }
        .coldlife-sub { font-size:11px; color:#64748b; margin-top:3px; }
        .coldlife-state { border-radius:999px; padding:4px 8px; font-size:10px; font-weight:900; text-transform:uppercase; align-self:flex-start; }
        .coldlife-state-safe { background:#d1fae5;color:#047857; }
        .coldlife-state-watch { background:#fef3c7;color:#92400e; }
        .coldlife-state-critical { background:#fee2e2;color:#b91c1c; }
        .coldlife-state-priority { background:#f3e8ff;color:#7e22ce; }
        .coldlife-critical-box { margin-top:10px;padding:9px;border-radius:9px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;font-size:12px;font-weight:800; }
        .coldlife-grid { margin-top:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px; }
        .coldlife-cell { padding:8px;border-radius:8px;background:#f8fafc; }
        .coldlife-cell small { display:block;font-size:9px;color:#64748b; }
        .coldlife-cell b { display:block;margin-top:2px;font-size:14px; }
        .coldlife-row { margin-top:9px;display:flex;justify-content:space-between;gap:8px;font-size:12px; }
        .coldlife-meter { margin-top:4px;height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden; }
        .coldlife-meter i { display:block;height:100%;background:#10b981; }
        .coldlife-actions { display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px; }
        .coldlife-actions button { border:0;border-radius:9px;padding:9px 7px;background:#e0f2fe;color:#0369a1;font-weight:800;cursor:pointer; }
        .coldlife-actions button.danger { background:#fee2e2;color:#b91c1c; }
        .coldlife-action-status { margin-top:7px;font-size:11px;color:#475569; }
      `}</style>
      <div ref={elRef} className="coldlife-map-canvas" />
    </div>
  )
}
