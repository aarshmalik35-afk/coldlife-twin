import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, LockKeyhole, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react'
import { getPendingInterventions, sendOperatorAuthOtp, verifyOperatorAuthOtp, submitInterventionOutcome } from '../api/coldlifeApi'

const OPERATOR_EMAIL = 'aarshmalik35@gmail.com'
const SESSION_KEY = 'coldlife_operator_session'

export default function OperatorMode({ onVerified }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
  })
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState('')
  const [estimated, setEstimated] = useState('')
  const [actual, setActual] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadRows = useCallback(async () => {
    try {
      const data = await getPendingInterventions()
      setRows(data)
      setSelected(current => data.some(row => row.id === current) ? current : (data[0]?.id || ''))
    } catch (e) { setError(e.message || 'Could not load pending ledger entries') }
  }, [])

  useEffect(() => { if (session?.access_token) loadRows() }, [session, loadRows])

  const requestOtp = async () => {
    setBusy(true); setError(''); setMessage('')
    try {
      await sendOperatorAuthOtp(OPERATOR_EMAIL)
      setOtpSent(true)
      setMessage('A sign-in code has been sent to the authorised operator email.')
    } catch (e) {
      setError(e.status === 429
        ? 'Supabase has rate-limited sign-in emails. Wait for the limit window to reset before requesting another code.'
        : (e.message || 'Could not send sign-in code'))
    }
    finally { setBusy(false) }
  }

  const signIn = async () => {
    setBusy(true); setError('')
    try {
      const { data } = await verifyOperatorAuthOtp(OPERATOR_EMAIL, otp.trim())
      if (!data?.access_token) throw new Error('No access token returned. Check the email code and try again.')
      setSession(data)
      localStorage.setItem(SESSION_KEY, JSON.stringify(data))
      setOtp(''); setOtpSent(false); setMessage('Operator session active.')
    } catch (e) { setError(e.message || 'Sign-in failed') }
    finally { setBusy(false) }
  }

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY); setSession(null); setRows([]); setMessage('Signed out.')
  }

  const submit = async () => {
    if (!selected) return setError('Select a pending intervention.')
    if (estimated === '' || actual === '' || Number(estimated) < 0 || Number(actual) < 0) return setError('Enter valid non-negative INR amounts.')
    setBusy(true); setError(''); setMessage('')
    try {
      const { data } = await submitInterventionOutcome(session.access_token, {
        ledger_id: selected,
        estimated_loss_inr: Number(estimated),
        actual_loss_inr: Number(actual),
        notes,
      })
      if (data?.error) throw new Error(data.error)
      setMessage('Intervention verified and ledger updated.')
      setEstimated(''); setActual(''); setNotes('')
      await loadRows()
      await onVerified?.()
    } catch (e) { setError(e.message || 'Ledger update failed') }
    finally { setBusy(false) }
  }

  const chosen = rows.find(row => row.id === selected)
  const avoided = Math.max(0, Number(estimated || 0) - Number(actual || 0))

  return <section className="operator-panel">
    <div className="operator-head">
      <div className="operator-title"><span className="operator-icon"><ShieldCheck size={18}/></span><div><strong>Operator Mode</strong><small>Controlled intervention outcome verification</small></div></div>
      {session?.access_token ? <button className="operator-secondary" onClick={signOut}><LogOut size={14}/> Sign out</button> : <span className="operator-lock"><LockKeyhole size={13}/> RESTRICTED</span>}
    </div>
    {!session?.access_token ? <div className="operator-auth">
      <p>Sign in with the authorised operator email <strong>{OPERATOR_EMAIL}</strong>. A one-time code will be emailed to you.</p>
      {otpSent ? <div className="operator-form-row"><input aria-label="Email verification code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit email code" value={otp} onChange={e=>setOtp(e.target.value)}/><button disabled={busy || !otp.trim()} onClick={signIn}>{busy?'Verifying…':'Verify code'}</button></div> : <button disabled={busy} onClick={requestOtp}>{busy?'Sending…':'Send sign-in code'}</button>}
    </div> : <div className="operator-body">
      <div className="operator-status"><CheckCircle2 size={14}/> Signed in as {OPERATOR_EMAIL}<button className="operator-link" onClick={loadRows}><RefreshCw size={13}/> Refresh</button></div>
      {rows.length === 0 ? <p className="operator-muted">No pending interventions to verify.</p> : <>
        <label>Pending intervention<select value={selected} onChange={e=>setSelected(e.target.value)}>{rows.map(row=><option key={row.id} value={row.id}>{row.action} · {row.shipment_id.slice(0,8)}…</option>)}</select></label>
        {chosen && <p className="operator-muted">{chosen.notes || 'No intervention notes recorded.'}</p>}
        <div className="operator-fields">
          <label>Estimated loss (₹)<input type="number" min="0" step="0.01" value={estimated} onChange={e=>setEstimated(e.target.value)} placeholder="e.g. 250000"/></label>
          <label>Actual loss (₹)<input type="number" min="0" step="0.01" value={actual} onChange={e=>setActual(e.target.value)} placeholder="e.g. 50000"/></label>
        </div>
        <label>Verification notes<textarea rows="2" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Evidence or outcome notes…"/></label>
        <div className="operator-calculation"><span>Calculated loss avoided</span><strong>₹{avoided.toLocaleString('en-IN',{maximumFractionDigits:2})}</strong></div>
        <button disabled={busy || !selected || estimated==='' || actual===''} onClick={submit}>{busy?'Saving…':'Verify outcome & update ledger'}</button>
      </>}
    </div>}
    {message && <p className="operator-success">{message}</p>}
    {error && <p className="operator-error">{error}</p>}
  </section>
}
