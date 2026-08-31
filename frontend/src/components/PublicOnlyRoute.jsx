import { Navigate } from 'react-router-dom'

function PublicOnlyRoute({ children }) {
  let user = null
  try {
    user = JSON.parse(localStorage.getItem('vizion-user') || 'null')
  } catch {
    localStorage.removeItem('vizion-user')
  }

  if (user?.role === 'student' || user?.role === 'company') {
    return <Navigate to={`/${user.role}-dashboard`} replace />
  }

  return children
}

export default PublicOnlyRoute