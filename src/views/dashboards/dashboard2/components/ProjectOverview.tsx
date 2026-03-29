
import { Card, CardBody, CardHeader, Nav, NavItem, NavLink } from 'react-bootstrap'
import CustomApexChart from '@/components/CustomApexChart.tsx'
import { projectOverviewChart } from '@/views/dashboards/dashboard2/data'
import { TbHome, TbSettings, TbUserCircle } from 'react-icons/tb'

const ProjectOverview = () => {
  return (
    <Card>
      <CardHeader className="border-dashed card-tabs d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="card-title">Project Overview</h4>
        </div>
        <Nav defaultActiveKey={'two'} justify className="nav nav-tabs card-header-tabs nav-bordered">
          <NavItem>
            <NavLink eventKey={'one'}>
              <TbHome className="d-md-none d-block"/>
              <span className="d-none d-md-block">Today</span>
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink eventKey={'two'}>
              <TbUserCircle className="d-md-none d-block"/>
              <span className="d-none d-md-block">Monthly</span>
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink eventKey={'three'}>
              <TbSettings className="d-md-none d-block"/>
              <span className="d-none d-md-block">Annual</span>
            </NavLink>
          </NavItem>
        </Nav>
      </CardHeader>
      <CardBody>
        <div dir="ltr">
          <CustomApexChart getOptions={projectOverviewChart} />
        </div>
      </CardBody>
    </Card>
  )
}

export default ProjectOverview
