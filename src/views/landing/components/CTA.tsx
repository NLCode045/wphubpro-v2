import ctaImg from '@/assets/images/landing-cta.jpg'
import { Button } from 'react-bootstrap'

const CTA = () => {
  return (
    <section>
      <div className="section-cta position-relative card-side-img overflow-hidden" style={{ backgroundImage: `url(${ctaImg})` }}>
        <div className="card-img-overlay d-flex align-items-center flex-column gap-3 justify-content-center auth-overlay text-center">
          <h3 className="text-white fs-24 mb-0 fw-bold">
            Power Your Project with Our Premium Admin Dashboard
          </h3>
          <p className="text-white text-opacity-75 fs-md">
            Launch faster with a sleek, responsive, and developer-focused admin panel. <br /> Get started today — free 14-day trial, no credit card required.
          </p>
          <Button variant='light' className="rounded-pill">Get Started Now</Button>
        </div>
      </div>
    </section>

  )
}

export default CTA
