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
    Row,
} from "react-bootstrap";
import FlatPicker from 'react-flatpickr'

type ProposalsModalProps = {
    show: boolean;
    onHide: () => void;
};

const ProposalsModal = ({ show, onHide }: ProposalsModalProps) => {
    return (
        <Modal show={show} onHide={onHide} size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h5">Create New Proposal</ModalTitle>
            </ModalHeader>

            <Form id="createEstimationForm">
                <ModalBody>
                    <Row className="g-3">

                        <Col md={6}>
                            <FormGroup controlId="estimationTitle">
                                <FormLabel>Proposale Id</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Enter proposal ID (e.g. #PS008120)"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="clientName">
                                <FormLabel>Subject</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Enter proposal subject"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimatedValue">
                                <FormLabel>Send To (Client)</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="Enter client name"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimator">
                                <FormLabel>Value (USD)</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="e.g. 15000"
                                    required
                                />
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
                                <FormControl
                                    type="text"
                                    placeholder="e.g. CRM, Mobile, API"
                                />
                            </FormGroup>
                        </Col>

        
                        <Col md={6}>
                            <FormGroup controlId="createdDate">
                                <FormLabel>Created Date</FormLabel>
                              <FlatPicker className="form-control" options={{ dateFormat: "d M Y" }} required/>
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="expectedCloseDate">
                                <FormLabel>Open Till</FormLabel>
                              <FlatPicker className="form-control" options={{ dateFormat: "d M Y" }} required/>
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
    );
};

export default ProposalsModal;
