import {
    Button,
    Col,
    Form,
    FormControl,
    FormGroup,
    FormLabel,
    FormSelect,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    Row,
} from 'react-bootstrap'

const AddNewLeadModal = ({ show, toggleModal }: { show: boolean; toggleModal: () => void }) => {

  return (
      <Modal show={show} onHide={toggleModal} size="lg">
        <ModalHeader closeButton>
          <ModalTitle as="h5">Add New Lead</ModalTitle>
        </ModalHeader>

        <Form id="leadForm">
          <ModalBody>
            <Row className="g-3">
              <Col md={6}>
                <FormGroup controlId="leadName">
                  <FormLabel>Lead Name</FormLabel>
                  <FormControl type="text" placeholder="Enter lead name" required />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="companyName">
                  <FormLabel>Company</FormLabel>
                  <FormControl type="text" placeholder="Enter company name" required />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="email">
                  <FormLabel>Email</FormLabel>
                  <FormControl type="email" placeholder="Enter email" required />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="phone">
                  <FormLabel>Phone</FormLabel>
                  <FormControl type="tel" placeholder="+1 234-567-8910" />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="amount">
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl type="number" placeholder="e.g. 50000" />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="leadStatus">
                  <FormLabel>Status</FormLabel>
                  <FormSelect>
                    <option value="">Select status</option>
                    <option>In Progress</option>
                    <option>Proposal Sent</option>
                    <option>Follow Up</option>
                    <option>Pending</option>
                    <option>Negotiation</option>
                    <option>Rejected</option>
                  </FormSelect>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup controlId="assignedTo">
                  <FormLabel>Assign To</FormLabel>
                  <FormSelect>
                    <option value="">Select user</option>
                    <option value="1">Emily Carter</option>
                    <option value="2">Rohan Iyer</option>
                    <option value="3">Sara Kim</option>
                    <option value="4">Kevin Nguyen</option>
                  </FormSelect>
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onClick={toggleModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Lead
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
  )
}

export default AddNewLeadModal
