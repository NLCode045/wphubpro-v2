
import { useLayoutContext } from '@/context/useLayoutContext'
import CustomizerToggler from '@/layouts/components/topbar/components/CustomizerToggler'
import LanguageDropdown from '@/layouts/components/topbar/components/LanguageDropdown'
import AdminAreaNav from '@/layouts/components/topbar/components/AdminAreaNav'
import MessageDropdown from '@/layouts/components/topbar/components/MessageDropdown'
import ThemeToggler from '@/layouts/components/topbar/components/ThemeToggler'
import ImpersonationExitButton from '@/layouts/components/topbar/components/ImpersonationExitButton'
import UserProfile from '@/layouts/components/topbar/components/UserProfile'

import {Link} from "react-router";
import { Container, FormControl } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { TbMenu4 } from 'react-icons/tb'

import logoDark from '@/assets/images/logo-black.png'
import logoSm from '@/assets/images/logo-sm.png'
import logo from '@/assets/images/logo.png'
import ApplicationMenu from '@/layouts/components/topbar/components/ApplicationMenu'
import FullscreenToggle from '@/layouts/components/topbar/components/FullscreenToggle'
import MonochromeThemeModeToggler from '@/layouts/components/topbar/components/MonochromeThemeModeToggler'

const Topbar = () => {
  const { sidenav, changeSideNavSize, showBackdrop } = useLayoutContext()

  const toggleSideNav = () => {
    const html = document.documentElement
    const currentSize = html.getAttribute('data-sidenav-size')

    if (currentSize === 'offcanvas') {
      html.classList.toggle('sidebar-enable')
      showBackdrop()
    } else if (sidenav.size === 'compact') {
      changeSideNavSize(currentSize === 'compact' ? 'condensed' : 'compact', false)
    } else {
      changeSideNavSize(currentSize === 'condensed' ? 'default' : 'condensed')
    }
  }

  return (
    <header className="app-topbar">
      <Container fluid className="topbar-menu">
        <div className="d-flex align-items-center gap-2">
          <div className="logo-topbar">
            <Link to="/" className="logo-light">
              <span className="logo-lg">
                <img src={logo} alt="logo"  />
              </span>
              <span className="logo-sm">
                <img src={logoSm} alt="small logo"  />
              </span>
            </Link>

            <Link to="/" className="logo-dark">
              <span className="logo-lg">
                <img src={logoDark} alt="dark logo"  />
              </span>
              <span className="logo-sm">
                <img src={logoSm} alt="small logo"  />
              </span>
            </Link>
          </div>

          <button onClick={toggleSideNav} className="sidenav-toggle-button btn btn-default btn-icon">
            <TbMenu4 className="fs-22" />
          </button>

          <AdminAreaNav />
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="app-search d-none d-xl-flex me-2">
            <FormControl type="search" className="topbar-search rounded-pill" name="search" placeholder="Quick Search..." />
            <LuSearch className="app-search-icon text-muted" />
          </div>

          <LanguageDropdown />

          <MessageDropdown />

          <ApplicationMenu />

          <ThemeToggler />

          <FullscreenToggle />

          <MonochromeThemeModeToggler />

          <ImpersonationExitButton />

          <UserProfile />

          <CustomizerToggler />
        </div>
      </Container>
    </header>
  )
}

export default Topbar
