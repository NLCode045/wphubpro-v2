
import {Link} from "react-router";

import logoDark from '@/assets/images/logo-black.png'
import logo from '@/assets/images/logo.png'

const AppLogo = ({ height }: { height?: number }) => {
  return (
    <>
      <Link to="/" className="logo-dark">
        <img src={logoDark} alt="dark logo" height={height ?? 28} />
      </Link>
      <Link to="/" className="logo-light">
        <img src={logo} alt="logo" height={height ?? 28} />
      </Link>
    </>
  )
}

export default AppLogo
