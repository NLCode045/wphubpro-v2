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
} from "react-bootstrap";
import Flatpickr from 'react-flatpickr'

type CustomerModalProps = {
    show: boolean;
    onHide: () => void;
};

const CustomerModal = ({ show, onHide }: CustomerModalProps) => {
    return (
        <Modal show={show} onHide={onHide} size="lg">
            <ModalHeader closeButton>
                <ModalTitle as="h5">Add New Customer</ModalTitle>
            </ModalHeader>

            <Form id="addCustomerForm">
                <ModalBody>
                    <Row className="g-3">
                        <Col md={6}>
                            <FormGroup controlId="customerName">
                                <FormLabel>Customer Name</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="Enter full name"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="email">
                                <FormLabel>Email Address</FormLabel>
                                <FormControl
                                    type="email"
                                    placeholder="Enter email"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="phone">
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl
                                    type="text"
                                    placeholder="e.g. +1 234 567 8900"
                                    required
                                />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="company">
                                <FormLabel>Company</FormLabel>
                                <FormControl type="text" placeholder="Company name" />
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="country">
                                <FormLabel>Country</FormLabel>
                                <FormSelect required defaultValue="">
                                    <option value="">Select country</option>
                                    <option value="US">United States</option>
                                    <option value="UK">United Kingdom</option>
                                    <option value="IN">India</option>
                                    <option value="CA">Canada</option>
                                    <option value="DE">Germany</option>
                                    <option value="FR">France</option>
                                    <option value="JP">Japan</option>
                                    <option value="BR">Brazil</option>
                                    <option value="EG">Egypt</option>
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="customerType">
                                <FormLabel>Customer Type</FormLabel>
                                <FormSelect required defaultValue="">
                                    <option value="">Select type</option>
                                    <option value="Lead">Lead</option>
                                    <option value="Prospect">Prospect</option>
                                    <option value="Client">Client</option>
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="accountStatus">
                                <FormLabel>Account Status</FormLabel>
                                <FormSelect required defaultValue="">
                                    <option value="">Select status</option>
                                    <option value="Active">Active</option>
                                    <option value="Verification Pending">Verification Pending</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Blocked">Blocked</option>
                                </FormSelect>
                            </FormGroup>
                        </Col>

                        <Col md={6}>
                            <FormGroup controlId="joinedDate">
                                <FormLabel>Joined Date</FormLabel>
                               <Flatpickr className="form-control" required options={{ dateFormat: "d M Y" }}/>
                            </FormGroup>
                        </Col>
                    </Row>
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Add Customer
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default CustomerModal;
