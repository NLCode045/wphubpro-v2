import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
  asChild?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variantClasses = {
    default: "bg-primary text-white hover:opacity-95",
    destructive: "bg-red-600 text-white hover:opacity-95",
    outline:
      "border border-input bg-background text-foreground hover:bg-accent",
    secondary: "bg-slate-100 text-foreground hover:opacity-95",
    ghost: "bg-transparent text-foreground hover:bg-slate-50",
    link: "bg-transparent text-primary underline-offset-4 hover:underline",
  };

  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10 p-0",
  };

  const classes =
    `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ""}`.trim();

  if (asChild) {
    const { children, ...restProps } = props;
    const child = React.Children.only(children);
    if (!React.isValidElement(child)) {
      return null;
    }

    // FIX: Cast `child` to `React.ReactElement<any>` to resolve TypeScript errors.
    // TypeScript can't infer the props of an arbitrary child element, so we cast it to `any`
    // to safely pass down props via `cloneElement` and access `className`.
    const element = child as React.ReactElement<any>;
    return React.cloneElement(element, {
      ...restProps,
      className: [classes, element.props.className].filter(Boolean).join(" "),
    });
  }

  return <button className={classes} {...props} />;
};

export default Button;
