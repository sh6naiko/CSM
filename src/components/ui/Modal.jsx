import React from "react";

/** Shared dialog frame. The caller owns visibility, dismissal and async state. */
export function Modal({
  children,
  className,
  backdropClassName = "",
  titleId,
  descriptionId,
  onClose,
  busy = false,
  role = "dialog",
}) {
  return (
    <div
      className={`csm-modal-backdrop ${backdropClassName}`.trim()}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        className={className}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
