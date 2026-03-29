
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Button, Col, Container, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { toPascalCase } from '@/helpers/casing'

const colorVariants = ['primary', 'danger', 'info', 'success', 'secondary', 'warning', 'dark',]

const BasicTooltips = () => {
  return (
    <ComponentCard isCollapsible title="Basic">
      <p className="text-muted">Hover over the links below to see tooltips.</p>
      <p className="mb-0">
        Powerful admin features like
        <OverlayTrigger placement="top" overlay={<Tooltip className="danger-tooltip">Manage your dashboard easily</Tooltip>}>
          <a href="#" className="fw-medium" data-bs-title="Manage your dashboard easily">
            custom dashboards
          </a>
        </OverlayTrigger>
        &nbsp; and UI components help you build scalable web applications efficiently. This template includes pre-built pages, clean layouts, and
        reusable code blocks to boost your development workflow. From user management to analytics and settings, everything is modular and
        developer-friendly. Create modern admin panels with&nbsp;
        <OverlayTrigger placement="top" overlay={<Tooltip className="danger-tooltip">Built with Bootstrap 5</Tooltip>}>
          <a href="#" className="fw-medium" data-bs-title="Built with Bootstrap 5">
            responsive design
          </a>
        </OverlayTrigger>
        &nbsp; and seamless UX. Get started quickly with a professional-grade&nbsp;
        <OverlayTrigger placement="top" overlay={<Tooltip className="danger-tooltip">Tailored for developers</Tooltip>}>
          <a href="#" className="fw-medium" data-bs-title="Tailored for developers">
            UI toolkit
          </a>
        </OverlayTrigger>
        &nbsp; and supercharge your app with&nbsp;
        <OverlayTrigger placement="top" overlay={<Tooltip className="danger-tooltip">Includes charts, tables, forms and more</Tooltip>}>
          <a href="#" className="fw-medium" data-bs-title="Includes charts, tables, forms and more">
            powerful components
          </a>
        </OverlayTrigger>
        &nbsp; and flexible layouts.
      </p>
    </ComponentCard>
  )
}

const DisabledElements = () => {
  return (
    <ComponentCard isCollapsible title="Disabled Elements">
      <p className="text-muted">
        Elements with the <code>disabled</code> attribute aren’t interactive, meaning users cannot focus, hover, or click them to trigger a tooltip
        (or popover). As a workaround, you’ll want to trigger the tooltip from a wrapper <code>&lt;div&gt;</code> or <code>&lt;span&gt;</code>,
        ideally made keyboard-focusable using <code>tabindex="0"</code>, and override the
        <code>pointer-events</code> on the disabled element.
      </p>
      <OverlayTrigger placement="top" overlay={<Tooltip>Disabled tooltip</Tooltip>}>
        <span className="d-inline-block" tabIndex={0} data-bs-title="Disabled tooltip">
          <Button variant="primary" className="pe-none" disabled>
            Disabled button
          </Button>
        </span>
      </OverlayTrigger>
    </ComponentCard>
  )
}

const HoverElements = () => {
  return (
    <ComponentCard isCollapsible title="Hover Elements">
      <p className="text-muted">
        Elements with the <code>disabled</code> attribute aren’t interactive, meaning users cannot focus, hover, or click them to trigger a tooltip
        (or popover). As a workaround, you’ll want to trigger the tooltip from a wrapper <code>&lt;div&gt;</code> or <code>&lt;span&gt;</code>,
        ideally made keyboard-focusable using <code>tabindex="0"</code>, and override the
        <code>pointer-events</code> on the disabled element.
      </p>
      <OverlayTrigger placement="top" overlay={<Tooltip>Tooltip appears on hover only</Tooltip>}>
        <Button variant="primary" data-bs-trigger="hover">
          Hover to See Info
        </Button>
      </OverlayTrigger>
    </ComponentCard>
  )
}

const FourDirections = () => {
  return (
    <ComponentCard isCollapsible title="Four Directions">
      <p className="text-muted">Hover over the buttons below to see the four tooltips directions: top, right, bottom, and left.</p>
      <div className="d-flex flex-wrap gap-2">
        <OverlayTrigger overlay={<Tooltip className="primary-tooltip">Tooltip on top</Tooltip>}>
          <Button variant="info" data-bs-placement="top">
            Tooltip ontop
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip className="danger-tooltip">Tooltip on bottom</Tooltip>}>
          <Button variant="info" data-bs-placement="bottom">
            Tooltip on bottom
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="left" overlay={<Tooltip className="danger-tooltip">Tooltip on left</Tooltip>}>
          <Button variant="info" data-bs-placement="left">
            Tooltip on left
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="right" overlay={<Tooltip className="danger-tooltip">Tooltip on right</Tooltip>}>
          <Button variant="info" data-bs-placement="right" data-bs-title="Tooltip on right">
            Tooltip on right
          </Button>
        </OverlayTrigger>
      </div>
    </ComponentCard>
  )
}

const HTMLTags = () => {
  return (
    <ComponentCard isCollapsible title="HTML Tags">
      <p className="text-muted">And with custom HTML added:</p>
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip className="danger-tooltip">
            <em>New</em> <u>Tooltip</u> <b>with</b> <i>HTML</i> <br />
            Custom message here!
          </Tooltip>
        }>
        <Button
          variant="secondary"
          data-bs-toggle="tooltip"
          data-bs-html="true"
          data-bs-title="<em>New</em> <u>Tooltip</u> <b>with</b> <i>HTML</i> <br/>Custom message here!">
          Tooltip with HTML
        </Button>
      </OverlayTrigger>
    </ComponentCard>
  )
}

const ColorTooltips = () => {
  return (
    <ComponentCard isCollapsible title="Color Tooltips">
      <p className="text-muted">
        We set a custom class with ex.
        <code>data-bs-custom-class="primary-tooltip"</code> to scope our background-color primary appearance and use it to override a local CSS
        variable.
      </p>
      <div className="d-flex flex-wrap gap-2">
        {colorVariants.map((color, idx) => {
          return (
            <OverlayTrigger
              placement="top"
              key={idx}
              overlay={<Tooltip className={`tooltip-${color}`}>This top tooltip {color} is themed via CSS variables.</Tooltip>}>
              <Button variant={color}>{toPascalCase(color)} tooltip</Button>
            </OverlayTrigger>
          )
        })}
      </div>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Tooltips" subtitle="UI" />
        <Row>
          <Col xl={6}>
            <BasicTooltips />
            <DisabledElements />
            <HoverElements />
          </Col>
          <Col xl={6}>
            <FourDirections />
            <HTMLTags />
            <ColorTooltips />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
