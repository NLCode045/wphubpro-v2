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

// @mui material components
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";

export default styled(Button)(({ theme, ownerState }) => {
  const { palette, functions } = theme;
  const { color, size, iconOnly, circular } = ownerState;

  const { white, socialMediaColors } = palette;
  const { pxToRem } = functions;

  // backgroundColor value
  const backgroundColorValue = socialMediaColors[color]
    ? socialMediaColors[color].main
    : socialMediaColors.facebook.main;

  // styles for the button with circular={true}
  const circularStyles = () => ({
    borderRadius: "50%",
  });

  // styles for the button with iconOnly={true}
  const iconOnlyStyles = () => {
    // width, height, minWidth and minHeight values
    let sizeValue = pxToRem(38);

    if (size === "small") {
      sizeValue = pxToRem(25.4);
    } else if (size === "large") {
      sizeValue = pxToRem(52);
    }

    // padding value
    let paddingValue = `${pxToRem(11)} ${pxToRem(11)} ${pxToRem(10)}`;

    if (size === "small") {
      paddingValue = pxToRem(4.5);
    } else if (size === "large") {
      paddingValue = pxToRem(16);
    }

    return {
      width: sizeValue,
      minWidth: sizeValue,
      height: sizeValue,
      minHeight: sizeValue,
      padding: paddingValue,
    };
  };

  return {
    backgroundColor: backgroundColorValue,
    color: white.main,
    boxShadow: "4px 4px 10px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.8)",
    transition: "box-shadow 0.2s ease",

    "&:hover": {
      backgroundColor: backgroundColorValue,
      boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.12)",
    },
    "&:active": {
      boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.15)",
    },

    "&:focus:not(:hover)": {
      backgroundColor: socialMediaColors[color]
        ? socialMediaColors[color].dark
        : socialMediaColors.facebook.dark,
      boxShadow: "none",
    },

    "&:disabled": {
      backgroundColor: backgroundColorValue,
      color: white.main,
    },

    ...(circular && circularStyles()),
    ...(iconOnly && iconOnlyStyles()),
  };
});
