  import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Card, CardBody, CardFooter, Col, Container, Row } from 'react-bootstrap'
import { contacts } from '@/views/apps/crm/data'

import { generateInitials } from '@/helpers/casing'
import {Link} from "react-router";
import { TbMail, TbPhone } from 'react-icons/tb'
import type { ContactType } from '@/views/apps/crm/types'

    const ContactCard = ({ item }: { item: ContactType }) => {
      const { stats, avatar, label, email, name, categories, phone, description } = item
      return (
        <Card>
          <CardBody className="d-flex align-items-start">
            {avatar ? (
              <img src={avatar} alt="avatar" className="rounded-circle me-3" width="64" height="64" />
            ) : (
              <div className="avatar rounded-circle me-3 flex-shrink-0" style={{ height: '64px', width: '64px' }}>
                <span className="avatar-title text-bg-primary fw-semibold rounded-circle fs-22">{generateInitials(name)}</span>
              </div>
            )}

            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <Link to="/users/profile" className="link-reset">
                    {name}
                  </Link>
                </h5>
                <span className={`badge badge-label bg-${label.variant}`}>{label.text}</span>
              </div>
              <p className="mb-3 text-muted fs-xs">{description}</p>

              <div className="mb-2">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="avatar-xs avatar-img-size fs-24">
                    <span className="avatar-title text-bg-light fs-sm rounded-circle">
                      <TbMail />
                    </span>
                  </div>
                  <h5 className="fs-base mb-0 fw-medium">
                    <Link to="" className="link-reset">
                      {email}
                    </Link>
                  </h5>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="avatar-xs avatar-img-size fs-24">
                    <span className="avatar-title text-bg-light fs-sm rounded-circle">
                      <TbPhone />
                    </span>
                  </div>
                  <h5 className="fs-base mb-0 fw-medium">
                    <Link to="" className="link-reset">
                      {phone}
                    </Link>
                  </h5>
                </div>
              </div>

              <div>
                {categories.map((category, idx) => (
                  <span className={`badge ${category.variant ==='light' ? `text-bg-${category.variant}` : `badge-soft-${category.variant}`}  me-1`} key={idx}>
                    {category.name}
                  </span>
                ))}
              </div>
            </div>
          </CardBody>

          <CardFooter className="bg-light-subtle d-flex justify-content-between text-center border-top border-dashed">
            {stats.map((stat, idx) => (
              <div key={idx}>
                <h5 className="mb-0">{stat.prefix || ''}{stat.count}{stat.suffix || ''}</h5>
                <span className="text-muted">{stat.title}</span>
              </div>
            ))}
          </CardFooter>
        </Card>
      )
    }

const Contacts = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title={'Contacts'} subtitle={'CRM'} />

      <Row>
        {contacts.map((item,idx)=>(
        <Col md={6} xxl={4} key={idx}>
          <ContactCard item={item}/>
        </Col>
        ))}
      </Row>

      <ul className="pagination pagination-rounded pagination-boxed justify-content-center">
        <li className="page-item">
          <Link className="page-link" to="" aria-label="Previous">
            <span aria-hidden="true">«</span>
          </Link>
        </li>
        <li className="page-item active">
          <Link className="page-link" to="">
            1
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            2
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            3
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            4
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            5
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="" aria-label="Next">
            <span aria-hidden="true">»</span>
          </Link>
        </li>
      </ul>
    </Container>
  )
}

export default Contacts
