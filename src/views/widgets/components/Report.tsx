import {Link} from "react-router";
import { Card, CardBody, Col, OverlayTrigger, ProgressBar, Row, Tooltip } from 'react-bootstrap'
import { TbDownload, TbLink } from 'react-icons/tb'
import { reportStats } from '../data.ts'

const Report = () => {
    return (
        <Row>
            <Col xs={12}>
                <Card>
                    <CardBody className="p-0">
                        <div className="p-3 bg-light-subtle border-bottom border-dashed">
                            <Row>
                                <Col>
                                    <h4 className="fs-sm mb-1">Would you like the full report?</h4>
                                    <small className="text-muted fs-xs mb-0">
                                        All 120 orders have been successfully delivered
                                    </small>
                                </Col>
                                <div className="col-auto align-self-center">
                                    <OverlayTrigger overlay={<Tooltip>Download</Tooltip>}>
                                    <button type="button" className="btn btn-sm btn-default rounded-circle btn-icon" >
                                        <TbDownload className="fs-xl" />
                                    </button>
                                    </OverlayTrigger>
                                </div>
                            </Row>
                        </div>
                        <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2 p-3">
                            {
                                reportStats.map((item, idx) => {
                                    const Icon = item.icon;
                                    return (
                                        <Col key={idx}>
                                            <Card className={`border shadow-none border-dashed mb-0 border-${item.bg} bg-${item.bg}`}>
                                                <CardBody>
                                                    <div className="mb-3 d-flex justify-content-between align-items-center">
                                                        <h5 className="fs-xl mb-0">{item.value}</h5>
                                                        <span className='d-flex justify-content-center align-items-center'>{item.percentage}%&nbsp;<Icon className={`text-${item.percentageColor}`} /></span>
                                                    </div>
                                                    <p className="text-muted mb-2"><span>{item.title}</span></p>
                                                    <ProgressBar now={item.percentage} variant={item.progressColor} className='progress-sm' />
                                                </CardBody>
                                            </Card>
                                        </Col>
                                    )
                                })
                            }
                        </Row>
                        <div className="text-center mb-3">
                            <Link to="" className="link-reset text-decoration-underline fw-semibold link-offset-3">
                                View all Reports <TbLink />
                            </Link>
                        </div>
                    </CardBody>
                </Card>
            </Col>
        </Row>
    )
}

export default Report