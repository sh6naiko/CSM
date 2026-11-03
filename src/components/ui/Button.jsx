import React, { forwardRef } from "react";

const variants = {
  primary: "csm-primary-button",
  secondary: "csm-secondary-button",
  danger: "csm-danger-button",
};

/** Common button styling; native attributes and events pass through unchanged. */
export const Button = forwardRef(function Button(
  {
    variant = "secondary",
    type = "button",
    className = "",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${variants[variant] || ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
});
