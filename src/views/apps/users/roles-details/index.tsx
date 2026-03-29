import {Link} from "react-router";
import {Col, Container, Row} from 'react-bootstrap'
import {TbPlus} from 'react-icons/tb'
import MemberRoleCard from './components/MemberRoleCard.tsx'
import UserTable from './components/UserTable.tsx'

const Page = () => {
    return (
        <Container fluid>
            <Row className="justify-content-center">
                <Col xxl={12}>
                    <div className="d-flex align-items-sm-center flex-sm-row flex-column my-3">
                        <div className="flex-grow-1">
                            <h4 className="fs-xl mb-1">Role Details</h4>
                            <p className="text-muted mb-0">Define and manage roles to streamline operations and ensure secure access control.</p>
                        </div>
                        <div className="text-end">
                            <Link to="" className="btn btn-success">
                                <TbPlus className="me-1" /> Add New Role
                            </Link>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-4 col-lg-3">
                            <MemberRoleCard />
                        </div>
                        <div className="col-md-8 col-lg-9">
                            <UserTable />
                        </div>
                    </div>

                </Col>
            </Row>
        </Container>
    )
}

export default Page