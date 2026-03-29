import PageBreadcrumb from '@/components/PageBreadcrumb'
import {Col, Container, Row} from 'react-bootstrap'
import ProposalsCard from './components/ProposalsCard.tsx'
import ProposalsTable from './components/ProposalsTable.tsx'

const Page = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Proposals' subtitle='CRM' />
            <Row>
                <Col xs={12}>
                    <ProposalsCard />
                    <ProposalsTable />
                </Col>
            </Row>
        </Container >
    )
}

export default Page