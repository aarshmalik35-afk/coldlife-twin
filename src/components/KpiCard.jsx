
export default function KpiCard({ label, value, sub, icon: Icon }) {
  const toneMap = {
    'Active fleet': 'fleet',
    'Active shipments': 'shipments',
    'Critical shipments': 'critical',
    'Avg survival': 'survival',
    'On-time delivery': 'delivery',
    'Loss avoided': 'savings',
  }

  const tone = toneMap[label] || 'default'

  return (
    <article className={`kpi-card-v2 kpi-${tone}`}>
      <div className="kpi-card-top">
        <span className="kpi-card-label">{label}</span>

        <span className="kpi-card-icon">
          {Icon && <Icon size={19} strokeWidth={1.8} />}
        </span>
      </div>

      <div className="kpi-card-value">
        {value ?? '—'}
      </div>

      <div className="kpi-card-bottom">
        <span className="kpi-card-indicator" />
        <span className="kpi-card-sub">{sub}</span>
      </div>

      <div className="kpi-card-glow" />
    </article>
  )
}
