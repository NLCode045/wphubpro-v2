import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Container } from 'react-bootstrap'
import ApiKeyTabel from './components/ApiKeyTabel.tsx'

const Index = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title="API Keys" subtitle="Apps" />
            <ApiKeyTabel />
        </Container>
    )
}

export default Index