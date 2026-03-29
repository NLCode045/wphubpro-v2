
import {Col, Container, Row} from 'react-bootstrap'
import CustomChartJs from '@/components/CustomChartJs.tsx'
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from "@/components/PageBreadcrumb"
import {
    ArcElement,
    BarController,
    BarElement,
    BubbleController,
    DoughnutController, Filler,
    LineController,
    LineElement,
    PieController,
    PointElement,
    PolarAreaController, RadarController,
    RadialLinearScale,
    ScatterController,
} from 'chart.js'
import {
    getBubbleChart,
    getComboBarLineChart,
    getDoughnutChart,
    getMultiPieChart,
    getPieChart,
    getPolarAreaChart, getRadarChart,
    getScatterChart,
    getStackedBarLineChart,
} from './data.ts'

const Index = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Other Charts' subtitle='Charts'/>

            <Row>
                <Col xl={6}>
                    <ComponentCard title="Bubble">
                        <div className="mt-3">
                            <CustomChartJs height={300} type="bubble" getOptions={getBubbleChart}
                                           plugins={[BubbleController, PointElement]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Combo Bar & Line">
                        <div className="mt-3" >
                            <CustomChartJs
                              height={300}
                                type="bar"
                                getOptions={getComboBarLineChart}
                                plugins={[BarController, LineController, PointElement, LineElement, BarElement]}
                            />
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Stacked Bar & Line">
                        <div className="mt-3" >
                            <CustomChartJs
                              height={300}
                                type="bar"
                                getOptions={getStackedBarLineChart}
                                plugins={[BarController, LineController, PointElement, LineElement, BarElement]}
                            />
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Doughnut">
                        <div className="mt-3" >
                            <CustomChartJs type="doughnut" getOptions={getDoughnutChart} height={300}
                                           plugins={[DoughnutController, PointElement, ArcElement]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Pie">
                        <div className="mt-3" >
                            <CustomChartJs type="pie" getOptions={getPieChart} height={300}
                                           plugins={[PieController, PointElement, ArcElement]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Multi Series Pie">
                        <div className="mt-3" >
                            <CustomChartJs type="pie" getOptions={getMultiPieChart} height={300}
                                           plugins={[PieController, PointElement, ArcElement]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Polar Area">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="polarArea" getOptions={getPolarAreaChart}
                                           plugins={[PolarAreaController, RadialLinearScale, ArcElement]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Radar">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="radar" getOptions={getRadarChart} plugins={[RadarController, Filler]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Scatter">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="scatter" getOptions={getScatterChart}
                                           plugins={[ScatterController, PointElement]}/>
                        </div>
                    </ComponentCard>
                </Col>
            </Row>
        </Container>
    )
}

export default Index
