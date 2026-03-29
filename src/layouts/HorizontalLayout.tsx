import Topbar from '@/layouts/components/topbar'
import type { ChildrenType } from '@/types'
import { Fragment } from 'react'
import ResponsiveNavbar from '@/layouts/components/responsive-navbar'

const HorizontalLayout = ({ children }: ChildrenType) => {
  return (
    <Fragment>
      <div className="wrapper">
        <Topbar />

        <ResponsiveNavbar />

        <div className="content-page">{children}</div>
      </div>
    </Fragment>
  )
}

export default HorizontalLayout
