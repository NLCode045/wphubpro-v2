import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Row } from 'react-bootstrap'
import SocialProfile from '@/views/apps/social-feed/components/SocialProfile'
import Feeds from '@/views/apps/social-feed/components/Feeds'
import Activity from '@/views/apps/social-feed/components/Activity'
import Trending from '@/views/apps/social-feed/components/Trending'
import Requests from '@/views/apps/social-feed/components/Requests'
import FeaturedVideo from '@/views/apps/social-feed/components/FeaturedVideo'

const Page = () => {
  return (
    <div className="container-fluid">
      <PageBreadcrumb title="Social Feed" subtitle={'Apps'} />

      <Row>
        <Col xl={3} lg={6} className="order-lg-1 order-xl-1">
          <SocialProfile />
        </Col>

        <Col xl={6} lg={12} className="order-lg-2 order-xl-1">
          <Feeds />
        </Col>

        <Col xl={3} lg={6} className="order-lg-1 order-xl-2">
          <Activity />

          <Trending />

          <Requests />

          <FeaturedVideo />
        </Col>
      </Row>
    </div>
  )
}

export default Page
