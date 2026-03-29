
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import {
  Button,
  Col,
  Container,
  type OverlayProps,
  OverlayTrigger,
  Popover,
  PopoverBody,
  PopoverHeader,
  Row
} from 'react-bootstrap'

interface PopoverDirection {
  placement: OverlayProps['placement']
}

const SimplePopover = () => {
  const basicPopover = (
    <Popover id="popover-basic">
      <PopoverHeader as="h3">Need Help?</PopoverHeader>
      <PopoverBody>Click here to get support from our team. We're here 24/7 to assist you.</PopoverBody>
    </Popover>
  )
  return (
    <ComponentCard isCollapsible title="Simple Popover">
      <OverlayTrigger trigger={'click'} placement="right" overlay={basicPopover}>
        <Button
          variant="info"
          title="Popover title"
          data-bs-content="Click here to get support from our team. We're here 24/7 to assist you.">
          Get Support Info
        </Button>
      </OverlayTrigger>
    </ComponentCard>
  )
}

const HoverPopovers = () => {
  const hoverPopover = (
    <Popover>
      <PopoverHeader as="h3">Ohh Wow !</PopoverHeader>
      <PopoverBody>And here&apos;s some amazing content. It&apos;s very engaging. Right?</PopoverBody>
    </Popover>
  )
  return (
    <ComponentCard isCollapsible title="Hover">
      <OverlayTrigger trigger={['hover', 'focus']} placement="right" overlay={hoverPopover}>
        <Button
          variant="dark"
          tabIndex={0}
          data-bs-trigger="hover"
          data-bs-content="And here's some amazing content. It's very engaging. Right?"
          title="Ohh Wow !">
          Please Hover Me
        </Button>
      </OverlayTrigger>
    </ComponentCard>
  )
}

const CustomPopovers = () => {
  const customPopover = (variant: string) => (
    <Popover className={`popover-${variant}`}>
      <PopoverHeader as="h3">Primary Popover</PopoverHeader>
      <PopoverBody>This popover is themed via CSS variables.</PopoverBody>
    </Popover>
  )

  return (
    <ComponentCard isCollapsible title="Custom Popovers">
      <div className="d-flex flex-wrap gap-2">
        <OverlayTrigger trigger="click" placement="right" overlay={customPopover('primary')}>
          <Button variant="primary">Primary Popover</Button>
        </OverlayTrigger>
        <OverlayTrigger trigger="click" placement="right" overlay={customPopover('success')}>
          <Button variant="success">Success Popover</Button>
        </OverlayTrigger>
        <OverlayTrigger trigger="click" placement="right" overlay={customPopover('danger')}>
          <Button variant="danger">Danger Popover</Button>
        </OverlayTrigger>
        <OverlayTrigger trigger="click" placement="right" overlay={customPopover('info')}>
          <Button variant="info">Info Popover</Button>
        </OverlayTrigger>
        <OverlayTrigger trigger="click" placement="right" overlay={customPopover('dark')}>
          <Button variant="dark">Dark Popover</Button>
        </OverlayTrigger>
        <OverlayTrigger trigger="click" placement="right" overlay={customPopover('secondary')}>
          <Button variant="secondary">Secondary Popover</Button>
        </OverlayTrigger>
        <OverlayTrigger trigger="click" placement="right" overlay={customPopover('purple')}>
          <Button variant="purple">Purple Popover</Button>
        </OverlayTrigger>
      </div>
    </ComponentCard>
  )
}

const DismissOnPopover = () => {
  const dismissiblePopover = (
    <Popover>
      <PopoverHeader as="h3">Quick Tips</PopoverHeader>
      <PopoverBody>And here&apos;s some amazing content. It&apos;s very engaging. Right?</PopoverBody>
    </Popover>
  )
  return (
    <ComponentCard isCollapsible title="Dismiss on Next Click">
      <OverlayTrigger trigger="focus" placement="right" overlay={dismissiblePopover}>
        <Button
          variant="primary"
          tabIndex={0}
        >
          Show Tips
        </Button>
      </OverlayTrigger>
    </ComponentCard>
  )
}

const FourDirections = () => {
  const directions: PopoverDirection[] = [{ placement: 'top' }, { placement: 'bottom' }, { placement: 'right' }, { placement: 'left' }]
  return (
    <ComponentCard isCollapsible title="Four Directions">
      <div className="d-flex flex-wrap gap-2">
        {(directions || []).map((direction, idx) => (
          <OverlayTrigger
            trigger="click"
            key={idx}
            placement={direction.placement}
            overlay={
              <Popover id={`popover-positioned-${direction.placement}`}>
                <PopoverBody>This popover appears above the button. Great for tips or info.</PopoverBody>
              </Popover>
            }>
            <Button variant="primary">Popover on {direction.placement}</Button>
          </OverlayTrigger>
        ))}
      </div>
    </ComponentCard>
  )
}

const DisabledPopover = () => {
  const disabledPopover = (
    <Popover>
      <PopoverBody>This button is disabled, but the popover still works.</PopoverBody>
    </Popover>
  )
  return (
    <ComponentCard isCollapsible title="Disabled Elements">
      <OverlayTrigger placement="top" overlay={disabledPopover}>
        <span className="d-inline-block">
          <Button disabled style={{ pointerEvents: 'none' }}>
            Disabled Button
          </Button>
        </span>
      </OverlayTrigger>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Popovers" subtitle="UI" />
        <Row>
          <Col xl={6}>
            <SimplePopover />
            <HoverPopovers />
            <CustomPopovers />
          </Col>
          <Col xl={6}>
            <DismissOnPopover />
            <FourDirections />
            <DisabledPopover />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
