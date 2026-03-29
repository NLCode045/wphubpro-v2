import { Dropdown, Row, Col, Button, DropdownToggle, DropdownMenu } from 'react-bootstrap'

import { LuCalendar, LuCirclePlus, LuFolder, LuLayoutGrid, LuMessageCircle, LuUsers } from 'react-icons/lu'

import googleLogo from "@/assets/images/logos/google.svg";
import figmaLogo from "@/assets/images/logos/figma.svg";
import slackLogo from "@/assets/images/logos/slack.svg";
import dropboxLogo from "@/assets/images/logos/dropbox.svg";

export default function ApplicationMenu() {
  return (
    <div className="topbar-item">
      <Dropdown align="end">
        <DropdownToggle as="button" className="topbar-link drop-arrow-none">
          <LuLayoutGrid className="fs-xxl" />
        </DropdownToggle>

        <DropdownMenu className="dropdown-menu-lg p-2">
          <Row className="align-items-center g-1">
            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title text-bg-light rounded-circle">
                    <img src={googleLogo} alt="Google" width={18} height={18} />
                  </span>
                </span>
                <span className="fw-medium">Google</span>
              </a>
            </Col>

            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title text-bg-light rounded-circle">
                    <img src={figmaLogo} alt="Figma" width={18} height={18} />
                  </span>
                </span>
                <span className="fw-medium">Figma</span>
              </a>
            </Col>

            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title text-bg-light rounded-circle">
                    <img src={slackLogo} alt="Slack" width={18} height={18} />
                  </span>
                </span>
                <span className="fw-medium">Slack</span>
              </a>
            </Col>

            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title text-bg-light rounded-circle">
                    <img src={dropboxLogo } alt="Dropbox" width={18} height={18} />
                  </span>
                </span>
                <span className="fw-medium">Dropbox</span>
              </a>
            </Col>

            <Col xs={4} className="text-center">
              <Button variant="danger" size="sm" className="rounded-circle btn-icon">
                <LuCirclePlus size={18} />
              </Button>
            </Col>

            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title bg-primary-subtle text-primary rounded-circle">
                    <LuCalendar size={18} />
                  </span>
                </span>
                <span className="fw-medium">Calendar</span>
              </a>
            </Col>

            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title bg-primary-subtle text-primary rounded-circle">
                    <LuMessageCircle size={18} />
                  </span>
                </span>
                <span className="fw-medium">Chat</span>
              </a>
            </Col>

            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title bg-primary-subtle text-primary rounded-circle">
                    <LuFolder size={18} />
                  </span>
                </span>
                <span className="fw-medium">Files</span>
              </a>
            </Col>

            <Col xs={4}>
              <a className="dropdown-item border border-dashed rounded text-center py-2">
                <span className="avatar-sm d-block mx-auto mb-1">
                  <span className="avatar-title bg-primary-subtle text-primary rounded-circle">
                    <LuUsers size={18} />
                  </span>
                </span>
                <span className="fw-medium">Team</span>
              </a>
            </Col>
          </Row>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}
