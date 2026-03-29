import {Link} from "react-router";
import { Button, CardBody, ListGroup, ListGroupItem } from 'react-bootstrap'
import type { IconType } from 'react-icons'
import { TbChartDonutFilled, TbClock, TbDownload, TbFolder, TbShare, TbStar, TbTrash } from 'react-icons/tb'
import SimpleBar from "simplebar-react";

type SideBarItemType = {
  name: string
  icon: IconType
  variant?: string
  badge?: {
    text: string
    variant: string
  }
}

const items: SideBarItemType[] = [
  { name: 'My Files', icon: TbFolder, badge: { text: '12', variant: 'danger' } },
  { name: 'Shared with Me', icon: TbShare },
  { name: 'Recent', icon: TbClock },
  { name: 'Favourites', icon: TbStar },
  { name: 'Downloads', icon: TbDownload },
  { name: 'Trash', icon: TbTrash },
]

const categories: SideBarItemType[] = [
  { name: 'Work', icon: TbChartDonutFilled, variant: 'primary' },
  { name: 'Projects', icon: TbChartDonutFilled, variant: 'purple' },
  { name: 'Media', icon: TbChartDonutFilled, variant: 'info' },
  { name: 'Documents', icon: TbChartDonutFilled, variant: 'warning' },
]

const SideBar = () => {
  return (
    <SimpleBar className="card h-100 mb-0 rounded-0 border-0">
      <CardBody>
        <Button variant="danger" className="fw-medium w-100">
          Upload Files
        </Button>

        <ListGroup variant="flush" className="list-custom mt-3">
          {items.map((item, idx) => (
            <ListGroupItem key={item.name} as={Link} to="" action className={idx === 0 ? 'active' : ''}>
              <item.icon className="align-middle me-1 opacity-75 fs-lg" />
              <span className="align-middle">{item.name}</span>
              {item.badge && (
                <span className={`badge align-middle bg-${item.badge.variant}-subtle fs-xxs text-${item.badge.variant} float-end`}>
                  {item.badge.text}
                </span>
              )}
            </ListGroupItem>
          ))}

          <ListGroupItem className="mt-2">
            <span className="align-middle">Categories</span>
          </ListGroupItem>

          {categories.map((item) => (
            <ListGroupItem key={item.name} as={Link} to="" action>
              <item.icon className={`align-middle me-1 opacity-75 fs-lg text-${item.variant ?? 'primary'}`} />
              <span className="align-middle">{item.name}</span>
            </ListGroupItem>
          ))}
        </ListGroup>
      </CardBody>

    </SimpleBar>
  )
}

export default SideBar
