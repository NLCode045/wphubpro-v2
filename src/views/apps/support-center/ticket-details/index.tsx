import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'
import TicketDetails from './components/TicketDetails.tsx'
import ChatCard from '@/components/cards/ChatCard'

const Index = () => {
    return (
        <>
            <Container fluid>
                <PageBreadcrumb title="Tickets Details" subtitle="Support" />
                <Row>
                    <TicketDetails />
                    <Col xl={4}>
                        <ChatCard />
                    </Col>
                </Row>
            </Container>
        </>
    )
}

export default Index