import { Navigate, useLocation } from 'react-router-dom'

function ProtectedRoute({ role, children }) {
  const location = useLocation()
  let user = null
  try {
    user = JSON.parse(localStorage.getItem('vizion-user') || 'null')
  } catch {
    localStorage.removeItem('vizion-user')
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== role) return <Navigate to={`/${user.role}-dashboard`} replace />
  return children
}

export default ProtectedRoute