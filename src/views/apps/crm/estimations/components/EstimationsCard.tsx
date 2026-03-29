import React from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { TbArrowDown, TbArrowUp, TbClock, TbCurrencyDollar } from 'react-icons/tb'

type EstimationsCardProps = {
    value: string | React.ReactNode,
    change: string,
    icon: React.ReactNode,
    desc: string,
}

const EstimationsCard = () => {
    const cards: EstimationsCardProps[] = [
        {
            value: '52',
            change: '+15.7%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Total estimations created',
        },
        {
            value: '24',
            change: '+10.2%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Approved estimations',
        },
        {
            value: '8',
            change: '-3.9%',
            icon: <TbArrowDown className="text-danger" />,
            desc: 'Declined estimations',
        },
        {
            value: '$138,500',
            change: 'Top value',
            icon: <TbCurrencyDollar className="text-success" />,
            desc: 'Highest estimation value',
        },
        {
            value: (
                <>
                    2.8 <small className="fs-6">days</small>
                </>
            ),
            change: '+1.1%',
            icon: <TbClock className="text-warning" />,
            desc: 'Avg. review time',
        },
    ]

    return (
        <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2">
            {cards.map((card, index) => (
                <Col key={index}>
                    <Card className="mb-2">
                        <CardBody>
                            <div className="mb-3 d-flex justify-content-between align-items-center">
                                <h5 className="fs-xl mb-0">{card.value}</h5>
                                <span>
                                    {card.change} {card.icon}
                                </span>
                            </div>
                            <p className="text-muted mb-0">{card.desc}</p>
                        </CardBody>
                    </Card>
                </Col>
            ))}
        </Row>
    )
}

export default EstimationsCard
