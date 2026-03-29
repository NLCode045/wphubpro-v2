import React from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { TbArrowDown, TbArrowUp, TbClock, TbCurrencyDollar } from 'react-icons/tb'

type CampaignCardProps = {
    value: string | React.ReactNode,
    change: string,
    icon: React.ReactNode,
    desc: string,
}

const CampaignCard = () => {
    const cards: CampaignCardProps[] = [
        {
            value: '11',
            change: '+22.2%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Total campaigns launched',
        },
        {
            value: '4',
            change: '+36.3%',
            icon: <TbArrowUp className="text-success" />,
            desc: 'Successful campaigns',
        },
        {
            value: '2',
            change: '-18.1%',
            icon: <TbArrowDown className="text-danger" />,
            desc: 'Failed campaigns',
        },
        {
            value: '$85,000',
            change: 'Top value',
            icon: <TbCurrencyDollar className="text-success" />,
            desc: 'Highest campaign budget',
        },
        {
            value: (
                <>
                    5,7 <small className="fs-6">days</small>
                </>
            ),
            change: '+1.4%',
            icon: <TbClock className="text-warning" />,
            desc: 'Avg. campaign duration',
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

export default CampaignCard
