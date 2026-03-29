import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useAuth } from '@/domains/auth'
import { useNavigate } from 'react-router'
import { TbUser, TbUserShield } from 'react-icons/tb'

const AdminAreaNav = () => {
  const { isAdmin } = useAuth()
  const { mode, setMode } = useDashboardNav()
  const navigate = useNavigate()

  if (!isAdmin) {
    return null
  }

  const goUser = () => {
    setMode('user')
    navigate(ROUTE_PATHS.DASHBOARD)
  }

  const goAdmin = () => {
    setMode('admin')
    navigate(ROUTE_PATHS.ADMIN_DASHBOARD)
  }

  return (
    <div className="topbar-item d-none d-md-flex align-items-center gap-1 ms-1">
      <button
        type="button"
        onClick={goUser}
        className={`topbar-link btn fw-medium btn-link ${mode === 'user' ? 'active text-primary' : ''}`}>
        <TbUser className="fs-16 me-1 align-middle" />
        User
      </button>
      <span className="text-muted opacity-50">|</span>
      <button
        type="button"
        onClick={goAdmin}
        className={`topbar-link btn fw-medium btn-link ${mode === 'admin' ? 'active text-primary' : ''}`}>
        <TbUserShield className="fs-16 me-1 align-middle" />
        Admin
      </button>
    </div>
  )
}

export default AdminAreaNav
