import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import EmailDetails from './components/EmailDetails.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Email" subtitle="Apps" />
      <div className="outlook-box email-app gap-1">
        <EmailDetails />
      </div>
    </Container>
  )
}

export default Index
