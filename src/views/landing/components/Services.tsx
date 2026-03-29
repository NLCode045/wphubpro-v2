import {Col, Container, Row} from 'react-bootstrap'
import {TbBrush, TbBulb, TbChartBar, TbReportAnalytics, TbSpeakerphone, TbWorld} from 'react-icons/tb'
import ServiceCard from './ServiceCard.tsx'

import type {ServiceType} from './types.ts'

const Services = () => {
  const services: ServiceType[] = [
    {
      name: "Strategic Consulting",
      description: "We help businesses define clear digital goals and create custom strategies that align with long-term success. From planning to execution.",
      icon: TbBulb,
    },
    {
      name: "SEO & Traffic Growth",
      description: "Boost your search visibility and drive organic traffic with our comprehensive SEO services — including keyword strategy, technical audits, etc.",
      icon: TbChartBar,
    },
    {
      name: "Social Media Management",
      description: "Elevate your brand's presence with targeted content, community engagement, and performance analytics across platforms like Instagram, Facebook, etc.",
      icon: TbSpeakerphone,
    },
    {
      name: "Custom Web Development",
      description: "We build modern, scalable websites and applications tailored to your business needs — optimized for speed, mobile responsiveness.",
      icon: TbWorld,
    },
    {
      name: "Brand Identity & Design",
      description: "From logos to full brand systems, we create memorable visual identities that express your values and connect with your target audience.",
      icon: TbBrush,
    },
    {
      name: "Analytics & Insights",
      description: "Turn data into decisions with real-time dashboards, performance reports, and analytics solutions that help you measure success.",
      icon: TbReportAnalytics,
    },
  ];

  return (
    <section className="section-custom pb-5" id="services">
      <Container className="container">
        <Row>
          <Col xs={12} className="text-center">
            <span className="text-muted rounded-3 d-inline-block">💼 Tailored Solutions for Every Need</span>
            <h2 className="mt-3 fw-bold mb-5">Explore Our Professional <span className="text-primary">Services</span> and Expertise</h2>
          </Col>
        </Row>
        <Row className="text-center">
          {services.map((service, idx) => (
            <Col key={idx} xl={4} md={6}>
              <ServiceCard service={service} />
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  )
}

export default Services
