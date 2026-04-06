import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-card rounded-lg border border-border shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`p-4 sm:p-6 border-b border-border ${className}`}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<CardProps> = ({
  children,
  className = "",
}) => {
  return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
};

export const CardTitle: React.FC<
  CardProps & { as?: "h1" | "h2" | "h3" | "h4" }
> = ({ children, className = "", as: Component = "h3" }) => {
  return (
    <Component
      className={`text-lg font-semibold leading-none tracking-tight text-foreground ${className}`}
    >
      {children}
    </Component>
  );
};

export const CardDescription: React.FC<CardProps> = ({
  children,
  className = "",
}) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
  );
};

export default Card;
