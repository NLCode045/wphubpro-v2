
import { getSellerChartOptions } from '@/views/ecommerce/sellers/[sellerId]/data'
import CustomApexChart from '@/components/CustomApexChart.tsx'
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'

const SellerOverview = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle as={'h4'}>Seller Overview</CardTitle>
      </CardHeader>
      <CardBody>
        <CustomApexChart getOptions={getSellerChartOptions} series={getSellerChartOptions().series} type="bar" height={370} />
      </CardBody>
    </Card>
  )
}

export default SellerOverview
