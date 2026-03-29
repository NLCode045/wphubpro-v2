import { Col, Row, Container, Card, CardBody } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { applications, dashboardSitemap, reportsSettings } from '@/views/pages/sitemap/data'
import {Link} from "react-router";
import { TbCircleDot } from 'react-icons/tb'

const DashboardPagesSitemap = () => {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="fw-bold text-uppercase">
          <TbCircleDot className="me-1" /> Dashboard & Pages
        </h5>

        <ul className="list-unstyled sitemap-list mt-3">
          {dashboardSitemap.map((page, idx) => (
            <li key={idx}>
              <Link to={page.url} className="link-reset fw-semibold">
                <page.icon className={`me-1 text-muted`} /> {page.label}
              </Link>

              {page.children && (
                <ul>
                  {page.children.map((child, idx) => (
                    <li key={idx}>
                      <Link to={child.url} className="link-reset">
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const ApplicationsSitemap = () => {
  return (
    <Card>
      <CardBody>
        <h5 className="fw-bold text-uppercase">
          <TbCircleDot className="me-1" /> Applications
        </h5>

        <ul className="list-unstyled sitemap-list mt-3">
          {applications.map((app, idx) => (
            <li key={idx}>
              <Link to={app.url} className="link-reset fw-semibold">
                <app.icon className={`me-1 text-muted`} /> {app.label}
              </Link>

              {app.children && (
                <ul>
                  {app.children.map((child, idx) => (
                    <li key={idx}>
                      <Link to={child.url} className="link-reset">
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

const ReportsAndSettingSitemap = () => {
  return (
    <Card>
      <CardBody>
        <h5 className="fw-bold text-uppercase">
          <TbCircleDot className="me-1" /> Reports &amp; Settings
        </h5>

        <ul className="list-unstyled sitemap-list mt-3">
          {reportsSettings.map((item, idx) => (
            <li key={idx}>
              <Link to={item.url} className="link-reset fw-semibold">
                <item.icon className={`${item.icon} me-1 text-muted`} /> {item.label}
              </Link>

              {item.children && (
                <ul>
                  {item.children.map((child, idx) => (
                    <li key={idx}>
                      <Link to={child.url} className="link-reset">
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

const Sitemap = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title={'Sitemap'} subtitle={'Pages'} />

      <Row>
        <Col md={4}>
          <DashboardPagesSitemap />
        </Col>

        <Col md={4}>
          <ApplicationsSitemap />
        </Col>

        <Col md={4}>
          <ReportsAndSettingSitemap />
        </Col>
      </Row>
    </Container>
  )
}

export default Sitemap
