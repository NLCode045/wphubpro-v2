import user4 from "@/assets/images/users/user-4.jpg"
import user5 from "@/assets/images/users/user-5.jpg"

import { Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap'
import {Link} from "react-router";
import { TbArrowLeft, TbPencil, TbX } from 'react-icons/tb'

const TicketDetails = () => {
    return (
        <Col xxl={8}>
            <Card>
                <CardHeader className="justify-content-between">
                    <h5 className="mb-0">#SUP-2523 - <span className="text-muted">App freezes when uploading files</span></h5>
                    <span className="badge badge-label text-bg-warning">Pending</span>
                </CardHeader>

                <CardBody>
                    <Row className="mb-4">
                        <Col md={4}>
                            <h6 className="text-uppercase text-muted">Requested By</h6>
                            <div className="d-flex align-items-center gap-2">
                                <img src={user5} alt="Ava Sullivan" className="rounded-circle avatar-sm" />
                                <span>Ava Sullivan</span>
                            </div>
                        </Col>
                        <Col md={4}>
                            <h6 className="text-uppercase text-muted">Assigned Agent</h6>
                            <div className="d-flex align-items-center gap-2">
                                <img src={user4} alt="Liam Brooks" className="rounded-circle avatar-sm" />
                                <span>Liam Brooks</span>
                            </div>
                        </Col>
                    </Row>


                    <Row className="mb-4">
                        <Col md={4}>
                            <h6 className="text-uppercase text-muted">Priority</h6>
                            <span className="badge bg-danger">High</span>
                        </Col>
                        <Col md={4}>
                            <h6 className="text-uppercase text-muted">Created On</h6>
                            <p className="mb-0">05 Aug, 2025 <small className="text-muted">1:20 PM</small></p>
                        </Col>
                        <Col md={4}>
                            <h6 className="text-uppercase text-muted">Due Date</h6>
                            <p className="mb-0">09 Aug, 2025</p>
                        </Col>
                    </Row>


                    <div className="mb-4">
                        <h6 className="text-uppercase text-muted">Description</h6>
                        <p className="mb-0">
                            When trying to upload files through the project form, the application becomes unresponsive after selecting a file larger than 5MB.
                            This issue occurs consistently across browsers. Please investigate and apply a fix.
                        </p>
                    </div>

                    <div className="mb-4">
                        <h6 className="text-uppercase text-muted">Tags</h6>
                        <span className="badge text-bg-light me-1">Upload</span>
                        <span className="badge text-bg-light me-1">Performance</span>
                        <span className="badge text-bg-light">UI Bug</span>
                    </div>

                    <div className="mb-4">
                        <h6 className="text-uppercase text-muted mb-4">Activity:</h6>
                        <div className="timeline">
                            <div className="timeline-item d-flex align-items-stretch">
                                <div className="timeline-time pe-3 text-muted">Just Now</div>
                                <div className="timeline-dot bg-success"></div>
                                <div className="timeline-content ps-3 pb-4">
                                    <h6 className="mb-1 fs-sm">Ticket Resolved</h6>
                                    <p className="mb-1 text-muted">Agent closed the ticket after applying a patch for the file upload freeze issue.</p>
                                    <span className="text-primary fw-semibold">By Liam Brooks</span>
                                </div>
                            </div>
                            <div className="timeline-item d-flex align-items-stretch">
                                <div className="timeline-time pe-3 text-muted">Today, 10:40 AM</div>
                                <div className="timeline-dot bg-info"></div>
                                <div className="timeline-content ps-3 pb-4">
                                    <h6 className="mb-1 fs-sm">Status Changed to "In Progress"</h6>
                                    <p className="mb-1 text-muted">Ticket was picked up by the assigned agent for investigation.</p>
                                    <span className="text-primary fw-semibold">By Liam Brooks</span>
                                </div>
                            </div>


                            <div className="timeline-item d-flex align-items-stretch">
                                <div className="timeline-time pe-3 text-muted">Yesterday, 4:15 PM</div>
                                <div className="timeline-dot bg-warning"></div>
                                <div className="timeline-content ps-3 pb-4">
                                    <h6 className="mb-1 fs-sm">User Comment Added</h6>
                                    <p className="mb-1 text-muted">User emphasized urgency due to impact on production file uploads.</p>
                                    <span className="text-primary fw-semibold">By Ava Sullivan</span>
                                </div>
                            </div>


                            <div className="timeline-item d-flex align-items-stretch">
                                <div className="timeline-time pe-3 text-muted">02 Aug, 2025 - 3:00 PM</div>
                                <div className="timeline-dot bg-danger"></div>
                                <div className="timeline-content ps-3 pb-4">
                                    <h6 className="mb-1 fs-sm">Ticket Created</h6>
                                    <p className="mb-1 text-muted">Ticket submitted regarding the app freezing on file upload.</p>
                                    <span className="text-primary fw-semibold">By Ava Sullivan</span>
                                </div>
                            </div>

                        </div>

                    </div>


                    <div className="d-flex gap-2 justify-content-center">
                        <Link to="/ticket-create" className="btn btn-primary"><TbPencil className="me-1" />Edit Ticket</Link>
                        <Link to="" className="btn btn-danger"><TbX className="me-1" />Close Ticket</Link>
                        <Link to="/tickets-list" className="btn btn-outline-secondary"><TbArrowLeft className="me-1" />Back to List</Link>
                    </div>
                </CardBody>
            </Card>
        </Col>
    )
}

export default TicketDetails