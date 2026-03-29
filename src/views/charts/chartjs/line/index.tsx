
import {Col, Container, Row} from 'react-bootstrap'
import CustomChartJs from '@/components/CustomChartJs.tsx'
import ComponentCard from '@/components/cards/ComponentCard'
import {
    getBasicLineChart,
    getInterpolationLineChart,
    getLineSegmentsChart,
    getMultiAxisLineChart,
    getPointStyleLineChart,
    getSteppedLineChart,
} from './data.ts'
import {Filler, LineController, LineElement, PointElement} from 'chart.js'
import PageBreadcrumb from "@/components/PageBreadcrumb";

const Index = () => {
    return (
        <Container fluid>
            <PageBreadcrumb title='Line Charts' subtitle='Charts'/>
            <Row>
                <Col xl={6}>
                    <ComponentCard title="Basic Line">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="line" getOptions={getBasicLineChart}
                                           plugins={[LineController, PointElement, LineElement, Filler]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Interpolation">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="line" getOptions={getInterpolationLineChart}
                                           plugins={[LineController, PointElement, LineElement]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Multi-Axes">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="line" getOptions={getMultiAxisLineChart} plugins={[LineController]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Point Styling">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="line" getOptions={getPointStyleLineChart} plugins={[LineController]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Line Segment">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="line" getOptions={getLineSegmentsChart} plugins={[LineController]}/>
                        </div>
                    </ComponentCard>
                </Col>

                <Col xl={6}>
                    <ComponentCard title="Stepped">
                        <div className="mt-3" >
                            <CustomChartJs height={300} type="line" getOptions={getSteppedLineChart} plugins={[LineController]}/>
                        </div>
                    </ComponentCard>
                </Col>
            </Row>
        </Container>
    )
}

export default Index
