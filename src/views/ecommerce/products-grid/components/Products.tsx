
import {Link} from "react-router";
import { Badge, Button, Card, CardBody, CardFooter, CardTitle, Col, Row } from 'react-bootstrap'
import { TbBasket } from 'react-icons/tb'

import Rating from '@/components/Rating.tsx'
import { productsData } from '../data.ts'
import { currency } from '@/helpers'

const Products = () => {
  return (
    <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-2">
      {productsData.map((product) => (
        <Col className="col" key={product.id}>
          <Card className="h-100 mb-2">
            {product.discount &&
              <Badge
                bg={product.discount > 15 ? 'success' : 'danger'}
                className='badge-label fs-base rounded position-absolute top-0 start-0 m-3'>
                {currency}
                {product.discount} OFF
              </Badge>
            }
            <CardBody className="pb-0">
              <div className="p-3">
                <img height={333} width={333} src={product.image} alt={product.alt} className="img-fluid" />
              </div>
              <CardTitle className="fs-sm lh-base mb-2">
                <Link to="" className="link-reset">
                  {product.title}
                </Link>
              </CardTitle>
              <div>
                <span className="text-warning">
                  <Rating rating={product.rating} />
                </span>
                <span className="ms-1">
                  <Link to="/reviews" className="link-reset fw-semibold">
                    ({product.reviews})
                  </Link>
                </span>
              </div>
            </CardBody>

            <CardFooter className="bg-transparent d-flex justify-content-between">
              <div className="d-flex justify-content-start align-items-center gap-2">
                <h5 className="text-success d-flex align-items-center gap-2 mb-0">
                  <span className="text-muted text-decoration-line-through">{product.originalPrice}</span> {product.discountedPrice}
                </h5>
              </div>
              <Button size="sm" variant="primary" className="btn-icon" href="#!">
                <TbBasket className="fs-lg" />
              </Button>
            </CardFooter>
          </Card>
        </Col>
      ))}
    </Row>
  )
}

export default Products
