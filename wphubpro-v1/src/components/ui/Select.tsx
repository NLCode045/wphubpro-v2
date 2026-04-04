import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <select
      className={`block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export default Select;
