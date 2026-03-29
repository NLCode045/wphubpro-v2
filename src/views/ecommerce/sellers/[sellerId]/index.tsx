import SellerContact from '@/views/ecommerce/sellers/[sellerId]/components/SellerContact'
import SellerOverview from '@/views/ecommerce/sellers/[sellerId]/components/SellerOverview'
import SellerProducts from '@/views/ecommerce/sellers/[sellerId]/components/SellerProducts'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'
import { Col, Container, Row } from 'react-bootstrap'
import { sellerStatistics } from '@/views/ecommerce/sellers/[sellerId]/data'
import SellerStatisticCard from '@/views/ecommerce/sellers/[sellerId]/components/SellerStatisticCard'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Seller Details" subtitle="Ecommerce" />
      <Row>
        <Col xl={3}>
          <SellerContact />
        </Col>
        <Col xl={9}>
          <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
            {sellerStatistics.map((item,idx)=>(
            <Col key={idx}>
              <SellerStatisticCard item={item}/>
            </Col>
            ))}
          </Row>
          <SellerOverview />
          <h4 className="my-4">My Products</h4>
          <Row>
            <Col xs={12}>
              <SellerProducts />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}

export default Index
