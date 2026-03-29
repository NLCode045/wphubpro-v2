import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

const ResponsiveEmbedVideo219 = () => {
  return (
    <ComponentCard isCollapsible title="Responsive embed video 21:9">
      <div className="ratio ratio-21x9">
        <iframe src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0" />
      </div>
    </ComponentCard>
  )
}

const ResponsiveEmbedVideo11 = () => {
  return (
    <ComponentCard isCollapsible title="Responsive embed video 1:1">
      <div className="ratio ratio-1x1">
        <iframe src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0" />
      </div>
    </ComponentCard>
  )
}

const ResponsiveEmbedVideo169 = () => {
  return (
    <ComponentCard isCollapsible title="Responsive embed video 16:9">
      <div className="ratio ratio-16x9">
        <iframe src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0" />
      </div>
    </ComponentCard>
  )
}

const ResponsiveEmbedVideo43 = () => {
  return (
    <ComponentCard isCollapsible title="Responsive embed video 4:3">
      <div className="ratio ratio-4x3">
        <iframe src="https://www.youtube.com/embed/zpOULjyy-n8?rel=0" />
      </div>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Videos" subtitle="UI" />
        <Row>
          <Col xl={6}>
            <ResponsiveEmbedVideo219 />
            <ResponsiveEmbedVideo11 />
          </Col>
          <Col xl={6}>
            <ResponsiveEmbedVideo169 />
            <ResponsiveEmbedVideo43 />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
