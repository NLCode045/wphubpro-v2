
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import useToggle from '@/hooks/useToggle'
import {
  Button,
  Col,
  Container,
  Offcanvas,
  OffcanvasBody,
  OffcanvasHeader,
  OffcanvasTitle,
  Row
} from 'react-bootstrap'
import {type BackdropOption, backdropOptions,type PlacementOption, placementOptions } from './data.ts'

const DefaultOffcanvas = () => {
  const { isTrue, toggle } = useToggle()
  return (
    <ComponentCard isCollapsible title="Offcanvas">
      <p className="text-muted fs-base">
        You can trigger an offcanvas using a link with
        <code>href</code> or a button with <code>data-bs-target</code>, but both must include <code>data-bs-toggle="offcanvas"</code>.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Button variant="primary" onClick={toggle} data-bs-toggle="offcanvas" href="#offcanvasExample" role="button" aria-controls="offcanvasExample">
          Link with href
        </Button>
      </div>
      <Offcanvas
        show={isTrue}
        onHide={toggle}
        className="offcanvas-start"
        tabIndex={-1}
        id="offcanvasExample"
        aria-labelledby="offcanvasExampleLabel">
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as={'h5'} id="offcanvasExampleLabel">
            Offcanvas
          </OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody>
          <div>Some text as placeholder. In real life you can have the elements you have chosen. Like, text, images, lists, etc.</div>
          <h5 className="mt-3">List</h5>
          <ul className="ps-3">
            <li>Nemo enim ipsam voluptatem quia aspernatur</li>
            <li>Neque porro quisquam est, qui dolorem</li>
            <li>Quis autem vel eum iure qui in ea</li>
          </ul>
          <ul className="ps-3">
            <li>At vero eos et accusamus et iusto odio dignissimos</li>
            <li>Et harum quidem rerum facilis</li>
            <li>Temporibus autem quibusdam et aut officiis</li>
          </ul>
        </OffcanvasBody>
      </Offcanvas>
    </ComponentCard>
  )
}

const OffcanvasBackdrop = () => {
  const OffCanvasWithBackdrop = ({ name, ...props }: BackdropOption) => {
    const { isTrue, toggle } = useToggle()
    return (
      <>
        <Button onClick={toggle} className="mt-2 me-1 mt-md-0">
          {name}
        </Button>
        &nbsp;
        <Offcanvas placement="start" show={isTrue} onHide={toggle} {...props}>
          <OffcanvasHeader closeButton>
            <OffcanvasTitle as="h5" className="mt-0" id="offcanvasScrollingLabel">
              {name}
            </OffcanvasTitle>
          </OffcanvasHeader>
          <OffcanvasBody>
            <div>Some text as placeholder. In real life you can have the elements you have chosen. Like, text, images, lists, etc.</div>
            <h5 className="mt-3">List</h5>
            <ul className="ps-3">
              <li>Nemo enim ipsam voluptatem quia aspernatur</li>
              <li>Neque porro quisquam est, qui dolorem</li>
              <li>Quis autem vel eum iure qui in ea</li>
            </ul>
            <ul className="ps-3">
              <li>At vero eos et accusamus et iusto odio dignissimos</li>
              <li>Et harum quidem rerum facilis</li>
              <li>Temporibus autem quibusdam et aut officiis</li>
            </ul>
          </OffcanvasBody>
        </Offcanvas>
      </>
    )
  }
  return (
    <ComponentCard isCollapsible title="Offcanvas Backdrop">
      <p className="text-muted fs-base">
        When an offcanvas and its backdrop are visible,
        <code>&lt;body&gt;</code> scrolling is disabled. Use <code>data-bs-scroll</code> to enable scrolling and <code>data-bs-backdrop</code> to
        control the backdrop visibility.
      </p>
      {backdropOptions.map((offcanvas, idx) => (
        <OffCanvasWithBackdrop {...offcanvas} key={idx} />
      ))}
    </ComponentCard>
  )
}

const OffcanvasPlacement = () => {
  const OffcanvasPlacement = ({ name, ...props }: PlacementOption) => {
    const { isTrue, toggle } = useToggle()
    return (
      <>
        <Button onClick={toggle} className="mt-2 mb-2 me-2 mt-md-0">
          Toggle {name} offcanvas
        </Button>
        <Offcanvas show={isTrue} className='' onHide={toggle} {...props}>
          <OffcanvasHeader closeButton>
            <OffcanvasTitle as={'h5'} className="mt-0">
              Offcanvas {name}
            </OffcanvasTitle>
          </OffcanvasHeader>
          <OffcanvasBody>
            <div>Some text as placeholder. In real life you can have the elements you have chosen. Like, text, images, lists, etc.</div>
            <h5 className="mt-3">List</h5>
            <ul className="ps-3">
              <li>Nemo enim ipsam voluptatem quia aspernatur</li>
              <li>Neque porro quisquam est, qui dolorem</li>
              <li>Quis autem vel eum iure qui in ea</li>
            </ul>
          </OffcanvasBody>
        </Offcanvas>
      </>
    )
  }
  return (
    <ComponentCard isCollapsible title="Offcanvas Placement">
      <p className="text-muted fs-sm">
        <code>.offcanvas-start</code> positions the offcanvas on the left,
        <code>.offcanvas-end</code> on the right, <code>.offcanvas-top</code> displays it from the top, and <code>.offcanvas-bottom</code> displays it
        from the bottom of the viewport.
      </p>
      <div>
        {placementOptions.map((props, idx) => (
          <OffcanvasPlacement {...props} key={idx} />
        ))}
      </div>
    </ComponentCard>
  )
}

const DarkOffcanvas = () => {
  const { isTrue, toggle } = useToggle()
  return (
    <ComponentCard isCollapsible title="Dark Offcanvas">
      <p className="text-muted fs-sm">
        Customize the look of offcanvases using utility classes to suit different themes, such as dark navbars. Add <code>.text-bg-dark</code> to
        <code>.offcanvas</code> and <code>.btn-close-white</code> to <code>.btn-close</code>
        for dark styling.
      </p>
      <Button
        variant="primary"
        onClick={toggle}
        className="mt-2 mt-md-0"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasDark"
        aria-controls="offcanvasDark">
        Dark offcanvas
      </Button>
      <Offcanvas
        show={isTrue}
        onHide={toggle}
        className="offcanvas-start text-bg-dark"
        tabIndex={-1}
        id="offcanvasDark"
        aria-labelledby="offcanvasDarkLabel">
        <OffcanvasHeader>
          <h5 id="offcanvasDarkLabel">Dark Offcanvas</h5>
          <Button className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close" />
        </OffcanvasHeader>
        <OffcanvasBody>
          <div>Some text as placeholder. In real life you can have the elements you have chosen. Like, text, images, lists, etc.</div>
          <h5 className="mt-3">List</h5>
          <ul className="ps-3">
            <li>Nemo enim ipsam voluptatem quia aspernatur</li>
            <li>Neque porro quisquam est, qui dolorem</li>
            <li>Quis autem vel eum iure qui in ea</li>
          </ul>
        </OffcanvasBody>
      </Offcanvas>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Offcanvas" subtitle="UI" />
          <Row>
            <Col xs={6}>
              <DefaultOffcanvas />
            </Col>
            <Col xs={6}>
              <OffcanvasBackdrop />
            </Col>
            <Col xs={6}>
              <OffcanvasPlacement />
            </Col>
            <Col xs={6}>
              <DarkOffcanvas />
            </Col>
          </Row>
      </Container>
    </>
  )
}

export default Index
