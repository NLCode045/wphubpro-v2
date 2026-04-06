import React from "react";
import { createPortal } from "react-dom";
import Box from "@mui/material/Box";
import { useToast } from "../../contexts/ToastContext";
import Toast from "./Toast";

const Toaster: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  const content = (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 16, sm: 24 },
        bottom: { xs: 16, sm: 24 },
        left: "auto",
        top: "auto",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1.25,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        overflowX: "hidden",
        pointerEvents: "none",
        "& > *": {
          pointerEvents: "auto",
        },
        // Hide scrollbar but keep scroll for many toasts
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(0,0,0,0.15)",
          borderRadius: 2,
        },
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </Box>
  );

  return createPortal(content, document.body);
};

export default Toaster;
