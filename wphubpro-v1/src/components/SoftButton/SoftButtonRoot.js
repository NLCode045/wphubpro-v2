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
  const { palette, functions, borders } = theme;
  const { color, variant, size, circular, iconOnly } = ownerState;

  const { white, dark, text, transparent, gradients } = palette;
  const { boxShadow, linearGradient, pxToRem, rgba } = functions;
  const { borderRadius } = borders;

  // styles for the button with variant="contained"
  const containedStyles = () => {
    // background: gradient for info/primary/secondary (same as star icon)
    const useGradient = ["info", "primary", "secondary"].includes(color) && gradients[color];
    const backgroundValue = useGradient
      ? linearGradient(gradients[color].main, gradients[color].state)
      : palette[color]
        ? palette[color].main
        : white.main;

    // backgroundColor value when button is focused
    const focusedBackgroundValue = palette[color] ? palette[color].focus : white.focus;

    // boxShadow value
    const boxShadowValue = palette[color]
      ? boxShadow([0, 0], [0, 3.2], palette[color].main, 0.5)
      : boxShadow([0, 0], [0, 3.2], dark.main, 0.5);

    // color value
    let colorValue = white.main;

    if (color === "white" || !palette[color]) {
      colorValue = text.main;
    } else if (color === "light") {
      colorValue = gradients.dark.state;
    }

    // color value when button is focused
    let focusedColorValue = white.main;

    if (color === "white") {
      focusedColorValue = text.main;
    } else if (color === "primary" || color === "error" || color === "dark") {
      focusedColorValue = white.main;
    }

    return {
      background: backgroundValue,
      color: colorValue,
      boxShadow: "4px 4px 10px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.8)",
      transition: "box-shadow 0.2s ease",
      "& .material-icons-round, & .material-icons, & .MuiIcon-root, & .MuiSvgIcon-root, & svg": {
        color: `${colorValue} !important`,
      },
      "&:hover": {
        background: useGradient ? backgroundValue : undefined,
        backgroundColor: useGradient ? undefined : backgroundValue,
        opacity: useGradient ? 0.9 : undefined,
        boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.12)",
      },
      "&:active": {
        boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.15)",
      },
      "&:focus:not(:hover)": {
        background: useGradient ? backgroundValue : undefined,
        backgroundColor: useGradient ? undefined : focusedBackgroundValue,
        boxShadow: boxShadowValue,
      },

      "&:disabled": {
        background: backgroundValue,
        color: focusedColorValue,
      },
    };
  };

  // styles for the button with variant="outlined" (reversed buttons: orange background, white text)
  const outliedStyles = () => {
    const success = palette.success;
    const successBg = linearGradient(gradients.success.main, gradients.success.state);
    const boxShadowValue = boxShadow([0, 0], [0, 3.2], success.main, 0.5);

    return {
      background: successBg,
      color: white.main,
      borderColor: success.main,
      boxShadow: "4px 4px 10px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.8)",
      transition: "box-shadow 0.2s ease",
      "& .material-icons-round, & .material-icons, & .MuiIcon-root, & .MuiSvgIcon-root, & svg": {
        color: `${white.main} !important`,
      },
      "&:hover": {
        background: successBg,
        borderColor: success.focus,
        opacity: 0.9,
        boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.12)",
      },
      "&:active": {
        boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.15)",
      },
      "&:focus:not(:hover)": {
        background: successBg,
        boxShadow: boxShadowValue,
      },

      "&:disabled": {
        background: successBg,
        color: white.main,
        borderColor: success.main,
        opacity: 0.65,
      },
    };
  };

  // styles for the button with variant="gradient"
  const gradientStyles = () => {
    const backgroundValue =
      color === "white" || !gradients[color]
        ? white.main
        : linearGradient(gradients[color].main, gradients[color].state);

    let colorValue = white.main;
    if (color === "white") {
      colorValue = text.main;
    } else if (color === "light") {
      colorValue = gradients.dark.state;
    }

    return {
      background: backgroundValue,
      color: colorValue,
      boxShadow: "4px 4px 10px rgba(0,0,0,0.12), -2px -2px 6px rgba(255,255,255,0.8)",
      transition: "box-shadow 0.2s ease",
      "& .material-icons-round, & .material-icons, & .MuiIcon-root, & .MuiSvgIcon-root, & svg": {
        color: `${colorValue} !important`,
      },
      "&:hover": {
        boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.12)",
      },
      "&:active": {
        boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.15)",
      },
      "&:focus:not(:hover)": { boxShadow: "none" },
      "&:disabled": { background: backgroundValue, color: colorValue },
    };
  };

  // styles for the button with variant="text"
  const textStyles = () => {
    // color value
    const colorValue = palette[color] ? palette[color].main : white.main;

    // color value when button is focused
    const focusedColorValue = palette[color] ? palette[color].focus : white.focus;

    return {
      color: colorValue,

      "&:hover": {
        color: focusedColorValue,
      },

      "&:focus:not(:hover)": {
        color: focusedColorValue,
      },
    };
  };

  // styles for the button with circular={true}
  const circularStyles = () => ({
    borderRadius: borderRadius.section,
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

      "& .material-icons": {
        marginTop: 0,
      },

      "&:hover, &:focus, &:active": {
        transform: "none",
      },
    };
  };

  return {
    ...(variant === "contained" && containedStyles()),
    ...(variant === "outlined" && outliedStyles()),
    ...(variant === "gradient" && gradientStyles()),
    ...(variant === "text" && textStyles()),
    ...(circular && circularStyles()),
    ...(iconOnly && iconOnlyStyles()),
  };
});
