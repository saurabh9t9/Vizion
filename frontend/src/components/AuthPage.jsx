import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login, register } from '../api'
import '../styles/Auth.css'

function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const response = isRegister ? await register(form) : await login({ email: form.email, password: form.password, role: form.role })
      const user = response.data.user
      localStorage.setItem('vizion-user', JSON.stringify(user))
      navigate(location.state?.from?.pathname || `/${user.role}-dashboard`, { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to complete this request.')
    } finally { setLoading(false) }
  }

  return <main className="auth-page"><section className="auth-copy"><span className="auth-mark">V</span><p className="auth-kicker">VIZION / COLLABORATION NETWORK</p><h1>{isRegister ? 'Build work that opens doors.' : 'Welcome to your workspace.'}</h1><p>Connect students with companies through real problems, visible work, and better conversations.</p></section><section className="auth-card"><p className="auth-kicker">{isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}</p><h2>{isRegister ? 'Choose your path' : 'Continue to Vizion'}</h2><div className="auth-roles"><button type="button" className={form.role === 'student' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'student' })}>Student</button><button type="button" className={form.role === 'company' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'company' })}>Company</button></div><form onSubmit={handleSubmit} className="auth-form">{isRegister && <label>Full name<input name="name" value={form.name} onChange={update} required /></label>}<label>Email<input name="email" type="email" value={form.email} onChange={update} required /></label><label>Password<input name="password" type="password" minLength="6" value={form.password} onChange={update} required /></label>{error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={loading}>{loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}</button></form>{!isRegister && <p className="auth-reset"><Link to="/reset-password">Forgot your password?</Link></p>}<p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Vizion?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Register'}</Link></p></section></main>
}

export default AuthPage