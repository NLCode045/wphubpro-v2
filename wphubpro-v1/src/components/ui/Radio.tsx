import React from "react";

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Radio: React.FC<RadioProps> = ({ className = "", ...props }) => {
  return (
    <input
      type="radio"
      className={`h-4 w-4 rounded border-input text-primary focus:ring-primary/40 ${className}`}
      {...props}
    />
  );
};

export default Radio;
