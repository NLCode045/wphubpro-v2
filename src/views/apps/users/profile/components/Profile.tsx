import user3 from '@/assets/images/users/user-3.jpg'
import usFlag from '@/assets/images/flags/us.svg'
import {Button, Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from 'react-bootstrap'
import {Link} from "react-router";
import {
    TbBrandX,
    TbBriefcase,
    TbDotsVertical,
    TbLink,
    TbMail,
    TbMapPin,
    TbSchool,
    TbUsers,
    TbWorld
} from 'react-icons/tb'
import {LuDribbble, LuFacebook, LuInstagram, LuLinkedin, LuYoutube} from 'react-icons/lu'

const Profile = () => {
    return (
        <Card className="card-top-sticky">
            <CardBody>
                <div className="d-flex align-items-center mb-4">
                    <div className="me-3 position-relative">
                        <img src={user3} alt="avatar" className="rounded-circle" width={72} height={72} />
                    </div>
                    <div>
                        <h5 className="mb-0 d-flex align-items-center">
                            <Link to="" className="link-reset">Geneva Lee</Link>
                            <img src={usFlag} alt="US" className="ms-2 rounded-circle" height={16} />
                        </h5>
                        <p className="text-muted mb-2">Senior Developer</p>
                        <span className="badge text-bg-light badge-label">Team Lead</span>
                    </div>
                    <div className="ms-auto">
                        <Dropdown >
                            <DropdownToggle className="btn btn-icon btn-ghost-light text-muted drop-arrow-none" data-bs-toggle="dropdown">
                                <TbDotsVertical className="fs-xl" />
                            </DropdownToggle>
                            <DropdownMenu align={'end'} className="dropdown-menu-end">
                                <li><DropdownItem>Edit Profile</DropdownItem></li>
                                <li><DropdownItem className="text-danger">Report</DropdownItem></li>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </div>
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                            <TbBriefcase className="fs-xl" />
                        </div>
                        <p className="mb-0 fs-sm">UI/UX Designer &amp; Full-Stack Developer</p>
                    </div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                            <TbSchool className="fs-xl" />
                        </div>
                        <p className="mb-0 fs-sm">Studied at <span className="text-dark fw-semibold">Stanford University</span>
                        </p>
                    </div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                            <TbMapPin className="fs-xl" />
                        </div>
                        <p className="mb-0 fs-sm">Lives in <span className="text-dark fw-semibold">San Francisco, CA</span></p>
                    </div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                            <TbUsers className="fs-xl" />
                        </div>
                        <p className="mb-0 fs-sm">Followed by <span className="text-dark fw-semibold">25.3k People</span></p>
                    </div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                            <TbMail className="fs-xl" />
                        </div>
                        <p className="mb-0 fs-sm">Email <Link to="mailto:hello@example.com" className="text-primary fw-semibold">hello@example.com</Link>
                        </p>
                    </div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                            <TbLink className="fs-xl" />
                        </div>
                        <p className="mb-0 fs-sm">Website <Link to="https://www.example.dev" className="text-primary fw-semibold">www.example.dev</Link>
                        </p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className="avatar-sm text-bg-light bg-opacity-75 d-flex align-items-center justify-content-center rounded-circle">
                            <TbWorld className="fs-xl" />
                        </div>
                        <p className="mb-0 fs-sm">Languages <span className="text-dark fw-semibold">English, Hindi, Japanese</span>
                        </p>
                    </div>
                    <div className="d-flex justify-content-center gap-2 mt-4 mb-2">
                        <Link to="" className="btn btn-icon rounded-circle btn-primary" title="Facebook">
                            <LuFacebook className="fs-xl" />
                        </Link>
                        <Link to="" className="btn btn-icon rounded-circle btn-info" title="Twitter-x">
                            <TbBrandX className="fs-xl" />
                        </Link>
                        <Link to="" className="btn btn-icon rounded-circle btn-danger" title="Instagram">
                            <LuInstagram className="fs-xl" />
                        </Link>
                        <Link to="" className="btn btn-icon rounded-circle btn-success" title="WhatsApp">
                            <LuDribbble className="fs-xl" />
                        </Link>
                        <Link to="" className="btn btn-icon rounded-circle btn-secondary" title="LinkedIn">
                            <LuLinkedin className="fs-xl" />
                        </Link>
                        <Link to="" className="btn btn-icon rounded-circle btn-danger" title="YouTube">
                            <LuYoutube className="fs-xl" />
                        </Link>
                    </div>
                </div>
                <h4 className="card-title mb-3 mt-4">Skills</h4>
                <div className="d-flex flex-wrap gap-1">
                    <Button variant='light' size='sm'>Product Design</Button>
                    <Button variant='light' size='sm'>UI/UX</Button>
                    <Button variant='light' size='sm'>Tailwind CSS</Button>
                    <Button variant='light' size='sm'>Bootstrap</Button>
                    <Button variant='light' size='sm'>React.js</Button>
                    <Button variant='light' size='sm'>Next.js</Button>
                    <Button variant='light' size='sm'>Vue.js</Button>
                    <Button variant='light' size='sm'>Figma</Button>
                    <Button variant='light' size='sm'>Design Systems</Button>
                    <Button variant='light' size='sm'>Template Authoring</Button>
                    <Button variant='light' size='sm'>Responsive Design</Button>
                    <Button variant='light' size='sm'>Component Libraries</Button>
                </div>
            </CardBody>
        </Card>
    )
}

export default Profile