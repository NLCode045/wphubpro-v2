import { Container } from 'react-bootstrap'

import ProductsPage from '@/views/ecommerce/products-grid/components/ProductsPage'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Products Grid" subtitle="Ecommerce" />

      <ProductsPage />
    </Container>
  )
}

export default Index
