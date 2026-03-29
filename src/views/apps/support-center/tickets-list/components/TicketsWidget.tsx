
import React from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import CountUp from 'react-countup'
import { TbAlertTriangle, TbCheck, TbHourglass, TbTicket } from 'react-icons/tb'


type TicketCard = {
    id: number
    title: string
    value: number
    icon: React.ReactNode
    bgColor: string
    textColor: string
}
const TicketsWidget = () => {
    const ticketsData: TicketCard[] = [
        {
            id: 1,
            title: "Open Tickets",
            value: 148,
            icon: < TbTicket />,
            bgColor: "bg-primary-subtle",
            textColor: "text-primary"
        },
        {
            id: 2,
            title: "Resolved Tickets",
            value: 1289,
            icon: <TbCheck />,
            bgColor: "bg-success-subtle",
            textColor: "text-success"
        },
        {
            id: 3,
            title: "Pending Tickets",
            value: 93,
            icon: <TbHourglass />,
            bgColor: "bg-info-subtle",
            textColor: "text-info"
        },
        {
            id: 4,
            title: "Escalated Tickets",
            value: 25,
            icon: <TbAlertTriangle />,
            bgColor: "bg-danger-subtle",
            textColor: "text-danger"
        }
    ]

    return (
        <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
            {ticketsData.map((ticket) => (
                <Col key={ticket.id}>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="avatar fs-60 avatar-img-size flex-shrink-0">
                                    <span
                                        className={`avatar-title ${ticket.bgColor} ${ticket.textColor} rounded-circle fs-24`}
                                    >
                                        {ticket.icon}
                                    </span>
                                </div>
                                <div className="text-end">

                                    <h3 className="mb-2 fw-normal">
                                        <CountUp end={ticket.value} duration={2} />
                                    </h3>
                                    <p className="mb-0 text-muted">
                                        <span>{ticket.title}</span>
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            ))}
        </Row>
    )
}

export default TicketsWidget