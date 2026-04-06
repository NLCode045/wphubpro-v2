import React from "react";
import { cn } from "../../lib/utils";

const alertVariantClasses: Record<string, string> = {
  default: "bg-background text-foreground",
  success: "border-orange-500/50 bg-orange-500/10 text-orange-900 dark:text-orange-100",
  warning: "border-yellow-500/50 bg-yellow-500/10 text-yellow-900 dark:text-yellow-100",
  error: "border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-100",
  info: "border-blue-500/50 bg-blue-500/10 text-blue-900 dark:text-blue-100",
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4",
        alertVariantClasses[variant] ?? alertVariantClasses.default,
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

export default Alert;
