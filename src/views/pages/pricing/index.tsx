import { pricingPlans, type PricingPlanType } from '@/views/pages/pricing/data'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import {Link} from "react-router";
import { Card, CardBody, CardFooter, Col, Container } from 'react-bootstrap'
import { TbCheck, TbX } from 'react-icons/tb'
import clsx from 'clsx'

const PricingCard = ({ plan }: { plan: PricingPlanType }) => {
  return (
    <Card className={`h-100 ${plan.isPopular && 'text-bg-primary'} my-4 my-lg-0`}>
      <CardBody className="p-lg-4 pb-0 text-center">
        <h3 className="fw-bold mb-1">{plan.title}</h3>
        <p className={clsx('mb-0', plan.isPopular ? 'text-white-50' : 'text-muted')}>{plan.description}</p>
        <div className="my-4">
          <h1 className="display-6 fw-bold mb-0">{plan.price}</h1>
          <small className={clsx('d-block fs-base', plan.isPopular ? 'text-white-50' : 'text-muted')}>{plan.billing}</small>
          <small className={clsx('d-block',plan.isPopular ? 'text-white-50' : 'text-muted')}>{plan.details}</small>
        </div>
        <ul className="list-unstyled text-start fs-sm mb-0">
          {plan.features.map((item, idx) => (
            <li className="mb-2" key={idx}>
              {item.available ? <TbCheck className="text-success me-2" /> : <TbX className="text-danger me-2" />} {item.text}
            </li>
          ))}
        </ul>
      </CardBody>
      <CardFooter className="bg-transparent px-5 pb-4">
        <Link to="" className={`btn btn-${plan.button.style} w-100 py-2 fw-semibold rounded-pill`}>
          {plan.button.text}
        </Link>
      </CardFooter>
    </Card>
  )
}

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Pricing" subtitle="Pages" />

      <div className="row mb-4">
        {
          pricingPlans.map((plan, idx) => (
            <Col xl={3} md={6} key={idx}>
              <PricingCard plan={plan} />
            </Col>
          ))
        }
      </div>

    </Container>
  )
}

export default Index
