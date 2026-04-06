import React, { useEffect } from "react";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import { useToast, ToastProps } from "../../contexts/ToastContext";

const slideInFromRight = keyframes`
  from {
    opacity: 0;
    transform: translate3d(calc(100% + 20px), 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

const variantStyles = {
  success: {
    bg: "#e8f5e9",
    border: "#a5d6a7",
    title: "#1b5e20",
    body: "#2e7d32",
    icon: "#2e7d32",
    closeHover: "rgba(27, 94, 32, 0.08)",
  },
  destructive: {
    bg: "#ffebee",
    border: "#ef9a9a",
    title: "#b71c1c",
    body: "#c62828",
    icon: "#c62828",
    closeHover: "rgba(183, 28, 28, 0.08)",
  },
  default: {
    bg: "#f1f5f9",
    border: "#cbd5e1",
    title: "#0f172a",
    body: "#475569",
    icon: "#475569",
    closeHover: "rgba(15, 23, 42, 0.06)",
  },
} as const;

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  description,
  variant = "default",
}) => {
  const { dismiss } = useToast();
  const v = variant === "success" || variant === "destructive" ? variant : "default";

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  const s = variantStyles[v];

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 56,
        maxWidth: 400,
        width: "min(100vw - 32px, 400px)",
        px: 2,
        py: 1.5,
        bgcolor: s.bg,
        color: s.title,
        border: `1px solid ${s.border}`,
        borderRadius: 2,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)",
        overflow: "hidden",
        animation: `${slideInFromRight} 0.42s cubic-bezier(0.22, 1, 0.36, 1) both`,
      }}
    >
      <Box display="flex" alignItems="flex-start" flex={1} gap={1.5} minWidth={0}>
        <Icon sx={{ fontSize: 22, mt: 0.25, color: s.icon, flexShrink: 0 }}>
          {variant === "success" ? "check_circle" : variant === "destructive" ? "error" : "info"}
        </Icon>
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" fontWeight={700} sx={{ color: s.title, lineHeight: 1.35 }}>
            {title}
          </Typography>
          {description && (
            <Typography
              variant="caption"
              sx={{
                color: s.body,
                display: "block",
                mt: 0.35,
                lineHeight: 1.45,
                fontWeight: 500,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      <IconButton
        size="small"
        onClick={() => dismiss(id)}
        sx={{
          color: s.icon,
          opacity: 0.75,
          flexShrink: 0,
          "&:hover": { opacity: 1, bgcolor: s.closeHover },
        }}
        aria-label="Dismiss"
      >
        <Icon sx={{ fontSize: 18 }}>close</Icon>
      </IconButton>
    </Box>
  );
};

export default Toast;
