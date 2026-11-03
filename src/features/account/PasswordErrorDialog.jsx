import React from "react";
export function PasswordErrorDialog({
  passwordErrorModal,
  setPasswordErrorModal,
}) {
  return (
    <div
      className="csm-modal-backdrop csm-password-error-backdrop"
      role="presentation"
      onClick={() => setPasswordErrorModal(null)}
    >
      <section
        className="csm-password-error-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="password-error-title"
        aria-describedby="password-error-copy"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="csm-password-error-icon" aria-hidden="true">
          !
        </span>
        <span className="csm-kicker">PASSWORD NOT UPDATED</span>
        <h2 id="password-error-title">{passwordErrorModal.title}</h2>
        <p id="password-error-copy">{passwordErrorModal.message}</p>
        <button
          type="button"
          className="csm-primary-button"
          onClick={() => setPasswordErrorModal(null)}
        >
          Try again
        </button>
      </section>
    </div>
  );
}
