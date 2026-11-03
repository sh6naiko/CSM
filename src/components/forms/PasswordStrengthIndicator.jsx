import { measurePasswordStrength } from "../../utils/passwords.js";
import React from "react";
export function PasswordStrengthIndicator({ password }) {
  const result = measurePasswordStrength(password);
  return (
    <div
      className={`csm-password-strength is-${result.strength}`}
      aria-live="polite"
    >
      <div className="csm-password-strength-top">
        <span>Password strength</span>
        <strong>{result.label}</strong>
      </div>
      <div className="csm-password-strength-meter" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>{result.advice}</p>
    </div>
  );
}
