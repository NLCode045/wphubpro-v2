
import { Button, Col, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import Flatpickr from 'react-flatpickr'

const CreateDealModal = ({ show, toggleModal }: { show: boolean; toggleModal: () => void }) => {
  return (
    <Modal show={show} onHide={toggleModal} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Create New Deal</ModalTitle>
      </ModalHeader>

      <Form id="createDealForm">
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="dealName">
                <FormLabel>Deal Name</FormLabel>
                <FormControl type="text" placeholder="Enter deal name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="companyName">
                <FormLabel>Company</FormLabel>
                <FormControl type="text" placeholder="Enter company name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="amount">
                <FormLabel>Amount (USD)</FormLabel>
                <Form.Control type="number" placeholder="e.g. 100000" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="stage">
                <FormLabel>Stage</FormLabel>
                <FormSelect required>
                  <option value="">Select stage</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="probability">
                <FormLabel>Probability (%)</FormLabel>
                <Form.Control type="number" min={0} max={100} placeholder="e.g. 75" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="closingDate">
                <FormLabel>Expected Closing Date</FormLabel>
                <Flatpickr className="form-control" required />
              </FormGroup>
            </Col>
          </Row>
        </Modal.Body>

        <ModalFooter>
          <Button variant="light" onClick={toggleModal}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save Deal
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default CreateDealModal
