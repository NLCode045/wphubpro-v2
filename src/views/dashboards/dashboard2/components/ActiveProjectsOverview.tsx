
import {Link} from "react-router";
import { Col, ProgressBar, Row, Table } from 'react-bootstrap'
import { TbCaretRightFilled, TbLink } from 'react-icons/tb'

import ComponentCard from '@/components/cards/ComponentCard.tsx'
import CountUp from "react-countup";

type ProjectSource = {
  url: string
  totalTask: number
  completedTask: number
  deadlineDate: string
}

const projects: ProjectSource[] = [
  { url: 'E-Commerce Redesign',  totalTask: 60, completedTask: 45, deadlineDate: '15 Aug 2025' },
  { url: 'Mobile Banking App',  totalTask: 40, completedTask: 28, deadlineDate: '20 Sep 2025' },
  { url: 'Corporate Website',  totalTask: 25, completedTask: 18, deadlineDate: '05 Aug 2025' },
  { url: 'POS System Upgrade',  totalTask: 50, completedTask: 32, deadlineDate: '01 Oct 2025' },
  { url: 'Inventory Management Tool',  totalTask: 20, completedTask: 12, deadlineDate: '12 Aug 2025' },
]

const ActiveProjectsOverview = () => {
  return (
    <ComponentCard title="Active Projects Overview" isCloseable isCollapsible isRefreshable>
      <Row className="mb-2">
        <Col lg>
          <h3 className="mb-2 fw-bold" id="live-visitors">
            <CountUp end={4852} />
          </h3>
          <p className="mb-2 fw-semibold text-muted">Projects in Progress</p>
        </Col>
        <Col lg="auto" className="align-self-center">
          <ul className="list-unstyled mb-0 lh-lg">
            <li>
              <TbCaretRightFilled className="align-middle text-primary me-1" />
              <span className="text-muted">Web Development</span>
            </li>
            <li>
              <TbCaretRightFilled className="align-middle text-success me-1" />
              <span className="text-muted"> Mobile Apps</span>
            </li>
            <li>
              <TbCaretRightFilled className="align-middle me-1" />
              <span className="text-muted"> UI/UX Design</span>
            </li>
          </ul>
        </Col>
      </Row>

      <ProgressBar style={{ height: 10 }} className="mb-3">
        <ProgressBar now={25} key={1} />
        <ProgressBar variant="success" now={50} key={2} />

        <ProgressBar variant="info" now={25} key={3} />
      </ProgressBar>

      <div className="table-responsive">
        <Table size="sm" className="table-custom table-nowrap table-hover table-centered mb-0">
          <thead className="bg-light align-middle bg-opacity-25 thead-sm">
            <tr className="text-uppercase fs-xxs">
              <th className="text-muted">Project</th>
              <th className="text-muted text-end">Tasks Completed</th>
              <th className="text-muted text-end">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((source, index) => (
              <tr key={index}>
                <td className="text-decoration-underline">{source.url}</td>
                <td className="text-end">{source.completedTask}/{source.totalTask}</td>
                <td className="text-end">{source.deadlineDate}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="text-center mt-3">
        <Link to="/chat" className="link-reset text-decoration-underline fw-semibold link-offset-3">
          View all Projects <TbLink size={13} />
        </Link>
      </div>
    </ComponentCard>
  )
}

export default ActiveProjectsOverview
