import {Link} from "react-router";
import { Badge, Button, Col, Row } from 'react-bootstrap'
import { TbStarFilled } from 'react-icons/tb'

import { orderDetails, productDetails } from '../data.ts'

const ProductDetails = () => {
  return (
    <>
      <div className="d-flex align-items-center justify-content-between">
        <Badge bg="success" className="bg-success-subtle text-success px-2 py-1 fs-base rounded-pill">
          In Stock
        </Badge>
        <div className="d-inline-flex align-items-center">
          {[...Array(5)].map((_, index) => (
            <TbStarFilled key={index} size={16} className="text-warning" />
          ))}
          <span className="ms-1">
            <Link to="/reviews" className="link-reset fw-medium">
              (859 Reviews)
            </Link>
          </span>
        </div>
      </div>

      <div className="mt-3 mb-4">
        <h4 className="fs-xl">Apple iMac 24” M3 Chip – 4.5K Retina Display</h4>
      </div>

      <Row className="mb-4">
        {productDetails.map((item, index) => (
          <Col key={index} md={4} xl={3}>
            <h6 className="mb-1 text-muted text-uppercase">{item.label}:</h6>
            <p className="fw-medium mb-0">
              {item.value} {item.smallText && <small className="text-muted">{item.smallText}</small>}
            </p>
          </Col>
        ))}
      </Row>

      <Row className="mb-4">
        {orderDetails.map((item, index) => (
          <Col key={index} md={4} xl={3}>
            <h6 className="mb-1 text-muted text-uppercase">{item.label}:</h6>
            <p className="fw-medium mb-0">{item.value}</p>
          </Col>
        ))}
      </Row>

      <h3 className="text-muted d-flex align-items-center gap-2 mb-4">
        <small className="text-decoration-line-through">$1499.00</small>
        <span className="fw-bold text-danger">$1299.00</span>
        <small>(13%)</small>
      </h3>

      <h5 className="text-uppercase text-muted fs-xs mb-2">Product Info:</h5>
      <p>
        The Apple iMac 24” with the M3 chip redefines performance and design. Featuring a stunning 4.5K Retina display, ultra-fast processing, and a sleek aluminum chassis in multiple colors, it’s perfect for creatives and professionals alike.
      </p>
      <p>
        Enjoy seamless performance with macOS, optimized apps, and powerful memory — all in an all-in-one setup that fits any workspace.
      </p>

      <h6 className="mt-3 fs-base">Details: </h6>
      <ul className="d-flex flex-column gap-1 mb-3">
        <li>24” 4.5K Retina Display with True Tone.</li>
        <li>Apple M3 chip with 8-core CPU and 10-core GPU.</li>
        <li>8GB unified memory (configurable to 24GB).</li>
        <li>512GB SSD storage (configurable up to 2TB).</li>
        <li>Color-matched Magic Keyboard and Mouse.</li>
      </ul>

      <Button variant="link" className="p-0 fw-semibold">
        Read More...
      </Button>
    </>
  )
}

export default ProductDetails
