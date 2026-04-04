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

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";

// Soft UI Dashboard PRO React base styles
import colors from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

function DataTableHeadCell({ width = "auto", children, sorted = "none", align = "left", color, pl, ...rest }) {
  const { light } = colors;
  const { borderWidth } = borders;

  return (
    <SoftBox
      component="th"
      width={width}
      borderBottom={`${borderWidth[1]} solid ${light.main}`}
      py={1.5}
      px={pl === undefined ? 3 : undefined}
      pl={pl}
      pr={pl !== undefined ? 3 : undefined}
    >
      <SoftBox
        {...rest}
        position="relative"
        display="flex"
        alignItems="flex-start"
        textAlign={align}
        color="secondary"
        opacity={0.7}
        minHeight={0}
        sx={({ typography: { size, fontWeightBold } }) => ({
          fontSize: size.xxs,
          fontWeight: fontWeightBold,
          textTransform: "uppercase",
          lineHeight: 1,
          cursor: sorted && "pointer",
          userSelect: sorted && "none",
          justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
          ...(align !== "left" && { width: "100%" }),
          ...(color && { color }),
        })}
      >
        {children}
        {sorted && (
          <SoftBox
            position="absolute"
            top={-6}
            right={align !== "right" ? "16px" : 0}
            left={align === "right" ? "-5px" : "unset"}
            sx={{ fontSize: "1.75rem" }}
          >
            <SoftBox
              position="absolute"
              top={-6}
              sx={{
                color: colors.success.main,
                opacity: sorted === "asce" ? 1 : 0.5,
              }}
            >
              <Icon sx={{ fontSize: "inherit" }}>arrow_drop_up</Icon>
            </SoftBox>
            <SoftBox
              position="absolute"
              top={0}
              sx={{
                color: colors.success.main,
                opacity: sorted === "desc" ? 1 : 0.5,
              }}
            >
              <Icon sx={{ fontSize: "inherit" }}>arrow_drop_down</Icon>
            </SoftBox>
          </SoftBox>
        )}
      </SoftBox>
    </SoftBox>
  );
}


// Typechecking props for the DataTableHeadCell
DataTableHeadCell.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  children: PropTypes.node.isRequired,
  sorted: PropTypes.oneOf([false, "none", "asce", "desc"]),
  align: PropTypes.oneOf(["left", "right", "center"]),
};

export default DataTableHeadCell;
