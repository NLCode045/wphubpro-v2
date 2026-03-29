import { Container } from 'react-bootstrap'

import ProductsListing from '@/views/ecommerce/products/components/ProductsListing'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Products" subtitle="Ecommerce" />
      <ProductsListing />
    </Container>
  )
}

export default Index
