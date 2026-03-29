import type {Widget3Type} from '../types.ts'
import {TbInfoHexagonFilled, TbPointFilled} from 'react-icons/tb'
import {Card, CardBody} from 'react-bootstrap'

const Widgets3 = ({item}: { item: Widget3Type }) => {
    const {icon: Icon, color, label, color2, title, value, footerUnit, footerValue, prefix, unit} = item
    return (
        <Card>
            <CardBody>
                <div className="d-flex justify-content-between">
                    <h5 title="Number of Orders">{title}</h5>
                    <p className="mb-0 fs-lg"><TbInfoHexagonFilled className="text-muted"/></p>
                </div>
                <div className="d-flex align-items-center gap-2 my-3">
                    <div className="avatar-md flex-shrink-0">
                        <span className={`avatar-title text-bg-${color} bg-opacity-90 rounded-circle fs-22`}>
                            <Icon/>
                        </span>
                    </div>
                    <h3 className="mb-0">{prefix}{value}{unit}</h3>
                </div>
                <p className="mb-0">
                    <span className={`text-${color2}`}><TbPointFilled/></span>
                    <span className="text-nowrap text-muted">{label}</span>
                    <span className="float-end"><b>{prefix}{footerValue}{footerUnit}</b></span>
                </p>
            </CardBody>
        </Card>
    )
}

export default Widgets3