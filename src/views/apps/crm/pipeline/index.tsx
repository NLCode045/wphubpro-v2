import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import PipelinePage from '@/views/apps/crm/pipeline/components/PipelinePage'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Pipeline" subtitle="CRM" />

      <PipelinePage />
    </Container>
  )
}

export default Index
