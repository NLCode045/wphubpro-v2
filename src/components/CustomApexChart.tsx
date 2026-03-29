
import Loader from '@/components/Loader.tsx'
import { useLayoutContext } from '@/context/useLayoutContext.tsx'
import type{ ApexOptions } from 'apexcharts'
import { Suspense, useMemo } from 'react'

import  ReactApexChart from 'react-apexcharts'

type PropsType = {
  type?: ApexChart['type']
  height?: number | string
  width?: number | string
  getOptions: () => ApexOptions
  series?: ApexOptions['series']
  className?: string
}

const CustomApexChart = ({ type, height, width = '100%', getOptions, series, className }: PropsType) => {
  const { skin, theme } = useLayoutContext()

  const options = useMemo(() => getOptions(), [skin, theme])

  return (
    <Suspense fallback={<Loader />}>
      <ReactApexChart type={type ?? options.chart?.type} height={height ?? options.chart?.height} width={width ?? options.chart?.width} options={options} series={options.series ?? series} className={className} />
    </Suspense>
  )
}

export default CustomApexChart
