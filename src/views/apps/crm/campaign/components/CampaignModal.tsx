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

type EstimationsModalProps = {
    show: boolean;
    onHide: () => void;
};

const CampaignModal = ({ show, onHide }: EstimationsModalProps) => {
    return (
        <Modal show={show} onHide={onHide} size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h5">Create New Campaign</ModalTitle>
            </ModalHeader>

            <Form id="createEstimationForm">
                <ModalBody>
                    <Row className="g-3">

                        <Col md={6}>
                            <FormGroup controlId="estimationTitle">
                                <FormLabel>Campaign Name</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Enter Campaign name"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="clientName">
                                <FormLabel>Creator</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Enter campaign creator"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimatedValue">
                                <FormLabel>Budget (USD)</FormLabel>
                                <FormControl
                                    type="number"
                                    placeholder="e.g. 7500"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimator">
                                <FormLabel>Goal (USD)</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="e.g. Email, Webinar, Retargeting"
                                    required
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimationStatus">
                                <FormLabel>Status</FormLabel>
                                <Form.Select required defaultValue="">
                                    <option value="">Status</option>
                                    <option value="Success">Success</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Failed">Failed</option>
                                    <option value="Ongoing">Ongoing</option>
                                </Form.Select>
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="estimationTags">
                                <FormLabel>Tags</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="e.g. Email, Webinar, Retargeting"
                                />
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="createdDate">
                                <FormLabel>Launch Date</FormLabel>
                              <FlatPicker className="form-control" required options={{dateFormat: "d M Y"}}/>
                            </FormGroup>
                        </Col>


                        <Col md={6}>
                            <FormGroup controlId="expectedCloseDate">
                                <FormLabel>Launch Time</FormLabel>

                              <FlatPicker className="form-control" required options={{enableTime: true,noCalendar: true}}/>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Save Campaign
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default CampaignModal;
