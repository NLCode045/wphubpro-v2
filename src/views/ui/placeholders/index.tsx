
import small1 from '@/assets/images/stock/small-1.jpg'
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'

import { Button, Card, CardBody, CardTitle, Col, Container, Placeholder, Row } from 'react-bootstrap'

const DefaultPlaceholders = () => {
  return (
    <ComponentCard isCollapsible title="Placeholders">
      <p className="text-muted">
        In the example below, we take a typical card component and recreate it with placeholders applied to create a “loading card”. Size and
        proportions are the same between the two.
      </p>
      <Row>
        <Col md={5}>
          <Card className="border shadow-none mb-md-0">
            <img src={small1} className="card-img-top img-fluid" alt="..." />
            <CardBody>
              <CardTitle as={'h5'} className="mb-2">
                Card title
              </CardTitle>
              <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card&apos;s content.</p>
              <Button variant="primary">Go somewhere</Button>
            </CardBody>
          </Card>
        </Col>
        <Col md={5}>
          <Card className="border shadow-none mb-0" aria-hidden="true">
            <svg
              className="card-img-top"
              width="100%"
              style={{ aspectRatio: '16 / 10' }}
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Placeholder"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 16 10">
              <title>Placeholder</title>
              <rect width={16} height={10} fill="#20c997" />
            </svg>
            <CardBody>
              <CardTitle as={'h5'} className="mb-2 placeholder-glow">
                <Placeholder className="placeholder col-6">&nbsp;</Placeholder>
              </CardTitle>
              <p className="card-text placeholder-glow">
                <Placeholder className="col-7" />
                &nbsp;
                <Placeholder className="col-4" />
                <Placeholder className="col-4" />
                &nbsp;
                <Placeholder className="col-6" />
                <Placeholder className="col-3" />
              </p>
              <Button variant="primary" className="disabled placeholder col-6" aria-disabled="true">
                <span className="invisible">Read Only</span>
              </Button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </ComponentCard>
  )
}

const ColorPlaceholders = () => {
  return (
    <ComponentCard isCollapsible title="Color">
      <p className="text-muted">
        By default, the <code>placeholder</code> uses <code>currentColor</code>. This can be overriden with a custom color or utility class.
      </p>
      <Placeholder className="col-12" />
      <Placeholder className="col-12 bg-primary" />
      <Placeholder className="col-12 bg-secondary" />
      <Placeholder className="col-12 bg-success" />
      <Placeholder className="col-12 bg-danger" />
      <Placeholder className="col-12 bg-warning" />
      <Placeholder className="col-12 bg-info" />
      <Placeholder className="col-12 bg-light" />
      <Placeholder className="col-12 bg-dark" />
    </ComponentCard>
  )
}

const WidthPlaceholders = () => {
  return (
    <ComponentCard isCollapsible title="Color">
      <p className="text-muted">
        You can change the <code>width</code> through grid column classes, width utilities, or inline styles.
      </p>
      <Placeholder className="col-6" />
      <Placeholder className="w-75" />
      <br />
      <Placeholder style={{ width: '25%' }} />
      &nbsp;
      <Placeholder style={{ width: '10%' }} />
    </ComponentCard>
  )
}

const SizingPlaceholders = () => {
  return (
    <ComponentCard isCollapsible title="Sizing">
      <p className="text-muted">
        The size of <code>.placeholder</code>s are based on the typographic style of the parent element. Customize them with sizing modifiers:
        <code>.placeholder-lg</code>,<code>.placeholder-sm</code>, or <code>.placeholder-xs</code>.
      </p>
      <Placeholder size="lg" className="col-12" />
      <Placeholder className="col-12" />
      <Placeholder size="sm" className="col-12" />
      <Placeholder size="xs" className="col-12" />
    </ComponentCard>
  )
}

const WorksPlaceholder = () => {
  return (
    <ComponentCard isCollapsible title="How it works">
      <p className="text-muted">
        Create placeholders with the <code>.placeholder</code> class and a grid column class (e.g., <code>.col-6</code>) to set the <code>width</code>
        . They can replace the text inside an element or as be added as a modifier class to an existing component.
      </p>
      <p aria-hidden="true">
        <Placeholder className="col-6" />
      </p>
      <Button variant="primary" disabled className="placeholder col-4" />
    </ComponentCard>
  )
}

const AnimationPlaceholder = () => {
  return (
    <ComponentCard isCollapsible title="Animation">
      <p className="text-muted">
        Animate placehodlers with <code>.placeholder-glow</code> or
        <code>.placeholder-wave</code> to better convey the perception of something being
        <em>actively</em> loaded.
      </p>
      <p className="placeholder-glow">
        <Placeholder className="col-12" />
      </p>
      <p className="placeholder-wave mb-0">
        <Placeholder className="col-12" />
      </p>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Placeholders" subtitle="UI" />
        <Row>
          <Col xs={6}>
            <DefaultPlaceholders />
          </Col>
          <Col xs={6}>
            <ColorPlaceholders />
          </Col>
          <Col xs={6}>
            <WidthPlaceholders />
          </Col>
          <Col xs={6}>
            <SizingPlaceholders />
          </Col>
          <Col xs={6}>
            <WorksPlaceholder />
          </Col>
          <Col xs={6}>
            <AnimationPlaceholder />
          </Col>
        </Row>
      </Container >
    </>
  )
}

export default Index
