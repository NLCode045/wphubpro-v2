import Sidenav from '@/layouts/components/sidenav'
import Topbar from '@/layouts/components/topbar'
import { Fragment } from 'react'

import type { ChildrenType } from '@/types'

const VerticalLayout = ({ children }: ChildrenType) => {
  return (
    <Fragment>
      <div className="wrapper">
        <Sidenav />

        <Topbar />

        <div className="content-page">{children}</div>
      </div>
    </Fragment>
  )
}

export default VerticalLayout
