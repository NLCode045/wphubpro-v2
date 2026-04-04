import React from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox: React.FC<CheckboxProps> = ({ className = "", ...props }) => {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded border-input text-primary focus:ring-primary/40 ${className}`}
      {...props}
    />
  );
};

export default Checkbox;
