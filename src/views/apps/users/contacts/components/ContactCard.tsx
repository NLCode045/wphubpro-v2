import type {ContactType} from '@/views/apps/users/contacts/data'

import {Link} from "react-router";
import {Card, CardBody} from 'react-bootstrap'
import {TbRefresh} from 'react-icons/tb'

const ContactCard = ({ contact }: { contact: ContactType }) => {
  const { flag, name, role, avatar, badge, lastUpdated, stats, username, website } = contact
  return (
      <Card>
        <CardBody className="text-center">
          <img src={avatar} alt="avatar" className="rounded-circle" width={72} height={72} />
          <h5 className="mb-0 mt-2 d-flex align-items-center justify-content-center">
            <Link to="/users/profile" className="link-reset">{name}</Link>
            <img src={flag} alt="UK" className="ms-1 rounded" height={16} />
          </h5>
          <span className="text-muted fs-xs">{role}</span><br />
          <span className={`badge bg-${badge.color} my-1`}>{badge.label}</span><br />
        <span className="text-muted">{username} | <Link to="" className="text-decoration-none text-danger">{website}</Link></span>
          <div className="mt-3">
            <button className="btn btn-primary btn-sm me-1">Message</button>&nbsp;
            <button className="btn btn-outline-secondary btn-sm">Follow</button>
          </div>
          <hr className="my-3 border-dashed" />
          <div className="d-flex justify-content-between text-center">
            <div>
              <h5 className="mb-0">{stats.posts}</h5><span className="text-muted">Posts</span>
            </div>
            <div>
              <h5 className="mb-0">{stats.followers}</h5><span className="text-muted">Followers</span>
            </div>
            <div>
              <h5 className="mb-0">{stats.followings}</h5><span className="text-muted">Followings</span>
            </div>
          </div>
          <hr className="mt-3 border-dashed" />
          <div className="text-end text-muted fs-xs"><TbRefresh className="me-1" /> Updated {lastUpdated}</div>
        </CardBody>
      </Card>

  )
}
export default ContactCard
