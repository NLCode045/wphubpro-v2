import { Card, CardBody } from 'react-bootstrap'
import {Link} from "react-router";

import user7 from '@/assets/images/users/user-7.jpg'

import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'
import user10 from '@/assets/images/users/user-10.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'

import gallery2 from '@/assets/images/stock/gallery-2.jpg'
import gallery3 from '@/assets/images/stock/gallery-3.jpg'
import type { ActivityType } from '@/views/apps/social-feed/types'
import { TbUserPlus } from 'react-icons/tb'

const activities: ActivityType[] = [
  { avatar: user8, name: 'jenny.w', message: 'started following you', time: '2m ago' },
  { avatar: user9, name: 'daniel92', message: 'commented on your post', time: '3m ago', image: gallery2 },
  { avatar: user10, name: 'amelie.design', message: 'liked your story', time: '4m ago', image: gallery3 },
  { avatar: user5, name: 'johnny_dev', message: 'started following you', time: '6m ago' },
  { avatar: user6, name: 'art.gal', message: 'liked your post', time: '8m ago', image: gallery2 },
]

const Activity = () => {
  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Activity</h5>
          <Link to="" className="link-reset fs-sm">
            See all
          </Link>
        </div>

        <div className="mb-3">
          <small className="text-muted text-uppercase">Stories About You</small>
          <div className="d-flex align-items-center mt-2">
            <img src={user7} className="rounded-circle me-2" width="32" height="32" alt="mention" />
            <div>
              <strong>Mentions</strong>
              <br />
              <span className="text-muted fs-xs">3 stories mention you</span>
            </div>
          </div>
        </div>

        <span className="text-muted fs-xs fw-bold text-uppercase">New</span>
        <ul className="list-unstyled mt-2 mb-0">
          {activities.map((item, idx) => (
            <li className="d-flex align-items-center py-1" key={idx}>
              <img src={item.avatar} className="rounded-circle me-2" width="36" height="36" alt={item.name} />
              <div className="flex-grow-1">
                <strong>{item.name}</strong> {item.message}
                <br />
                <span className="text-muted fs-xs">{item.time}</span>
              </div>
              {item.image ? (
                <div>
                  <img src={item.image} className="rounded" width="32" height="32" alt="commented" />
                </div>
              ) : (
                <div className="text-primary">
                  <TbUserPlus className="fs-lg" />
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

export default Activity
