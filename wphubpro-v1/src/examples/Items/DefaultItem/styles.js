function defaultItemIconBox(theme, ownerState) {
  const { functions, palette, borders } = theme;
  const { color } = ownerState;

  const { pxToRem, linearGradient, rgba } = functions;
  const { gradients } = palette;
  const { borderRadius } = borders;

  // Use same gradient as star for info/primary/secondary (icons on white)
  const useGradient = ["info", "primary", "secondary"].includes(color) && gradients.info;

  return {
    display: "grid",
    placeItems: "center",
    width: pxToRem(48),
    height: pxToRem(48),
    borderRadius: borderRadius.md,
    ...(useGradient
      ? {
          background: linearGradient(gradients.info.main, gradients.info.state),
        }
      : {
          backgroundColor: gradients[color]
            ? rgba(gradients[color].main, 0.03)
            : rgba(gradients.info.main, 0.03),
        }),
  };
}

function defaultItemIcon(theme, ownerState) {
  const { functions, palette } = theme;
  const { color } = ownerState;

  const { linearGradient } = functions;
  const { gradients, transparent, white } = palette;

  // Use same gradient as star for info/primary/secondary; white icon on gradient box
  const useGradient = ["info", "primary", "secondary"].includes(color) && gradients[color];

  return useGradient
    ? {
        color: white.main,
      }
    : {
        backgroundImage: gradients[color]
          ? linearGradient(gradients[color].main, gradients[color].state)
          : linearGradient(gradients.info.main, gradients.info.state),
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: transparent.main,
      };
}

export { defaultItemIconBox, defaultItemIcon };
