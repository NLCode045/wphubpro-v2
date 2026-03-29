
import UserTable from '@/views/apps/users/roles/components/UserTable'
import { memberRoles } from '@/views/apps/users/roles/data'
import { Col, Container, FormControl, FormLabel, Modal, ModalBody, ModalFooter, ModalHeader, Row } from 'react-bootstrap'
import { TbPlus } from 'react-icons/tb'
import { useToggle } from 'usehooks-ts'
import MemberRoleCard from '@/views/apps/users/roles/components/MemberRoleCard'

const Index = () => {
  const [show, toggle] = useToggle(false)
  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col xxl={12}>
          <div className="d-flex align-items-sm-center flex-sm-row flex-column my-3">
            <div className="flex-grow-1">
              <h4 className="fs-xl mb-1">Manage Roles</h4>
              <p className="text-muted mb-0">Manage roles for smoother operations and secure access.</p>
            </div>
            <div className="text-end">
              <a onClick={toggle} className="btn btn-success">
                <TbPlus className="me-1" /> Add New Role
              </a>
            </div>
          </div>
          <Row>
            {memberRoles.map((member, idx) => (
              <Col md={6} lg={3} key={idx}>
                <MemberRoleCard member={member} />
              </Col>
            ))}
          </Row>
          <Row>
            <Col xs={12}>
              <UserTable />
            </Col>
          </Row>
        </Col>
      </Row>
      <Modal show={show} onHide={toggle} className="fade" dialogClassName='modal-lg' id="editRoleModal" tabIndex={-1} aria-labelledby="editRoleModalLabel" aria-hidden="true">
        <ModalHeader>
          <h5 className="modal-title" id="editRoleModalLabel">Edit Role</h5>
          <button type="button" onClick={toggle} className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
        </ModalHeader>
        <form id="editRoleForm">
          <ModalBody>
            <Row className="g-3">
              <Col md={6}>
                <FormLabel htmlFor="editRoleName">Role Name</FormLabel>
                <FormControl type="text" id="editRoleName" defaultValue="Developer" required />
              </Col>
              <Col md={6}>
                <FormLabel htmlFor="editRoleDescription">Description</FormLabel>
                <FormControl type="text" id="editRoleDescription" defaultValue="Builds and maintains the platform core features." required />
              </Col>
              <Col xs={12}>
                <FormLabel htmlFor="editRoleResponsibilities">Key Responsibilities</FormLabel>
                <FormControl as={'textarea'} id="editRoleResponsibilities" rows={4} required defaultValue={"Codebase Maintenance\nAPI Integration\nUnit Testing\nFeature Deployment"} />
                <small className="text-muted">Separate each item by comma or line</small>
              </Col>
              <Col md={6}>
                <FormLabel htmlFor="editRoleUsers">Assign Users</FormLabel>
                <select className="form-select" id="editRoleUsers" multiple>
                  <option value={1} >Leah Kim</option>
                  <option value={2} >David Tran</option>
                  <option value={3}>Michael Brown</option>
                  <option value={4}>Emma Wilson</option>
                </select>
                <small className="text-muted">Hold Ctrl (Windows) or Cmd (Mac) to select multiple users</small>
              </Col>
              <Col md={6}>
                <FormLabel htmlFor="editRoleIcon">Role Icon</FormLabel>
                <FormControl type="text" id="editRoleIcon" defaultValue="ti ti-code" />
                <small className="text-muted">Use icon class from your icon library</small>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <button type="button" className="btn btn-light" onClick={toggle} data-bs-dismiss="modal">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </ModalFooter>
        </form>
      </Modal>

    </Container>
  )
}

export default Index
