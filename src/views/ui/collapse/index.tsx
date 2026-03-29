
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import useToggle from '@/hooks/useToggle'
import { Button, Card, Col, Collapse, Container, Row } from 'react-bootstrap'

const DefaultCollapse = () => {
  const { isTrue, toggle } = useToggle(true)
  return (
    <ComponentCard isCollapsible title="Collapse">
      <p>
        <Button variant="primary" onClick={toggle}>
          Collapse
        </Button>
      </p>
      <Collapse in={isTrue}>
        <div>
          <Card className="card-body mb-0  border border-dashed border-light card-body">
            Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. Nihil anim keffiyeh helvetica, craft beer
            labore wes anderson cred nesciunt sapiente ea proident.
          </Card>
        </div>
      </Collapse>
    </ComponentCard>
  )
}

const MultipleTargets = () => {
  const { isTrue: isOpenFirst, toggle: toggleFirst } = useToggle(false)
  const { isTrue: isOpenSecond, toggle: toggleSecond } = useToggle(false)
  const toggleBoth = () => {
    toggleFirst()
    toggleSecond()
  }
  return (
    <ComponentCard isCollapsible title="Multiple Targets">
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button variant="primary" onClick={toggleFirst}>
          Toggle first element
        </Button>
        <Button variant="primary" onClick={toggleSecond}>
          Toggle second element
        </Button>
        <Button variant="primary" onClick={toggleBoth}>
          Toggle both elements
        </Button>
      </div>
      <Row>
        <Col>
          <Collapse className="multi-collapse" in={isOpenFirst}>
            <div>
              <Card className="card-body mb-0 border border-dashed border-light card-body">
                Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. Nihil anim keffiyeh helvetica, craft
                beer labore wes anderson cred nesciunt sapiente ea proident.
              </Card>
            </div>
          </Collapse>
        </Col>
        <Col>
          <Collapse className="multi-collapse" in={isOpenSecond}>
            <div>
              <Card className="card-body mb-0 border border-dashed border-light card-body">
                Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. Nihil anim keffiyeh helvetica, craft
                beer labore wes anderson cred nesciunt sapiente ea proident.
              </Card>
            </div>
          </Collapse>
        </Col>
      </Row>
    </ComponentCard>
  )
}

const CollapseHorizontal = () => {
  const { isTrue, toggle } = useToggle()
  return (
    <ComponentCard isCollapsible title="Collapse Horizontal">
      <p>
        <Button variant="primary" onClick={toggle}>
          Toggle width collapse
        </Button>
      </p>
      <div style={{ height: 100 }}>
        <Collapse dimension="width" in={isTrue}>
          <div>
            <Card className="card-body mb-0 border border-dashed border-light card-body" style={{ width: 300 }}>
              This is some placeholder content for a horizontal collapse. It's hidden by default and shown when triggered.
            </Card>
          </div>
        </Collapse>
      </div>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Collapse" subtitle="UI" />
        <Row>
          <Col xl={6}>
            <DefaultCollapse />
            <MultipleTargets />
          </Col>
          <Col xl={6}>
            <CollapseHorizontal />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
