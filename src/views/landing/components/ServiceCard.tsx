import {Link} from "react-router";
import {Card, CardBody} from 'react-bootstrap'
import {TbArrowRight} from 'react-icons/tb'
import type {ServiceType} from './types.ts'

const ServiceCard = ({ service }: { service: ServiceType }) => {
  const { description, icon: Icon, name } = service
  return (
    <Card className="border-0 shadow-none p-2 card-h-100">
      <CardBody className="pb-0">
        <div className="avatar-xl mx-auto mb-3">
          <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
            <Icon />
          </span>
        </div>
        <h4 className="mb-2">{name}</h4>
        <p className="text-muted mb-3">
          {description}
        </p>
      </CardBody>
      <div className="card-footer border-0 pt-0">
        <Link className="link-primary fw-semibold" to="">Know more<TbArrowRight className=" ms-2 align-middle" /></Link>
      </div>
    </Card>
  )
}

export default ServiceCard
