import { Col, Container, Row } from 'react-bootstrap'
import EstimationsCard from './components/EstimationsCard.tsx'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EstimationsTable from './components/EstimationsTable.tsx'

const Index = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Estimations' subtitle='CRM' />
            <Row>
                <Col xs={12}>
                    <EstimationsCard />
                    <EstimationsTable />
                </Col>
            </Row>
        </Container >
    )
}

export default Index