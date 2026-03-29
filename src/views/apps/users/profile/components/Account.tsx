import {
    Button,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    FormControl,
    FormLabel,
    Nav,
    NavItem,
    NavLink,
    Row,
    TabContainer,
    TabContent,
    Table,
    TabPane
} from 'react-bootstrap'
import {
    TbArrowBackUp,
    TbBrandFacebook,
    TbBrandGithub,
    TbBrandInstagram,
    TbBrandLinkedin,
    TbBrandSkype,
    TbBrandX,
    TbBriefcase,
    TbBuildingSkyscraper,
    TbCamera,
    TbChecklist,
    TbDeviceFloppy,
    TbHeart,
    TbHome,
    TbMapPin,
    TbMoodSmile,
    TbPencil,
    TbQuote,
    TbSettings,
    TbShare3,
    TbUser,
    TbUserCircle,
    TbWorld
} from 'react-icons/tb'
import {taskData} from '../data.ts'

import {Link} from "react-router";
import user3 from '@/assets/images/users/user-3.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import small1 from '@/assets/images/stock/small-1.jpg'
import small2 from '@/assets/images/stock/small-2.jpg'
import small3 from '@/assets/images/stock/small-3.jpg'
import user1 from '@/assets/images/users/user-1.jpg'

const Account = () => {
    return (
        <div className="card">
            <TabContainer defaultActiveKey='timeline'>
                <CardHeader className="card-tabs d-flex align-items-center">
                    <div className="flex-grow-1">
                        <CardTitle as={'h4'}>My Account</CardTitle>
                    </div>
                    <Nav className="nav-tabs card-header-tabs nav-bordered">
                        <NavItem>
                            <NavLink eventKey="about-me" data-bs-toggle="tab" aria-expanded="false">
                                <TbHome className="d-md-none d-block" />
                                <span className="d-none d-md-block fw-bold">About Me</span>
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink eventKey="timeline" data-bs-toggle="tab" aria-expanded="true">
                                <TbUserCircle className="d-md-none d-block" />
                                <span className="d-none d-md-block fw-bold">Timeline</span>
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink eventKey="settings" data-bs-toggle="tab" aria-expanded="false">
                                <TbSettings className="d-md-none d-block" />
                                <span className="d-none d-md-block fw-bold">Settings</span>
                            </NavLink>
                        </NavItem>
                    </Nav>
                </CardHeader>
                <CardBody>
                    <TabContent>
                        <TabPane eventKey="about-me">
                            <p>I'm an Admin Template Author dedicated to building clean, efficient, and highly customizable dashboards for developers and businesses. My goal is to create UI solutions that are modern, scalable, and easy to integrate.</p>
                            <p>I specialize in crafting developer-friendly admin panels and UI kits using frameworks like Bootstrap, Tailwind CSS, React, Vue, Angular, Laravel, and Next.js. My templates are designed to accelerate development and provide a strong foundation for web apps, SaaS platforms, and enterprise tools.</p>
                            <p className="mb-0">I focus on delivering well-structured, pixel-perfect layouts with a user-centric approach—ensuring responsive design, clean code, and seamless user experiences. Whether you're building a CRM, analytics dashboard, or backend system, my templates are made to help you build faster and smarter.</p>
                            <h4 className="card-title my-3 text-uppercase fs-sm"><TbBriefcase /> Professional Experience:</h4>
                            <div className="timeline">
                                <div className="timeline-item d-flex align-items-stretch">
                                    <div className="timeline-time pe-3 text-muted">2023 – Present</div>
                                    <div className="timeline-dot bg-primary" />
                                    <div className="timeline-content ps-3 pb-4">
                                        <h5 className="mb-1">Lead UI Developer</h5>
                                        <p className="mb-1 text-muted">Developing scalable and reusable UI components for SaaS dashboards using React, Tailwind CSS, and TypeScript.</p>
                                        <span className="text-muted fw-semibold">at CraftCode Studio</span>
                                    </div>
                                </div>
                                <div className="timeline-item d-flex align-items-stretch">
                                    <div className="timeline-time pe-3 text-muted">2021 – 2023</div>
                                    <div className="timeline-dot bg-success" />
                                    <div className="timeline-content ps-3 pb-4">
                                        <h5 className="mb-1">Frontend Engineer</h5>
                                        <p className="mb-1 text-muted">Built modern, responsive admin templates and UI kits using Vue, Bootstrap 5, and Laravel Blade.</p>
                                        <span className="text-muted fw-semibold">at CodeNova</span>
                                    </div>
                                </div>
                                <div className="timeline-item d-flex align-items-stretch">
                                    <div className="timeline-time pe-3 text-muted">2019 – 2021</div>
                                    <div className="timeline-dot bg-warning" />
                                    <div className="timeline-content ps-3 pb-4">
                                        <h5 className="mb-1">UI/UX Designer &amp; Developer</h5>
                                        <p className="mb-1 text-muted">Designed and developed dashboard layouts and admin panel concepts, focusing on accessibility and performance.</p>
                                        <span className="text-muted fw-semibold">as Freelancer</span>
                                    </div>
                                </div>
                                <div className="timeline-item d-flex align-items-stretch">
                                    <div className="timeline-time pe-3 text-muted">2017 – 2019</div>
                                    <div className="timeline-dot bg-info" />
                                    <div className="timeline-content ps-3 pb-4">
                                        <h5 className="mb-1">Web Designer</h5>
                                        <p className="mb-1 text-muted">Created responsive HTML/CSS templates and themes for clients in eCommerce and portfolio niches.</p>
                                        <span className="text-muted fw-semibold">at PixelFrame Agency</span>
                                    </div>
                                </div>
                                <div className="timeline-item d-flex align-items-stretch">
                                    <div className="timeline-time pe-3 text-muted">2015 – 2017</div>
                                    <div className="timeline-dot bg-secondary" />
                                    <div className="timeline-content ps-3">
                                        <h5 className="mb-1">Junior Frontend Developer</h5>
                                        <p className="mb-1 text-muted">Maintained and updated legacy UI projects, gaining hands-on experience in HTML, CSS, jQuery, and Bootstrap 3.</p>
                                        <span className="text-muted fw-semibold">at DevLaunch</span>
                                    </div>
                                </div>
                            </div>
                            <h4 className="card-title my-3 text-uppercase fs-sm"><TbChecklist /> Tasks Overview:</h4>
                            <div className="table-responsive">
                                <Table className="table-centered table-custom table-sm table-nowrap table-hover mb-0">
                                    <thead className="bg-light bg-opacity-25 thead-sm">
                                        <tr className="text-uppercase fs-xxs">
                                            <th data-table-sort="task">Task</th>
                                            <th data-table-sort>Status</th>
                                            <th data-table-sort="name">Assigned By</th>
                                            <th data-table-sort>Start Date</th>
                                            <th data-table-sort>Priority</th>
                                            <th data-table-sort>Progress</th>
                                            <th data-table-sort>Total Time Spent</th>
                                            <th style={{ width: 30 }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            taskData.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <h5 className="fs-sm my-1"><a href="#" className="text-body">{item.title}</a></h5>
                                                        <span className="text-muted fs-xs">{item.due}</span>
                                                    </td>
                                                    <td><span className={`badge badge-${item.status.color} `}>{item.status.label}</span></td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="avatar avatar-sm">
                                                                <img src={item.assignedBy.avatar} alt="avatar" className="img-fluid rounded-circle" />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-nowrap fs-sm mb-0">{item.assignedBy.name}</h5>
                                                                <p className="text-muted fs-xs mb-0">{item.assignedBy.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{item.startDate}</td>
                                                    <td><span className={`badge badge-${item.priority.color}`}>{item.priority.label}</span></td>
                                                    <td>{item.progress}</td>
                                                    <td>{item.timeSpent}</td>
                                                    <td><a href="#" className="text-muted fs-xxl"><TbPencil /></a></td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </Table>
                            </div>
                        </TabPane>
                        <TabPane eventKey="timeline">
                            <form action="#" className="mb-3">
                                <textarea rows={3} className="form-control" placeholder="Write something..." defaultValue={""} />
                                <div className="d-flex py-2 justify-content-between">
                                    <div>
                                        <Link to="" className="btn btn-sm btn-icon btn-light"><TbUser className="fs-md" /></Link>&nbsp;
                                        <Link to="" className="btn btn-sm btn-icon btn-light"><TbMapPin className="fs-md" /></Link>&nbsp;
                                        <Link to="" className="btn btn-sm btn-icon btn-light"><TbCamera className="fs-md" /></Link>&nbsp;
                                        <Link to="" className="btn btn-sm btn-icon btn-light"><TbMoodSmile className="fs-md" /></Link>
                                    </div>
                                    <button type="submit" className="btn btn-sm btn-dark">Post</button>
                                </div>
                            </form>
                            <div className="border border-light border-dashed rounded p-2 mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <img className="me-2 avatar-md rounded-circle" src={user3} alt="Generic placeholder image" />
                                    <div className="w-100">
                                        <h5 className="m-0">Jeremy Tomlinson</h5>
                                        <p className="text-muted mb-0"><small>about 2 minutes ago</small></p>
                                    </div>
                                </div>
                                <p>Story based around the idea of time lapse, animation to post soon!</p>
                                <img src={small1} alt="post-img" className="rounded me-1" height={60} />&nbsp;
                                <img src={small2} alt="post-img" className="rounded me-1" height={60} />&nbsp;
                                <img src={small3} alt="post-img" className="rounded" height={60} />
                                <div className="mt-2">
                                    <Link to="" className="btn btn-sm btn-link text-muted"><TbArrowBackUp className="fs-sm me-1" /> Reply</Link>
                                    <Link to="" className="btn btn-sm btn-link text-muted"><TbHeart className="fs-sm me-1" /> Like</Link>
                                    <Link to="" className="btn btn-sm btn-link text-muted"><TbShare3 className="fs-sm me-1" /> Share</Link>
                                </div>
                            </div>
                            <div className="border border-light border-dashed rounded p-2 mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <img className="me-2 avatar-sm rounded-circle" src={user4} alt="Generic placeholder image" />
                                    <div className="w-100">
                                        <h5 className="m-0">Sophia Martinez</h5>
                                        <p className="text-muted mb-0"><small>about 30 minutes ago</small></p>
                                    </div>
                                </div>
                                <div className="fs-16 text-center mt-3 mb-4 fst-italic">
                                    <TbQuote className="fs-20" />&nbsp;
                                    Just finished a weekend project! Built a small weather app using React and OpenWeather API.
                                    Feeling excited to share the results with everyone soon. 🚀
                                </div>
                                <div className="bg-light-subtle m-n2 p-2 border-top border-bottom border-dashed">
                                    <div className="d-flex align-items-start">
                                        <img className="me-2 avatar-sm rounded-circle" src={user1} alt="Generic placeholder image" />
                                        <div className="w-100">
                                            <h5 className="mt-0 mb-1">
                                                Liam Johnson <small className="text-muted">10 minutes ago</small>
                                            </h5>
                                            That sounds awesome! Can't wait to see how you designed the UI.
                                            <br />
                                            <Link to="" className="text-muted font-13 d-inline-block mt-2">
                                                <TbArrowBackUp /> Reply
                                            </Link>
                                            <div className="d-flex align-items-start mt-3">
                                                <Link className="pe-2" to="">
                                                    <img src={user2} className="avatar-sm rounded-circle" alt="Generic placeholder image" />
                                                </Link>
                                                <div className="w-100">
                                                    <h5 className="mt-0 mb-1">
                                                        Olivia Carter <small className="text-muted">15 minutes ago</small>
                                                    </h5>
                                                    I recently built something similar with Vue. Let's collaborate sometime!
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-start mt-2">
                                        <Link className="pe-2" to="">
                                            <img src={user3} className="rounded-circle" alt="Generic placeholder image" height={31} />
                                        </Link>
                                        <div className="w-100">
                                            <input type="text" id="simpleinput" className="form-control form-control-sm" placeholder="Add a comment..." />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <Link to="" className="btn btn-sm btn-link text-danger">
                                        <TbHeart className="me-1 fs-sm" /> Like (45)
                                    </Link>
                                    <Link to="" className="btn btn-sm btn-link text-muted">
                                        <TbShare3 className="me-1 fs-sm" /> Share
                                    </Link>
                                </div>
                            </div>
                            <div className="border border-light border-dashed rounded p-2 mb-3">
                                <div className="d-flex align-items-center mb-2">
                                    <img className="me-2 avatar-sm rounded-circle" src={user2} alt="Profile photo of Anika Roy" />
                                    <div className="w-100">
                                        <h5 className="m-0">Anika Roy</h5>
                                        <p className="text-muted mb-0"><small>2 hours ago</small></p>
                                    </div>
                                </div>
                                <p>Sharing a couple of timelapses from my recent Iceland trip. Let me know which one you like most!</p>
                                <Row className="g-2">
                                    <Col md={6}>
                                        <div className="ratio ratio-16x9 rounded overflow-hidden">
                                            <iframe src="https://player.vimeo.com/video/1084537" allowFullScreen />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="ratio ratio-16x9 rounded overflow-hidden">
                                            <iframe src="https://player.vimeo.com/video/76979871" allowFullScreen />
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                            <div className="d-flex align-items-center justify-content-center gap-2 p-3">
                                <strong>Loading...</strong>
                                <div className="spinner-border spinner-border-sm text-danger" role="status" aria-hidden="true" />
                            </div>
                        </TabPane>
                        <TabPane eventKey="settings">
                            <form>
                                <h5 className="mb-3 text-uppercase bg-light-subtle p-1 border-dashed border rounded border-light text-center"><TbUserCircle className="me-1" /> Personal Info</h5>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="firstname">First Name</FormLabel>
                                            <FormControl type="text" id="firstname" placeholder="Enter first name" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="lastname">Last Name</FormLabel>
                                            <FormControl type="text" id="lastname" placeholder="Enter last name" />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="jobtitle">Job Title</FormLabel>
                                            <FormControl type="text" id="jobtitle" placeholder="e.g. UI Developer, Designer" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="phone">Phone Number</FormLabel>
                                            <FormControl type="text" id="phone" placeholder="+1 234 567 8901" />
                                        </div>
                                    </Col>
                                </Row>
                                <div className="mb-3">
                                    <FormLabel htmlFor="userbio">Bio</FormLabel>
                                    <FormControl as={'textarea'} id="userbio" rows={4} placeholder="Write something about yourself..." defaultValue={""} />
                                </div>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="useremail">Email Address</FormLabel>
                                            <FormControl type="email" id="useremail" placeholder="Enter email" />
                                            <span className="form-text fs-xs fst-italic text-muted"><a href="#" className="link-reset">Click here to change your email</a></span>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="userpassword">Password</FormLabel>
                                            <FormControl type="password" id="userpassword" placeholder="Enter new password" />
                                            <span className="form-text fs-xs fst-italic text-muted"><a href="#" className="link-reset">Click here to change your password</a></span>
                                        </div>
                                    </Col>
                                </Row>
                                <div className="mb-4">
                                    <FormLabel htmlFor="profilephoto">Profile Photo</FormLabel>
                                    <FormControl type="file" id="profilephoto" />
                                </div>
                                <h5 className="mb-3 text-uppercase bg-light-subtle p-1 border-dashed border rounded border-light text-center">
                                    <TbMapPin className="me-1" /> Address Info
                                </h5>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="address-line1">Address Line 1</FormLabel>
                                            <FormControl type="text" id="address-line1" placeholder="Street, Apartment, Unit, etc." />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="address-line2">Address Line 2</FormLabel>
                                            <FormControl type="text" id="address-line2" placeholder="Optional" />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="city">City</FormLabel>
                                            <FormControl type="text" id="city" placeholder="City" />
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="state">State / Province</FormLabel>
                                            <FormControl type="text" id="state" placeholder="State or Province" />
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="zipcode">Postal / ZIP Code</FormLabel>
                                            <FormControl type="text" id="zipcode" placeholder="Postal Code" />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="country">Country</FormLabel>
                                            <FormControl type="text" id="country" placeholder="Country" />
                                        </div>
                                    </Col>
                                </Row>
                                <h5 className="mb-3 text-uppercase bg-light-subtle p-1 border-dashed border rounded border-light text-center"><TbBuildingSkyscraper className="me-1" /> Company Info</h5>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="companyname">Company Name</FormLabel>
                                            <FormControl type="text" id="companyname" placeholder="Enter company name" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <FormLabel htmlFor="cwebsite">Website</FormLabel>
                                            <FormControl type="text" id="cwebsite" placeholder="https://yourcompany.com" />
                                        </div>
                                    </Col>
                                </Row>
                                <h5 className="mb-3 text-uppercase bg-light-subtle p-1 border-dashed border rounded border-light text-center"><TbWorld className="me-1" /> Social</h5>
                                <div className="row g-3">
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-fb">Facebook</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandFacebook /></span>
                                            <FormControl type="text" id="social-fb" placeholder="Facebook URL" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-tw">Twitter X</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandX /></span>
                                            <FormControl type="text" id="social-tw" placeholder="@username" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-insta">Instagram</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandInstagram /></span>
                                            <FormControl type="text" id="social-insta" placeholder="Instagram URL" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-lin">LinkedIn</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandLinkedin /></span>
                                            <FormControl type="text" id="social-lin" placeholder="LinkedIn Profile" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-gh">GitHub</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandGithub /></span>
                                            <FormControl type="text" id="social-gh" placeholder="GitHub Username" />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <FormLabel htmlFor="social-sky">Skype</FormLabel>
                                        <div className="input-group">
                                            <span className="input-group-text"><TbBrandSkype /></span>
                                            <FormControl type="text" id="social-sky" placeholder="@username" />
                                        </div>
                                    </Col>
                                </div>
                                <div className="text-end mt-4">
                                    <Button variant='success' type="submit"><TbDeviceFloppy className=" me-1" /> Save Changes</Button>
                                </div>
                            </form>
                        </TabPane>
                    </TabContent>
                </CardBody>
            </TabContainer>
        </div>
    )
}

export default Account