import type { Widget1Type } from '../types.ts'
import { Card, CardBody } from 'react-bootstrap'
import CountUp from "react-countup";

const Widgets1 = ({ item }: { item: Widget1Type }) => {
    const { color, icon: Icon, label ,count} = item
    return (
        <Card>
            <CardBody>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="avatar fs-60 avatar-img-size flex-shrink-0">
                        <span className={`avatar-title bg-${color}-subtle text-${color} rounded-circle fs-24`}>
                            <Icon />
                        </span>
                    </div>
                    <div className="text-end">
                        <h3 className="mb-2 fw-normal">  <CountUp prefix={count.prefix} suffix={count.suffix} end={count.value} duration={1} enableScrollSpy scrollSpyOnce /></h3>
                        <p className="mb-0 text-muted"><span>{label}</span></p>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}

export default Widgets1