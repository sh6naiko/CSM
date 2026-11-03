import { PasswordStrengthIndicator } from "../../components/forms/PasswordStrengthIndicator.jsx";
import React from "react";
export function PasswordResetDialog({
  confirmPasswordDraft,
  currentPasswordDraft,
  handleChangePassword,
  newPasswordDraft,
  setConfirmPasswordDraft,
  setCurrentPasswordDraft,
  setNewPasswordDraft,
  setPasswordResetModalOpen,
}) {
  return (
    <div
      className="csm-modal-backdrop"
      role="presentation"
      onClick={() => setPasswordResetModalOpen(false)}
    >
      <form
        className="csm-password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-reset-title"
        onSubmit={handleChangePassword}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csm-password-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="10" width="16" height="11" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v3" />
          </svg>
        </div>
        <span className="csm-kicker">PASSWORD RESET</span>
        <h2 id="password-reset-title">Change password</h2>
        <p>Confirm your current password, then choose a new one.</p>
        <input
          className="csm-password-input"
          type="password"
          autoComplete="current-password"
          aria-label="Current password"
          required
          minLength={8}
          maxLength={72}
          placeholder="Current password"
          value={currentPasswordDraft}
          onChange={(event) => setCurrentPasswordDraft(event.target.value)}
        />
        <input
          className="csm-password-input"
          type="password"
          autoComplete="new-password"
          aria-label="New password (8–72 characters)"
          required
          minLength={8}
          maxLength={72}
          placeholder="New password (8–72 characters)"
          value={newPasswordDraft}
          onChange={(event) => setNewPasswordDraft(event.target.value)}
        />
        {newPasswordDraft && (
          <PasswordStrengthIndicator password={newPasswordDraft} />
        )}
        <input
          className="csm-password-input"
          type="password"
          autoComplete="new-password"
          aria-label="Confirm new password"
          required
          minLength={8}
          maxLength={72}
          placeholder="Confirm new password"
          value={confirmPasswordDraft}
          onChange={(event) => setConfirmPasswordDraft(event.target.value)}
        />
        <div className="csm-password-actions">
          <button type="submit" className="csm-primary-button">
            Update password
          </button>
          <button
            type="button"
            className="csm-secondary-button"
            onClick={() => setPasswordResetModalOpen(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
