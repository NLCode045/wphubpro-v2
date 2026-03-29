import { Container } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import TableWithCheckboxSelect from './components/TableWithCheckboxSelect.tsx'
import TableWithDeleteButtons from './components/TableWithDeleteButtons.tsx'
import TableWithFilters from './components/TableWithFilters.tsx'
import TableWithPagination from './components/TableWithPagination.tsx'
import TableWithPaginationInfo from './components/TableWithPaginationInfo.tsx'
import TableWithRangeFilters from './components/TableWithRangeFilters.tsx'
import TableWithSearch from './components/TableWithSearch.tsx'
import TableWithSort from './components/TableWithSort.tsx'

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Custom Tables" subtitle="Tables" />

        <TableWithSearch />

        <TableWithCheckboxSelect />

        <TableWithDeleteButtons />

        <TableWithPagination />

        <TableWithPaginationInfo />

        <TableWithFilters />

        <TableWithRangeFilters />

        <TableWithSort />
      </Container>
    </>
  )
}

export default Index
