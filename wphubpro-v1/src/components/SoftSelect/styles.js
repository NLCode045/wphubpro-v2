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
// Soft UI Dashboard PRO React base styles
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import borders from "assets/theme/base/borders";
import boxShadows from "assets/theme/base/boxShadows";

// Soft UI Dashboard PRO React helper functions
import pxToRem from "assets/theme/functions/pxToRem";
import boxShadow from "assets/theme/functions/boxShadow";

// @emotion/react components
import { keyframes } from "@emotion/react";

export default (selectSize, selectError, selectSuccess) => {
  const { dark, white, text, light, inputColors, gradients, transparent } = colors;
  const { size, fontWeightRegular } = typography;
  const { borderWidth, borderRadius } = borders;
  const { inputBoxShadow, lg } = boxShadows;

  let borderColorValue;
  let borderColorFocused;
  let boxShadowValue;
  let selectSizeValue;

  if (selectError) {
    borderColorValue = inputColors.error;
    borderColorFocused = inputColors.error;
  } else if (selectSuccess) {
    borderColorValue = inputColors.success;
    borderColorFocused = inputColors.success;
  } else {
    borderColorValue = inputColors.borderColor.main;
    borderColorFocused = inputColors.borderColor.focus;
  }

  if (selectError) {
    boxShadowValue = inputBoxShadow.error;
  } else if (selectSuccess) {
    boxShadowValue = inputBoxShadow.success;
  } else {
    boxShadowValue = boxShadow([0, 0], [0, 2], inputColors.boxShadow, 1);
  }

  if (selectSize === "small") {
    selectSizeValue = pxToRem(32);
  } else if (selectSize === "large") {
    selectSizeValue = pxToRem(48);
  } else {
    selectSizeValue = pxToRem(40);
  }

  // animations
  const prespective = keyframes`
    from {
      opacity: 0;
      transform: perspective(999px) rotateX(-10deg) translateZ(0) translate3d(0, 0, 0);
    }
    to {
      opacity: 1;
      transform: perspective(999px) rotateX(0deg) translateZ(0) translate3d(0, 0, 5px);
    }
  `;

  return {
    control: (provided, state) => ({
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: selectSizeValue,
      padding: 0,
      fontSize: selectSize === "small" ? size.xs : size.sm,
      fontWeight: fontWeightRegular,
      backgroundColor: transparent.main,
      backgroundClip: "padding-box",
      border: `${borderWidth[1]} solid ${inputColors.borderColor.main}`,
      appearance: "none",
      borderRadius: borderRadius.md,
      transition: "box-shadow 150ms ease, border-color 150ms ease",
      cursor: "pointer",
      borderColor: state.isFocused ? borderColorFocused : borderColorValue,
      boxShadow: state.isFocused ? boxShadowValue : "none",
    }),

    valueContainer: () => ({
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: "max-content",
      padding: `0 ${pxToRem(12)}`,
      color: dark.main,
    }),

    placeholder: () => ({
      position: "absolute",
      top: selectSize === "small" ? "52%" : "51%",
      transform: "translateY(-50%)",
      marginLeft: 0,
      marginRight: 0,
      color: dark.main,
      opacity: 0.5,
    }),

    singleValue: () => ({
      position: "absolute",
      top: selectSize === "small" ? "52%" : "51%",
      transform: "translateY(-50%)",
      color: text.main,
    }),

    input: () => ({
      color: dark.main,
      position: "relative",
      margin: 0,
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    dropdownIndicator: (provided, state) => ({
      display: "flex",
      padding: pxToRem(12),

      "& svg": {
        fill: text.main,
        width: pxToRem(14),
        height: pxToRem(14),
        strokeWidth: 1,
        stroke: text.main,
        transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0)",
        transition: "transform 250ms ease",
      },
    }),

    menu: (provided) => ({
      ...provided,
      minWidth: "auto",
      width: "auto",
      maxWidth: pxToRem(280),
      boxShadow: lg,
      padding: `${pxToRem(8)} ${pxToRem(4)}`,
      fontSize: size.sm,
      color: text.main,
      textAlign: "left",
      backgroundColor: white.main,
      borderRadius: borderRadius.md,
      transformOrigin: "50% 0",
      animation: `${prespective} 250ms ease forwards !important`,
      zIndex: 1300,
    }),

    menuPortal: (provided) => ({
      ...provided,
      zIndex: 1300,
    }),

    menuList: (provided) => ({
      ...provided,
      padding: 0,
      maxHeight: pxToRem(220),
      overflowY: "auto",
    }),

    option: (provided, state) => ({
      ...provided,
      position: "relative",
      minWidth: "unset",
      minHeight: "unset",
      padding: `${pxToRem(6)} ${pxToRem(12)}`,
      borderRadius: borderRadius.md,
      fontSize: size.sm,
      color: text.main,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.5 : 1,
      userSelect: state.isDisabled ? "none" : "auto",
      transition: "background-color 300ms ease, color 300ms ease",
      whiteSpace: "nowrap",

      "&:hover, &:focus": {
        backgroundColor: state.isDisabled ? transparent.main : light.main,
        color: state.isDisabled ? "currentColor" : dark.main,
      },
    }),

    multiValue: (provided) => ({
      ...provided,
      margin: 0,
      marginRight: pxToRem(4),
      borderRadius: borderRadius.section,
      display: "flex",
      alignItems: "center",
      backgroundColor: gradients.dark.state,
      color: white.main,
      padding: `${pxToRem(2)} 0 ${pxToRem(2)} ${pxToRem(4)}`,

      "& div:first-of-type": {
        color: white.main,
        paddingTop: pxToRem(4),
        paddingBottom: pxToRem(2),
      },

      "& div:last-of-type": {
        paddingTop: pxToRem(1.5),
        opacity: 0.8,

        "&:hover": {
          backgroundColor: transparent.main,
          color: white.main,
        },
      },
    }),
  };
};
