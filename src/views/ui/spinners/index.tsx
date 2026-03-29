import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import Spinner from '@/components/Spinner'
import { Col, Container, Row } from 'react-bootstrap'

const colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark', 'light',]

const BorderedSpinners = () => {
  return (
    <ComponentCard isCollapsible title="Border Spinner">
      <p className="text-muted">Use border spinners as lightweight loading indicators.</p>
      <Spinner className="m-2" />
    </ComponentCard>
  )
}

const ColorsSpinners = () => {
  return (
    <ComponentCard isCollapsible title="Colors">
      <p className="text-muted">
        Use text color utilities like <code>.text-primary</code>,<code>.text-success</code>, or <code>.text-danger</code> to style the spinner, which
        inherits its color from <code>currentColor</code>.
      </p>
      {colorVariants.slice(0, 10).map((color, idx) => {
        return <Spinner key={idx} className="m-2" color={color} />
      })}
    </ComponentCard>
  )
}

const AlignmentSpinner = () => {
  return (
    <ComponentCard isCollapsible title="Alignment">
      <p className="text-muted">
        Bootstrap spinners use <code>rem</code>,<code>currentColor</code>, and <code>inline-flex</code> for easy sizing and alignment.
      </p>
      <div className="d-flex justify-content-center">
        <Spinner />
      </div>
    </ComponentCard>
  )
}

const ButtonsSpinner = () => {
  return (
    <ComponentCard isCollapsible title="Buttons Spinner">
      <Row className="g-3">
        <Col lg={6}>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-primary btn-icon" type="button" disabled>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span className="visually-hidden">Loading...</span>
            </button>
            <button className="btn btn-primary btn-icon rounded-circle" type="button" disabled>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span className="visually-hidden">Loading...</span>
            </button>
            <button className="btn btn-primary" type="button" disabled>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span className="visually-hidden">Loading...</span>
            </button>
            <button className="btn btn-primary" type="button" disabled>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Loading...
            </button>
          </div>
        </Col>
        <Col lg={6}>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-primary btn-icon" type="button" disabled>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="visually-hidden">Loading...</span>
            </button>
            <button className="btn btn-primary btn-icon rounded-circle" type="button" disabled>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="visually-hidden">Loading...</span>
            </button>
            <button className="btn btn-primary" type="button" disabled>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="visually-hidden">Loading...</span>
            </button>
            <button className="btn btn-primary" type="button" disabled>
              <span className="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true" />
              Loading...
            </button>
          </div>
        </Col>
      </Row>
    </ComponentCard>
  )
}

const GrowingSpinners = () => {
  return (
    <ComponentCard isCollapsible title="Growing Spinner">
      <p className="text-muted">
        Bootstrap spinners use <code>rem</code>,<code>currentColor</code>, and <code>inline-flex</code> for easy resizing, coloring, and alignment.
      </p>
      <Spinner type="grow" className="m-2" />
    </ComponentCard>
  )
}

const ColorGrowingSpinners = () => {
  return (
    <ComponentCard isCollapsible title="Color Growing Spinner">
      <p className="text-muted">
        The grow spinner also uses <code>currentColor</code>, so apply classes like <code>.text-primary</code>, <code>.text-warning</code>, or
        <code>.text-info</code> to customize its color.
      </p>

      {colorVariants.slice(0, 10).map((color, idx) => {
        return <Spinner key={idx} className="m-2" type="grow" color={color} />
      })}
    </ComponentCard>
  )
}

const SpinnersSizes = () => {
  const sizes: ('lg' | 'md' | 'sm')[] = ['lg', 'md', 'sm']

  return (
    <ComponentCard isCollapsible title="Size">
      <Row>
        {(sizes || []).map((size, idx) => {
          return (
            <Col lg={6} key={idx}>
              <Spinner className="text-primary m-2" color="primary" size={size} />
              <Spinner color="secondary" className="text-secondary m-2" type="grow" size={size} />
            </Col>
          )
        })}
        <Col lg={6}>
          <Spinner className="spinner-border-sm m-2"></Spinner>
          <Spinner type="grow" className="spinner-grow-sm m-2"></Spinner>
        </Col>
      </Row>
    </ComponentCard>
  )
}

const Page = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Spinners" subtitle="UI" />
          <Row>
            <Col xl={6}>
              <BorderedSpinners />
              <ColorsSpinners />
              <AlignmentSpinner />
              <ButtonsSpinner />
            </Col>
            <Col xl={6}>
              <GrowingSpinners />
              <ColorGrowingSpinners />
              <SpinnersSizes />
            </Col>
          </Row>
      </Container>
    </>
  )
}

export default Page
