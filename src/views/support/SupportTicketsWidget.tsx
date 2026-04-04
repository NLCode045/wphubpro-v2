import type { Ticket } from '@/types';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import CountUp from 'react-countup';
import { TbAlertTriangle, TbCheck, TbHourglass, TbTicket } from 'react-icons/tb';
import { ticketCounts } from '@/views/support/supportUi';

type Props = {
  tickets: Ticket[];
};

export function SupportTicketsWidget({ tickets }: Props) {
  const { openish, resolved, closed } = ticketCounts(tickets);
  const escalated = tickets.filter((t) => t.priority === 'urgent' && ['open', 'in_progress'].includes(t.status)).length;

  const cards = [
    {
      id: 1,
      title: 'Active tickets',
      value: openish,
      icon: <TbTicket />,
      bgColor: 'bg-primary-subtle',
      textColor: 'text-primary',
    },
    {
      id: 2,
      title: 'Resolved',
      value: resolved,
      icon: <TbCheck />,
      bgColor: 'bg-success-subtle',
      textColor: 'text-success',
    },
    {
      id: 3,
      title: 'Closed',
      value: closed,
      icon: <TbHourglass />,
      bgColor: 'bg-info-subtle',
      textColor: 'text-info',
    },
    {
      id: 4,
      title: 'Urgent (open)',
      value: escalated,
      icon: <TbAlertTriangle />,
      bgColor: 'bg-danger-subtle',
      textColor: 'text-danger',
    },
  ];

  return (
    <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 mb-3">
      {cards.map((ticket) => (
        <Col key={ticket.id}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div className="avatar fs-60 avatar-img-size flex-shrink-0">
                  <span className={`avatar-title ${ticket.bgColor} ${ticket.textColor} rounded-circle fs-24`}>
                    {ticket.icon}
                  </span>
                </div>
                <div className="text-end">
                  <h3 className="mb-2 fw-normal">
                    <CountUp end={ticket.value} duration={1} />
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
  );
}
