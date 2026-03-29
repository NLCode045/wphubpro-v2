
import { useKanbanContext } from '@/context/useKanbanContext'
import { Button, Col, Form, FormControl, FormGroup, FormLabel, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import { Controller } from 'react-hook-form'
import type{ VariantType } from '@/types'
import { toPascalCase } from '@/helpers/casing'

const variants:VariantType[]=['primary','secondary','success','danger','warning','info','light','dark']

const Modals = () => {
  const { newTaskModal, taskForm, taskFormData, sectionFormData, sectionModal, sectionForm } = useKanbanContext()
  return (
    <>
      <Modal show={newTaskModal.open} aria-hidden={newTaskModal.open} onHide={newTaskModal.toggle} centered>
        <Form onSubmit={taskFormData ? taskForm.editRecord : taskForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle>{taskFormData ? 'Edit Deal' : 'Add New Deal'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FormGroup className="mb-3" controlId="taskTitle">
              <FormLabel>Title</FormLabel>
              <Controller
                control={taskForm.control}
                name="title"
                rules={{ required: 'Task title is required' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter task title" />}
              />
            </FormGroup>

            <FormGroup className="mb-3" controlId="userName">
              <FormLabel>User Name</FormLabel>
              <Controller
                control={taskForm.control}
                name="userName"
                rules={{ required: 'username  is required' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter user name" />}
              />
            </FormGroup>

            <FormGroup className="mb-3" controlId="companyName">
              <FormLabel>Company Name</FormLabel>
              <Controller
                control={taskForm.control}
                name="companyName"
                rules={{ required: 'Company name  is required' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter company name" />}
              />
            </FormGroup>
            <FormGroup className="mb-3" controlId="amount">
              <FormLabel>Amount</FormLabel>
              <Controller
                control={taskForm.control}
                name="amount"
                rules={{ required: 'Enter amount' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter amount" />}
              />
            </FormGroup>
            <Form.Group className="mb-0" controlId="taskDate">
              <Form.Label>Date</Form.Label>
              <Controller
                control={taskForm.control}
                name="date"
                rules={{ required: 'Date is required' }}
                render={({ field }) => <FormControl {...field} value={field.value ?? ''} type="date" />}
              />
            </Form.Group>
          </ModalBody>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => newTaskModal.toggle()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {taskFormData ? 'Edit Deal' : 'Add Deal'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={sectionModal.open} aria-hidden={sectionModal.open} onHide={sectionModal.toggle} tabIndex={-1} role="dialog">
        <form onSubmit={sectionFormData ? sectionForm.editRecord : sectionForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle className="m-0">{sectionFormData ? 'Edit New Section' : 'Add New Section'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Row>
              <Col sm={12} className="mb-3">
                <FormLabel>Title</FormLabel>
                <Controller
                  control={sectionForm.control}
                  name="sectionTitle"
                  rules={{ required: 'Task title is required' }}
                  render={({ field }) => (
                    <>
                      <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter task title" />
                    </>
                  )}
                />
              </Col>
              <Col sm={12}>
                  <FormLabel>Variant</FormLabel>
                  <Controller
                    control={sectionForm.control}
                    name="sectionVariant"
                    rules={{ required: 'Select a Variant' }}
                    render={({ field }) => (
                      <Form.Select
                        {...field}
                        value={field.value?.name || 'info'}
                        onChange={(e) => {
                          const idx = e.target.selectedIndex
                          field.onChange(variants[idx])
                        }}>
                        {variants.map((variant, idx) => (
                          <option value={variant} key={idx}>
                            {toPascalCase(variant)}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" type="submit">
              {sectionFormData ? 'Update' : 'Save'}
            </Button>
            <Button variant="danger" onClick={() => sectionModal.toggle()} type="button">
              Close
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}

export default Modals
