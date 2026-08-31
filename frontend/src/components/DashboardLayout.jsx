import { Bell, LogOut, Radar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../styles/Portal.css'

function DashboardLayout({ role, title, eyebrow, children }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('vizion-user') || '{}')
  const signOut = () => { localStorage.removeItem('vizion-user'); navigate('/login', { replace: true }) }
  return <div className="dashboard-shell"><header className="dashboard-nav"><div className="portal-brand"><span>V</span> VIZION</div><div className="dashboard-nav-meta"><span className="live-mark"><Radar size={14} /> LIVE NETWORK</span><button className="icon-action" type="button" title="Notifications"><Bell size={18} /></button><button className="user-menu" type="button" onClick={signOut}><span>{user.name || user.email || role}</span><LogOut size={15} /></button></div></header><main className="dashboard-main"><div className="dashboard-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><span className="role-badge">{role}</span></div>{children}</main></div>
}

export default DashboardLayout
