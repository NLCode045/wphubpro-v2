;

import React from 'react';
import { Modal, Button, Form, Row, Col, ModalBody, ModalHeader, ModalTitle, FormGroup, FormLabel, FormControl, ModalFooter } from 'react-bootstrap'

const AddCategoryModal = ({ show, handleClose }:{ show: boolean, handleClose: () => void}) => {

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted. Implement data handling in the parent if needed.");
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle as="h5" id="addCategoryModalLabel">Add New Category</ModalTitle>
      </ModalHeader>

      <Form onSubmit={onFormSubmit}>
        <ModalBody>
          <Row className="g-3">
            {/* These inputs are now "uncontrolled". React does not manage their state. */}
            <Col md={6}>
              <FormGroup controlId="categoryName">
                <FormLabel>Category Name</FormLabel>
                <FormControl type="text" placeholder="e.g. Electronics" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="categorySlug">
                <FormLabel>Slug</FormLabel>
                <FormControl type="text" placeholder="e.g. electronics" required />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="categoryImage">
                <FormLabel>Category Image</FormLabel>
                <FormControl type="file" accept="image/*" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="status">
                <FormLabel>Status</FormLabel>
                <Form.Select defaultValue="active" required>
                  <option value="all">Select Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup controlId="description">
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  placeholder="Brief description of the category..."
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Add Category
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default AddCategoryModal;
