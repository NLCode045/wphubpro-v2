
import React, { useState } from 'react'
import { Card, CardBody, CardHeader, Col, Container, Row } from 'react-bootstrap'
import { TbPlus, TbX } from 'react-icons/tb'
import PageBreadcrumb from '@/components/PageBreadcrumb'


const Index = () => {
    const initialState = {
        requester: '',
        email: '',
        subject: '',
        priority: '',
        status: '',
        tags: '',
        description: '',
    }
    const [form, setForm] = useState(initialState)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.id]: e.target.value })
    }

    const handleReset = () => {
        setForm(initialState)
    }
    return (
        <>
            <Container fluid>
                <PageBreadcrumb title="New Ticket" subtitle="Support" />
                <Row className="justify-content-center">
                    <Col xxl={10}>
                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Create New Support Ticket</h5>
                            </CardHeader>

                            <form
                                onSubmit={e => {
                                    e.preventDefault()
                                }}
                                onReset={handleReset}
                            >
                                <CardBody>
                                    <div className="mb-3">
                                        <label htmlFor="requester" className="form-label">Requester Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="requester"
                                            placeholder="Enter your full name"
                                            value={form.requester}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="email"
                                            placeholder="you@example.com"
                                            value={form.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="subject" className="form-label">Ticket Subject</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="subject"
                                            placeholder="Brief summary of the issue"
                                            value={form.subject}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <Row className="mb-3">
                                        <Col md={6}>
                                            <label htmlFor="priority" className="form-label">Priority</label>
                                            <select
                                                id="priority"
                                                className="form-select"
                                                value={form.priority}
                                                onChange={handleChange}
                                            >
                                                <option value="" disabled>Choose...</option>
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                            </select>
                                        </Col>
                                        <Col md={6}>
                                            <label htmlFor="status" className="form-label">Status</label>
                                            <select
                                                id="status"
                                                className="form-select"
                                                value={form.status}
                                                onChange={handleChange}
                                            >
                                                <option value="" disabled>Choose...</option>
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Resolved">Resolved</option>
                                                <option value="Closed">Closed</option>
                                            </select>
                                        </Col>
                                    </Row>
                                    <div className="mb-3">
                                        <label htmlFor="tags" className="form-label">Tags (comma-separated)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="tags"
                                            placeholder="e.g. login, error, payment"
                                            value={form.tags}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="description" className="form-label">Description</label>
                                        <textarea
                                            id="description"
                                            className="form-control"
                                            rows={5}
                                            placeholder="Describe the issue in detail..."
                                            value={form.description}
                                            onChange={handleChange}
                                        ></textarea>
                                    </div>
                                    <div className="d-flex gap-2 justify-content-center">
                                        <button type="submit" className="btn btn-primary"><TbPlus className="me-1" />Submit Ticket</button>
                                        <button type="reset" className="btn btn-outline-secondary"><TbX className="me-1" />Reset</button>
                                    </div>
                                </CardBody>
                            </form>
                        </Card>
                    </Col>
                </Row>
            </Container>

        </>


    )
}

export default Index