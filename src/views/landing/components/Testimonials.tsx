import { Col, Container, Row } from 'react-bootstrap'
import TestimonialCard from './TestimonialCard.tsx'
import type { TestimonialType } from './types.ts'

import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'

import client1 from '@/assets/images/clients/01.svg'
import client2 from '@/assets/images/clients/02.svg'
import client3 from '@/assets/images/clients/03.svg'
import client4 from '@/assets/images/clients/04.svg'
import client5 from '@/assets/images/clients/05.svg'
import client6 from '@/assets/images/clients/06.svg'
import client7 from '@/assets/images/clients/07.svg'
import {Link} from "react-router";

const Testimonials = () => {
  const testimonials: TestimonialType[] = [
    {
      avatar: user1,
      title: 'Fantastic experience!',
      description: 'The admin dashboard is intuitive, fast, and packed with useful features. Highly recommend it!',
    },
    {
      avatar: user2,
      title: 'Excellent quality & support',
      description: 'The template’s quality is top-notch and the support team is quick to help. A truly seamless experience!',
    },
    {
      avatar: user3,
      title: 'Outstanding experience',
      description: 'Everything from setup to customization was smooth and easy. The support team went above and beyond!',
    },
  ]

  const clients = [client1, client2, client3, client4, client5, client6, client7]
  return (
    <section className="section-custom position-relative overflow-hidden" id="reviews">
      <Container className="position-relative">
        <Row>
          <Col xs={12} className="text-center">
            <span className="text-muted rounded-3 d-inline-block">💬 Honest &amp; Verified Feedback</span>
            <h2 className="mt-3 fw-bold mb-5">Read Our <span className="text-primary">Admin Reviews</span> and Ratings</h2>
          </Col>
        </Row>
        <Row className="justify-content-center">
          {
            testimonials.map((testimonial, idx) => (
              <Col lg={4} key={idx}>
                <TestimonialCard testimonial={testimonial} />
              </Col>
            ))
          }
        </Row>
        <Row className="justify-content-center mt-5">
          <Col xxl={9}>
            <div className="d-flex justify-content-center align-items-center flex-wrap gap-5 mt-4">
              {
                clients.map((logo, idx) => (
                  <div key={idx}>
                    <Link to="" className="d-block">
                      <img src={logo} alt="logo" height={42} />
                    </Link>
                  </div>
                ))
              }
            </div>
          </Col>
        </Row>
      </Container>
    </section>

  )
}

export default Testimonials
