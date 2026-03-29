import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import NewEmail from './components/NewEmail.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Email" subtitle="Apps" />
      <div className="outlook-box email-app gap-1">
        <NewEmail />
      </div>
    </Container>
  )
}

export default Index
