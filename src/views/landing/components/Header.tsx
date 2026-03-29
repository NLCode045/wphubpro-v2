import { ROUTE_PATHS } from '@/config/routePaths'
import { useLayoutContext } from '@/context/useLayoutContext'
import { Link } from "react-router";
import { useEffect, useState } from 'react'
import { Button, Container, Navbar, NavbarBrand, NavbarCollapse, NavbarToggle, NavLink } from 'react-bootstrap'
import { TbContrast } from 'react-icons/tb'

import logo from '@/assets/images/logo.png'

const navItems = ['Home', 'Services', 'Features', 'Plans', 'Reviews', 'Contact']

export default function Header() {
    const { theme, changeTheme } = useLayoutContext()

    const [activeSection, setActiveSection] = useState("Home");

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;

            for (let section of navItems) {
                const element = document.getElementById(section.toLowerCase());
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (
                        scrollPosition >= offsetTop &&
                        scrollPosition < offsetTop + offsetHeight
                    ) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll(); 

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);


    const toggleTheme = () => {
        if (theme === 'dark') {
            changeTheme('light')
            return
        }
        changeTheme('dark')
        return
    }
    const [isCollapsed, setIsCollapsed] = useState(true)

    return (
        <header>
            <Navbar expand="lg" className={`py-2 sticky-top top-fixed`} id="landing-navbar">
                <Container>
                    <NavbarBrand className="auth-brand mb-0">
                        <Link to="/" className="logo-dark">
                            <img src={logo} alt="dark logo" height="24" />
                        </Link>
                        <Link to="/" className="logo-light">
                            <img src={logo} alt="logo" height="24" />
                        </Link>
                    </NavbarBrand>

                    <NavbarToggle aria-controls="navbarSupportedContent" onClick={() => setIsCollapsed(!isCollapsed)} />
                    <NavbarCollapse in={!isCollapsed} id="navbarSupportedContent">
                        <ul className="navbar-nav text-uppercase fw-bold gap-2 fs-sm mx-auto mt-2 mt-lg-0" id="navbar-example">
                            {navItems.map((item, idx) => (
                                <li className="nav-item" key={idx}>
                                    <NavLink className={`nav-link fs-xs ${activeSection == item ? "active" : ""}`} href={`#${item.toLowerCase()}`}>
                                        {item}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                        <div>
                            <Button variant="link" className="btn-link btn-icon fw-semibold nav-link me-2" type="button" onClick={toggleTheme} id="theme-toggle">
                                <TbContrast className="fs-22" />
                            </Button>
                            <Link to={ROUTE_PATHS.REGISTER} className="btn btn-sm btn-light">
                                Try for Free
                            </Link>
                        </div>
                    </NavbarCollapse>
                </Container>
            </Navbar>
        </header>
    )
}
