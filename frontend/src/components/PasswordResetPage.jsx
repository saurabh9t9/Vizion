import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { completePasswordReset, requestPasswordReset, verifyPasswordReset } from '../api'
import '../styles/Auth.css'

function PasswordResetPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('request')
  const [form, setForm] = useState({ email: '', otp: '', new_password: '', role: 'student' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try {
      if (step === 'request') {
        await requestPasswordReset({ email: form.email, role: form.role })
        setMessage('If an account matches, a reset code has been sent to your Gmail inbox.')
        setStep('verify')
      } else if (step === 'verify') {
        await verifyPasswordReset({ email: form.email, role: form.role, otp: form.otp })
        setStep('complete')
      } else {
        await completePasswordReset({ email: form.email, role: form.role, otp: form.otp, new_password: form.new_password })
        navigate('/login', { replace: true, state: { message: 'Password reset successfully. Sign in with your new password.' } })
      }
    } catch (requestError) { setError(requestError.response?.data?.detail || 'Unable to complete password reset.') }
    finally { setLoading(false) }
  }

  return <main className="auth-page"><section className="auth-copy"><span className="auth-mark">V</span><p className="auth-kicker">VIZION / ACCOUNT RECOVERY</p><h1>Get back to your workspace.</h1><p>We will send a one-time code to the Gmail address linked to your account.</p></section><section className="auth-card"><p className="auth-kicker">PASSWORD RESET</p><h2>{step === 'request' ? 'Request a code' : step === 'verify' ? 'Enter your code' : 'Choose a new password'}</h2>{step === 'request' && <div className="auth-roles"><button type="button" className={form.role === 'student' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'student' })}>Student</button><button type="button" className={form.role === 'company' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'company' })}>Company</button></div>}<form onSubmit={submit} className="auth-form">{step === 'request' && <label>Email<input name="email" type="email" value={form.email} onChange={update} required /></label>}{step !== 'request' && <label>Verification code<input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={form.otp} onChange={update} required /></label>}{step === 'complete' && <label>New password<input name="new_password" type="password" minLength="6" value={form.new_password} onChange={update} required /></label>}{message && <p className="auth-message">{message}</p>}{error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={loading}>{loading ? 'Please wait...' : step === 'request' ? 'Send reset code' : step === 'verify' ? 'Verify code' : 'Reset password'}</button></form>{step === 'verify' && <button className="auth-link-button" type="button" onClick={() => { setStep('request'); setMessage('') }}>Use a different email</button>}<p className="auth-switch"><Link to="/login">Back to sign in</Link></p></section></main>
}

export default PasswordResetPage
