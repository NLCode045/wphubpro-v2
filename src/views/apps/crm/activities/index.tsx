import PageBreadcrumb from '@/components/PageBreadcrumb'
import {Link} from "react-router";
import { Card, CardBody, Col, Container, Row } from 'react-bootstrap'
import { TbBriefcase, TbCalendarEvent, TbEdit, TbMail, TbMessage, TbPencil, TbPhoneCall, TbStar, TbUserCircle, TbUserPlus, TbX } from 'react-icons/tb'

const Index = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Activities' subtitle='CRM' />
            <Row className="justify-content-center">
                <Col xxl={9}>
                    <Card>
                        <CardBody>
                            <div className="timeline timeline-icon-bordered">
                                <div className="mb-3">
                                    <h6 className="text-muted fw-bold mb-3">01 Aug, 2025</h6>

                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">09:30 AM</div>
                                        <div className="timeline-dot">
                                            <TbUserPlus className="fs-xl text-success" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>New lead:</strong>
                                                <Link to="">John Carter</Link> added to the "Enterprise" pipeline by <span className="fw-semibold text-primary">Sarah Lee</span>.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-secondary">Follow Up</button>
                                                <button className="btn btn-sm btn-outline-info">Log Note</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-light border text-muted">Cold Lead</span>
                                                <small className="text-muted">01 Aug, 2025, 09:30 AM</small>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">10:15 AM</div>
                                        <div className="timeline-dot">
                                            <TbBriefcase className="fs-xl text-info" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Deal created:</strong>
                                                <Link to="">Q3 Licensing</Link> for John Carter added by <span className="fw-semibold text-primary">Sarah Lee</span> with value $15,000.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-primary">View Deal</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-info-subtle text-info">High Priority</span>
                                                <small className="text-muted">01 Aug, 2025, 10:15 AM</small>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">11:45 AM</div>
                                        <div className="timeline-dot">
                                            <TbPencil className="fs-xl text-muted" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Note added:</strong> Client requested a 15-day extension on proposal deadline. Logged by <span className="fw-semibold text-primary">Sarah Lee</span>.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-info">Edit Note</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-warning-subtle text-warning">Client Requested</span>
                                                <small className="text-muted">01 Aug, 2025, 11:45 AM</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="mb-3">
                                    <h6 className="text-muted fw-bold mb-3">31 Jul, 2025</h6>

                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">03:30 PM</div>
                                        <div className="timeline-dot">
                                            <TbPhoneCall className="fs-xl text-secondary" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Call completed:</strong> Follow-up call with <strong>Emily Watson</strong> to discuss contract renewal.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-success">Call Again</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-warning-subtle text-warning">Follow Up Needed</span>
                                                <small className="text-muted">31 Jul, 2025, 03:30 PM</small>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">01:00 PM</div>
                                        <div className="timeline-dot">
                                            <TbMail className="fs-xl text-danger" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Email:</strong> Welcome email with demo link sent to <span className="fw-semibold text-primary">Michael Barnes</span>.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-dark">Resend</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-light border text-muted">Automated</span>
                                                <small className="text-muted">31 Jul, 2025, 01:00 PM</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="mb-3">
                                    <h6 className="text-muted fw-bold mb-3">30 Jul, 2025</h6>


                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">02:45 PM</div>
                                        <div className="timeline-dot">
                                            <TbCalendarEvent className="fs-xl text-primary" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Demo scheduled:</strong> A demo was booked with <strong>Linda Rowe</strong> for 02 Aug at 4:00 PM. Invite sent with Google Meet link.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-success">Send Reminder</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-light border text-muted">Scheduled</span>
                                                <small className="text-muted">30 Jul, 2025, 02:45 PM</small>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">10:00 AM</div>
                                        <div className="timeline-dot">
                                            <TbUserCircle className="fs-xl text-secondary" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Lead reassigned:</strong> Lead <strong>Alice Monroe</strong> was reassigned from <em>James Parker</em> to <strong>Lisa Turner</strong> for better regional alignment.</p>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-light border text-muted">Internal</span>
                                                <small className="text-muted">30 Jul, 2025, 10:00 AM</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="mb-3">
                                    <h6 className="text-muted fw-bold mb-3">29 Jul, 2025</h6>


                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">05:30 PM</div>
                                        <div className="timeline-dot">
                                            <TbStar className="fs-xl text-success" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Lead converted:</strong> <strong>Jacob Wells</strong> converted into customer after final proposal approval. Contract sent for signing.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-primary">View Client</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-success-subtle text-success">Won</span>
                                                <small className="text-muted">29 Jul, 2025, 05:30 PM</small>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">11:15 AM</div>
                                        <div className="timeline-dot">
                                            <TbMessage className="fs-xl text-muted" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Note added:</strong> Added post-call notes for <strong>Emily Watson</strong>. Follow-up set for next week to review proposal edits.</p>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-light border text-muted">Internal Note</span>
                                                <small className="text-muted">29 Jul, 2025, 11:15 AM</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="mb-3">
                                    <h6 className="text-muted fw-bold mb-3">27 Jul, 2025</h6>


                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">03:00 PM</div>
                                        <div className="timeline-dot">
                                            <TbX className="fs-xl text-danger" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Deal lost:</strong> Deal <strong>IT Revamp - BetaSoft</strong> marked as lost due to pricing mismatch. Feedback recorded.</p>
                                            <div className="d-flex align-items-start gap-2 mt-2">
                                                <button className="btn btn-sm btn-outline-dark">Review Notes</button>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-danger-subtle text-danger">Lost</span>
                                                <small className="text-muted">27 Jul, 2025, 03:00 PM</small>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="timeline-item d-flex align-items-start">
                                        <div className="timeline-time pe-3 text-muted">09:20 AM</div>
                                        <div className="timeline-dot">
                                            <TbEdit className="fs-xl text-primary" />
                                        </div>
                                        <div className="timeline-content ps-3 pb-4">
                                            <p className="mb-1"><strong>Contact info updated:</strong> Phone and email updated for <strong>Jessica Tran</strong>. New contact details logged.</p>
                                            <div className="d-flex align-items-center gap-2 mt-2">
                                                <span className="badge bg-light border text-muted">Updated</span>
                                                <small className="text-muted">27 Jul, 2025, 09:20 AM</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div className="d-flex align-items-center justify-content-center gap-2 p-3">
                                <strong>Loading...</strong>
                                <div className="spinner-border spinner-border-sm text-danger" role="status"
                                    aria-hidden="true"></div>
                            </div>

                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default Index