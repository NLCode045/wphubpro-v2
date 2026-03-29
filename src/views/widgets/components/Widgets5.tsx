import type { Widget5Type } from '../types.ts'
import { Card, CardBody, ProgressBar } from 'react-bootstrap';

const Widgets5 = ({ item }: { item: Widget5Type }) => {
    const { color, icon: Icon, label, progressLabel, progressValue, value } = item;
    return (
        <Card>
            <CardBody>
                <div className="d-flex justify-content-between align-items-start">
                    <div className="avatar avatar-lg flex-shrink-0">
                        <span className={`avatar-title bg-${color}-subtle text-${color} rounded fs-24`}>
                            <Icon />
                        </span>
                    </div>
                    <div className="text-end">
                        <h4 className="mb-0">{value}</h4>
                        <p className="mb-0 text-muted">{label}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted fs-xs fw-semibold">{progressLabel}</span>
                        <span className="text-muted">{progressValue}%</span>
                    </div>
                    <ProgressBar now={progressValue} variant={color} style={{ height: 6 }} />
                </div>
            </CardBody>
        </Card>
    )
}

export default Widgets5