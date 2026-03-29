import ComponentCard from '@/components/cards/ComponentCard'
import {Link} from "react-router";
import {Col, ProgressBar, Row, Table} from 'react-bootstrap'
import {TbCaretRightFilled, TbLink} from 'react-icons/tb'
import CountUp from "react-countup";

const TrafficSources = () => {
    return (
        <ComponentCard isCollapsible title="Traffic Sources" isCloseable isRefreshable >
            <Row className="mb-2">
                <Col lg>
                    <h3 className="mb-2 fw-bold"> <CountUp end={8975} duration={1} enableScrollSpy scrollSpyOnce /></h3>
                    <p className="mb-2 fw-semibold text-muted">Right Now</p>
                </Col>
                <Col lg={'auto'} className="align-self-center">
                    <ul className="list-unstyled mb-0 lh-lg">
                        <li>
                            <TbCaretRightFilled className="fs-lg align-middle text-primary" /> &nbsp;
                            <span className="text-muted">Organic</span>
                        </li>
                        <li>
                            <TbCaretRightFilled className="fs-lg align-middle text-success" /> &nbsp;
                            <span className="text-muted">Direct</span>
                        </li>
                        <li>
                            <TbCaretRightFilled className="fs-lg align-middle" /> &nbsp;
                            <span className="text-muted">Campaign</span>
                        </li>
                    </ul>
                </Col>
            </Row>
            <ProgressBar style={{ height: 10 }} className='mb-3'>
                <ProgressBar now={25} key={1} />
                <ProgressBar variant="success" now={50} key={2} />
                <ProgressBar variant="info" now={15} key={3} />
            </ProgressBar>
            <div className="table-responsive">
                <Table className="table-sm table-custom table-nowrap table-hover table-centered mb-0">
                    <thead className="bg-light align-middle bg-opacity-25 thead-sm">
                        <tr className="text-uppercase fs-xxs">
                            <th className="text-muted">URL</th>
                            <th className="text-muted text-end">Views</th>
                            <th className="text-muted text-end">Uniques</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="text-decoration-underline">/dashboard</td>
                            <td className="text-end">9.8k</td>
                            <td className="text-end">8.5k</td>
                        </tr>
                        <tr>
                            <td className="text-decoration-underline">/ecommerce-index</td>
                            <td className="text-end">8.2k</td>
                            <td className="text-end">7.1k</td>
                        </tr>
                        <tr>
                            <td className="text-decoration-underline">/apps/projects-overview</td>
                            <td className="text-end">7.6k</td>
                            <td className="text-end">6.2k</td>
                        </tr>
                        <tr>
                            <td className="text-decoration-underline">/pages/contact</td>
                            <td className="text-end">5.9k</td>
                            <td className="text-end">4.8k</td>
                        </tr>
                        <tr>
                            <td className="text-decoration-underline">/support/faq</td>
                            <td className="text-end">5.2k</td>
                            <td className="text-end">4.3k</td>
                        </tr>
                    </tbody>
                </Table>
            </div>
            <div className="text-center mt-3">
                <Link to="/chat" className="link-reset text-decoration-underline fw-semibold link-offset-3">
                    View all Links <TbLink />
                </Link>
            </div>
        </ComponentCard>
    )
}

export default TrafficSources