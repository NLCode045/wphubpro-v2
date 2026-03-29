
import { Card, CardBody } from 'react-bootstrap'
import type { Widget6Type } from '../types.ts'
import { TbPhoneRinging } from 'react-icons/tb'

const Widgets6 = ({ item }: { item: Widget6Type }) => {
    const {color,image,name,role} = item;
    return (
        <Card>
            <CardBody className="d-flex align-items-center">
                <div className="me-3">
                    <img src={image} alt="User" className="rounded-circle avatar-xl" />
                </div>
                <div>
                    <h5 className="mb-1">{name}</h5>
                    <p className="text-muted fs-xs mb-0">{role}</p>
                </div>
                <button type="button" className={`btn btn-soft-${color} btn-icon ms-auto`}><TbPhoneRinging className="fs-lg" /></button>
            </CardBody>
        </Card>
    )
}

export default Widgets6