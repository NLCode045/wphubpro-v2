import { Button, Card, CardBody, CardFooter, Col, Container, Row } from 'react-bootstrap';
import { TbCheck, TbX } from 'react-icons/tb';
import type { PricingPlanType } from './types.ts';

const PricingPlans = () => {
  const pricingPlans: PricingPlanType[] = [
    {
      name: "Starter Plan",
      description: "Best for freelancers and personal use",
      price: 9,
      projects: "1 project included",
      features: [
        { text: "1 active project", included: true },
        { text: "Access to all components", included: true },
        { text: "Email support", included: true },
        { text: "No team collaboration", included: false },
        { text: "No SaaS rights", included: false }
      ],
      buttonText: "Choose Starter",
      buttonVariant: "btn-outline-primary"
    },
    {
      name: "Professional",
      description: "Ideal for small teams and startups",
      price: 29,
      projects: "Up to 5 projects",
      features: [
        { text: "5 active projects", included: true },
        { text: "Component + plugin access", included: true },
        { text: "Team collaboration", included: true },
        { text: "Priority email support", included: true },
        { text: "No resale rights", included: false }
      ],
      buttonText: "Choose Professional",
      buttonVariant: "btn-light",
      isPopular: true
    },
    {
      name: "Business",
      description: "For agencies and large teams",
      price: 79,
      projects: "Unlimited projects",
      features: [
        { text: "Unlimited projects", included: true },
        { text: "SaaS & client projects allowed", included: true },
        { text: "All premium components", included: true },
        { text: "Priority support", included: true },
        { text: "Team management tools", included: true }
      ],
      buttonText: "Choose Business",
      buttonVariant: "btn-dark"
    }
  ];
  return (
    <section className="section-custom" id="plans">
      <Container>
        <Row>
          <Col xs={12} className="text-center">
            <span className="text-muted rounded-3 d-inline-block">💰 Simple &amp; Transparent Plans</span>
            <h2 className="mt-3 fw-bold mb-5">Choose the <span className="text-primary">Pricing</span> Plan That Fits Your Needs</h2>
          </Col>
        </Row>
        <Row className="justify-content-center">
          <Col xxl={11}>
            <Row>
              {
                pricingPlans.map((item, idx) => (
                  <Col lg={4} key={idx}>
                    <Card className={`  ${item.isPopular ? 'text-bg-primary' : 'bg-light border bg-opacity-40 border-dashed shadow-none'}  h-100 my-4 my-lg-0`}>
                      <CardBody className="p-lg-4 pb-0 text-center">
                        <h3 className="fw-bold mb-1">{item.name}</h3>
                        <p className="text-muted mb-0">{item.description}</p>
                        <div className="my-4">
                          <h1 className="display-6 fw-bold mb-0">${item.price}</h1>
                          <small className="d-block text-muted fs-base">Billed monthly</small>
                          <small className="d-block text-muted">{item.projects}</small>
                        </div>
                        <ul className="list-unstyled text-start fs-sm mb-0">
                          {
                            item.features.map((feature, idx) => (
                              <li className="mb-2" key={idx}>{feature.included ? <TbCheck className="text-success me-2" /> : <TbX className="text-danger me-2" />}  {feature.text}</li>
                            ))
                          }
                        </ul>
                      </CardBody>
                      <CardFooter className="bg-transparent px-5 pb-4">
                        <Button className={`w-100 py-2 fw-semibold rounded-pill ${item.buttonVariant}`}>{item.buttonText}</Button>
                      </CardFooter>
                    </Card>
                  </Col>
                ))
              }
            </Row>
          </Col>
        </Row>
      </Container>
    </section>

  )
}

export default PricingPlans
