
import ComponentCard from '@/components/cards/ComponentCard'
import { Col, FloatingLabel, Form, FormControl, FormLabel, FormSelect, FormText, Row } from 'react-bootstrap'
import { LuPercent, LuSearch } from 'react-icons/lu'

const InputTextFieldType = () => {
  return (
    <ComponentCard title="Input Textfield Type">
      <Row>
        <Col lg={6}>
          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="simpleinput">Simple Input</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" id="simpleinput" />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel>Label Input</FormLabel>
            </Col>
            <Col lg={8}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <FormLabel>Label Input</FormLabel>
                <FormControl type="email" placeholder="name@example.com" />
              </Form.Group>
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel>Floating Input</FormLabel>
            </Col>
            <Col lg={8}>
              <FloatingLabel label="Name" className="mb-3">
                <FormControl type="text" placeholder="name" />
              </FloatingLabel>
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="SearchInput">Search Style</FormLabel>
            </Col>
            <Col lg={8}>
              <div className="app-search">
                <FormControl type="search" placeholder="Search for something..." />
                <LuSearch className="app-search-icon text-muted" />
              </div>
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="validInput">Valid Input</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" id="validInput" isValid />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="inValidationInput">Invalid Input</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" id="inValidationInput" isInvalid />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-rounded">Rounded Input</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" id="example-rounded" className="rounded-pill" placeholder="Rounded Input" />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-placeholder">Placeholder</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" id="example-placeholder" placeholder="placeholder" />
            </Col>
          </Row>

        </Col>
        <Col lg={6}>
          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-textarea">Text area</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl as="textarea" id="example-textarea" rows={5} />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-readonly">Readonly</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" readOnly id="example-readonly" value="Readonly value" />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-disable">Disabled</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" id="example-disable" disabled value="Disabled value" />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-static">Static control</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl plaintext type="text" readOnly className="form-control-plaintext" id="example-static" value="email@example.com" />
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-helping">Helping text</FormLabel>
            </Col>
            <Col lg={8}>
              <FormControl type="text" id="example-helping" placeholder="Helping text" />
              <FormText className="text-muted">A block of help text that breaks onto a new line and may extend beyond one line.</FormText>
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel>Default Select</FormLabel>
            </Col>
            <Col lg={8}>
              <Form.Select>
                <option>Open this select menu</option>
                <option value="1">One</option>
                <option value="2">Two</option>
                <option value="3">Three</option>
              </Form.Select>
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <label className="col-form-label">Select with Icon</label>
            </Col>
            <Col lg={8}>
              <div className="app-search">
                <FormSelect className="form-control" id="discount">
                  <option>Choose Discount</option>
                  <option value="No Discount">No Discount</option>
                  <option value="Flat Discount">Flat Discount</option>
                  <option value="Percentage Discount">Percentage Discount</option>
                </FormSelect>
                <LuPercent className="app-search-icon text-muted"></LuPercent>
              </div>
            </Col>
          </Row>

          <div className="border-top border-dashed my-3"></div>

          <Row className="g-lg-4 g-2">
            <Col lg={4}>
              <FormLabel htmlFor="example-multiselect">Multiple Select</FormLabel>
            </Col>
            <Col lg={8}>
              <Form.Select id="example-multiselect" multiple>
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
              </Form.Select>
            </Col>
          </Row>
        </Col>
      </Row>
    </ComponentCard>
  )
}

export default InputTextFieldType
