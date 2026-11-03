import { CSM } from "../../services/client.js";
import React from "react";
export function SignOutDialog({
  setSignOutBusy,
  setSignOutConfirmationOpen,
  setSignOutError,
  signOutBusy,
  signOutError,
}) {
  return (
    <div
      className="csm-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!signOutBusy) setSignOutConfirmationOpen(false);
      }}
    >
      <div
        className="csm-signout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-confirmation-title"
        aria-describedby="signout-confirmation-copy"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="csm-signout-close"
          aria-label="Close sign-out confirmation"
          disabled={signOutBusy}
          onClick={() => setSignOutConfirmationOpen(false)}
        >
          ×
        </button>
        <div className="csm-signout-warning" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 17l5-5-5-5M15 12H3" />
            <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
          </svg>
        </div>
        <h2 id="signout-confirmation-title">
          Are you sure you want to sign out?
        </h2>
        <p id="signout-confirmation-copy">
          You’ll need to sign in again to access your workspace.
        </p>
        {signOutError && (
          <p className="csm-signout-error" role="alert">
            {signOutError}
          </p>
        )}
        <div className="csm-signout-actions">
          <button
            type="button"
            className="csm-secondary-button"
            disabled={signOutBusy}
            onClick={() => setSignOutConfirmationOpen(false)}
          >
            No, cancel
          </button>
          <button
            type="button"
            className="csm-signout-danger-button"
            disabled={signOutBusy}
            onClick={async () => {
              setSignOutBusy(true);
              setSignOutError("");
              const controller = new AbortController();
              const timeoutId = window.setTimeout(
                () => controller.abort(),
                12000,
              );
              try {
                await CSM.api(
                  "auth/logout",
                  "POST",
                  {},
                  {
                    signal: controller.signal,
                  },
                );
                window.location.replace(
                  "login.html?mode=signin&reason=signed_out",
                );
              } catch (error) {
                setSignOutBusy(false);
                setSignOutError(
                  controller.signal.aborted
                    ? "Sign out is taking longer than expected. Check your connection and try again."
                    : `Couldn’t sign you out: ${error.message}`,
                );
              } finally {
                window.clearTimeout(timeoutId);
              }
            }}
          >
            {signOutBusy ? "Signing out…" : "Yes, sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
