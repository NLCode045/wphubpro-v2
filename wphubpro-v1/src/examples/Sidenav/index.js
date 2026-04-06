/**
=========================================================
* Soft UI Dashboard PRO React - v4.0.3
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-pro-react
* Copyright 2024 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useEffect, useState } from "react";

// react-router-dom components
import { useLocation, NavLink } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard PRO React example components
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";
import SidenavList from "examples/Sidenav/SidenavList";
import SidenavItem from "examples/Sidenav/SidenavItem";
import SidenavUserCard from "examples/Sidenav/SidenavUserCard";
import SidenavBridgeCard from "examples/Sidenav/SidenavBridgeCard";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

// Soft UI Dashboard PRO React context
import { useSoftUIController, setMiniSidenav } from "context";

function Sidenav({ color = "info", brand = "", brandName, userRoutes = [], adminRoutes = [], isAdmin = false, routes, ...rest }) {
  const [openCollapse, setOpenCollapse] = useState(false);
  const [openNestedCollapse, setOpenNestedCollapse] = useState(false);
  const [controller, dispatch] = useSoftUIController();
  const { miniSidenav, transparentSidenav } = controller;
  const location = useLocation();
  const { pathname } = location;
  const displayRoutes =
    userRoutes.length || adminRoutes.length
      ? [
          ...(userRoutes.length ? [{ type: "title", title: "User", key: "user-title" }, ...userRoutes] : []),
          ...(isAdmin && adminRoutes.length ? [{ type: "divider", key: "menu-divider" }, { type: "title", title: "Admin", key: "admin-title" }, ...adminRoutes] : []),
        ]
      : routes;

  const isRouteActive = (route) =>
    route && (pathname === route || pathname.startsWith(route + "/"));

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  // Render all the nested collapse items from the routes.js
  const renderNestedCollapse = (collapse, submenuColor) => {
    const template = collapse.map(({ name, route, key, href }) =>
      href ? (
        <Link
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          sx={{ textDecoration: "none" }}
        >
          <SidenavItem name={name} nested submenuColor={submenuColor} />
        </Link>
      ) : (
        <NavLink to={route} key={key} sx={{ textDecoration: "none" }}>
          <SidenavItem name={name} active={isRouteActive(route)} nested submenuColor={submenuColor} />
        </NavLink>
      )
    );

    return template;
  };

  // Render the all the collpases from the routes.js
  const renderCollapse = (collapses, submenuColor) =>
    collapses.map(({ name, collapse, route, href, key }) => {
      let returnValue;

      if (collapse) {
        const childActive = collapse.some((c) => isRouteActive(c.route));
        returnValue = (
          <SidenavItem
            key={key}
            name={name}
            active={childActive}
            open={openNestedCollapse === name}
            onClick={() =>
              openNestedCollapse === name
                ? setOpenNestedCollapse(false)
                : setOpenNestedCollapse(name)
            }
          >
            {renderNestedCollapse(collapse, submenuColor)}
          </SidenavItem>
        );
      } else {
        returnValue = href ? (
          <Link
            href={href}
            key={key}
            target="_blank"
            rel="noreferrer"
            sx={{ textDecoration: "none" }}
          >
            <SidenavItem name={name} active={false} />
          </Link>
        ) : (
          <NavLink to={route} key={key} sx={{ textDecoration: "none" }}>
            <SidenavItem name={name} active={isRouteActive(route)} />
          </NavLink>
        );
      }
      return <SidenavList key={key}>{returnValue}</SidenavList>;
    });

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = (displayRoutes || []).map(
    ({ type, name, icon, title, collapse, noCollapse, key, href, route, submenuColor }) => {
      let returnValue;

      if (type === "collapse") {
        if (href) {
          returnValue = (
          <Link
            href={href}
            key={key}
            target="_blank"
            rel="noreferrer"
            sx={{ textDecoration: "none" }}
          >
            <SidenavCollapse
              name={name}
              icon={icon}
              active={false}
              noCollapse={noCollapse}
            />
          </Link>
          );
        } else if (noCollapse && route) {
          returnValue = (
            <NavLink to={route} key={key}>
              <SidenavCollapse
                name={name}
                icon={icon}
                noCollapse={noCollapse}
                active={isRouteActive(route)}
              >
                {collapse ? renderCollapse(collapse, submenuColor) : null}
              </SidenavCollapse>
            </NavLink>
          );
        } else {
          const childActive = collapse && collapse.some((c) => isRouteActive(c.route));
          returnValue = (
            <SidenavCollapse
              key={key}
              name={name}
              icon={icon}
              active={childActive}
              open={openCollapse === key}
              onClick={() => (openCollapse === key ? setOpenCollapse(false) : setOpenCollapse(key))}
            >
              {collapse ? renderCollapse(collapse, submenuColor) : null}
            </SidenavCollapse>
          );
        }
      } else if (type === "title") {
        returnValue = (
          <SoftTypography
            key={key}
            display="block"
            variant="caption"
            fontWeight="bold"
            textTransform="uppercase"
            opacity={0.6}
            pl={3}
            mt={2}
            mb={1}
            ml={1}
          >
            {title}
          </SoftTypography>
        );
      } else if (type === "divider") {
        returnValue = <Divider key={key} />;
      }

      return returnValue;
    }
  );

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);

  return (
    <SidenavRoot {...rest} variant="permanent" ownerState={{ transparentSidenav, miniSidenav }}>
      <SoftBox pt={3} pb={1} px={2} display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <SoftBox
          component={NavLink}
          to="/"
          display="flex"
          alignItems="center"
          flex={1}
          minWidth={0}
          sx={{ textDecoration: "none" }}
        >
          {brand && <SoftBox component="img" src={brand} alt="Logo" width="2rem" flexShrink={0} />}
          <SoftBox
            width={!brandName && "100%"}
            sx={(theme) => sidenavLogoLabel(theme, { miniSidenav })}
          >
            <SoftTypography component="h6" variant="button" fontWeight="medium">
              {brandName}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
        <SoftBox
          onClick={handleMiniSidenav}
          sx={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0, p: 0.5, color: "#4F5482" }}
        >
          <Icon sx={{ fontWeight: "bold", fontSize: "1.25rem", color: "#4F5482" }}>
            {miniSidenav ? "menu" : "menu_open"}
          </Icon>
        </SoftBox>
      </SoftBox>
      <Divider />
      <SoftBox display="flex" flexDirection="column" pb={3} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <List
          className="sidenav-scroll"
          sx={{
            flex: 1,
            overflow: "auto",
            overflowX: miniSidenav ? "hidden" : undefined,
            minHeight: 0,
            "& .MuiListItem-root": { marginBottom: 1 },
          }}
        >
          {renderRoutes}
        </List>
        <SidenavBridgeCard />
        <SidenavUserCard />
      </SoftBox>
    </SidenavRoot>
  );
}


// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  userRoutes: PropTypes.arrayOf(PropTypes.object),
  adminRoutes: PropTypes.arrayOf(PropTypes.object),
  isAdmin: PropTypes.bool,
  routes: PropTypes.arrayOf(PropTypes.object),
};

export default Sidenav;
