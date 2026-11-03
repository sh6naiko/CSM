import React from "react";

export function ProgressBar({
  value = 0,
  label,
  className = "",
  fillClassName = "",
  fillAs: Fill = "span",
}) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={className}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <Fill
        className={fillClassName || undefined}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
