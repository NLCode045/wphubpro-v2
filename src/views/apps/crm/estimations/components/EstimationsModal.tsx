import {
    Button,
    Col,
    Form,
    FormControl,
    FormGroup,
    FormLabel,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    Row
} from 'react-bootstrap'
import FlatPicker from 'react-flatpickr'

type EstimationsModalProps = {
  show: boolean
  onHide: () => void
}

const EstimationsModal = ({ show, onHide }: EstimationsModalProps) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Create New Estimation</ModalTitle>
      </ModalHeader>

      <Form id="createEstimationForm">
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="estimationTitle">
                <FormLabel>Project Name</FormLabel>
                <FormControl type="text" placeholder="Enter project name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientName">
                <FormLabel>Client</FormLabel>
                <FormControl type="text" placeholder="Enter client name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimatedValue">
                <FormLabel>Estimated Value (USD)</FormLabel>
                <FormControl type="number" placeholder="e.g. 25000" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimator">
                <FormLabel>Estimated By</FormLabel>
                <FormControl type="text" placeholder="Enter team member name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimationStatus">
                <FormLabel>Status</FormLabel>
                <Form.Select required defaultValue="">
                  <option value="">Select status</option>
                  <option value="Approved">Approved</option>
                  <option value="In Review">In Review</option>
                  <option value="Pending">Pending</option>
                  <option value="Declined">Declined</option>
                  <option value="Sent">Sent</option>
                </Form.Select>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="estimationTags">
                <FormLabel>Tags</FormLabel>
                <FormControl type="text" placeholder="e.g. CRM, Mobile, API" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="createdDate">
                <FormLabel>Created Date</FormLabel>
                <FlatPicker className="form-control" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="expectedCloseDate">
                <FormLabel>Expected Close</FormLabel>
                <FlatPicker className="form-control" />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Estimation
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default EstimationsModal
