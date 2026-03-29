import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import {BreadcrumbItem, Col, Container, Row} from 'react-bootstrap'
import {TbChevronRight, TbSmartHome} from 'react-icons/tb'

const Basic = () => {
  return (
    <ComponentCard isCollapsible title="Basic">
      <ol className="breadcrumb mb-0 py-2">
        <BreadcrumbItem active aria-current="page">
          Home
        </BreadcrumbItem>
      </ol>
      <ol className="breadcrumb mb-0 py-2">
        <BreadcrumbItem className="m-0">Home</BreadcrumbItem>
        <div className="mx-1" style={{ height: 24 }}>
          <TbChevronRight height={16} width={16} />
        </div>
        <BreadcrumbItem active aria-current="page">
          Library
        </BreadcrumbItem>
      </ol>
      <ol className="breadcrumb mb-0 py-2">
        <BreadcrumbItem className="m-0">Home</BreadcrumbItem>
        <div className="mx-1" style={{ height: 24 }}>
          <TbChevronRight height={16} width={16} />
        </div>
        <BreadcrumbItem className="m-0">Library</BreadcrumbItem>
        <div className="mx-1" style={{ height: 24 }}>
          <TbChevronRight height={16} width={16} />
        </div>
        <BreadcrumbItem active aria-current="page">
          Data
        </BreadcrumbItem>
      </ol>
    </ComponentCard>
  )
}

const WithIcons = () => {
  return (
    <ComponentCard isCollapsible title="Basic">
      <ol className="bg-light breadcrumb  bg-opacity-50 p-2 mb-2">
        <BreadcrumbItem active aria-current="page">
          <TbSmartHome className="fs-16 me-1" />
          Home
        </BreadcrumbItem>
      </ol>
      <ol className="bg-light breadcrumb  bg-opacity-50 p-2 mb-2">
        <BreadcrumbItem>
          <TbSmartHome className="fs-16 me-1" />
          Home
        </BreadcrumbItem>
        <div className="mx-1" style={{ height: 20 }}>
          <TbChevronRight height={16} width={16} />
        </div>
        <BreadcrumbItem active aria-current="page">
          Library
        </BreadcrumbItem>
      </ol>
      <ol className="bg-light breadcrumb  bg-opacity-50 p-2 mb-0">
        <BreadcrumbItem>
          <TbSmartHome className="fs-16 me-1" />
          Home
        </BreadcrumbItem>
        <div className="mx-1" style={{ height: 20 }}>
          <TbChevronRight height={16} width={16} />
        </div>
        <BreadcrumbItem>Library</BreadcrumbItem>
        <div className="mx-1" style={{ height: 20 }}>
          <TbChevronRight height={16} width={16} />
        </div>
        <BreadcrumbItem active aria-current="page">
          Data
        </BreadcrumbItem>
        <div className="mx-1" style={{ height: 20 }}>
          <TbChevronRight height={16} width={16} />
        </div>
      </ol>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Breadcrumb" subtitle="UI" />
        <Row>
          <Col xl={6}>
            <Basic />
          </Col>
          <Col xl={6}>
            <WithIcons />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
