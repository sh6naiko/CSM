import { CSM } from "../../services/client.js";
import React from "react";
export function ArenaExitDialog({
  bombstyleAnswerSubmittedRef,
  bombstyleSessionId,
  isGuest,
  pendingBombstyleExitActionRef,
  refreshWorkspace,
  resumeBombstyleSession,
  setBombstyleExitModalOpen,
  setBombstyleFeedback,
  setBombstylePhase,
  setBombstyleRevealed,
  triggerToast,
}) {
  return (
    <div
      className="csm-modal-backdrop csm-bombstyle-exit-backdrop"
      role="presentation"
      onClick={resumeBombstyleSession}
    >
      <div
        className="csm-bombstyle-exit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bombstyle-exit-title"
        aria-describedby="bombstyle-exit-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="csm-bombstyle-exit-heading">
          <div className="csm-bombstyle-exit-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.3 3.9 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <div>
            <span className="csm-kicker">LEAVE SESSION?</span>
            <h2 id="bombstyle-exit-title">Exit Bombstyle?</h2>
          </div>
        </div>
        <p id="bombstyle-exit-description">
          Your answers are saved. Leaving now will end this round and return you
          to the Challenge hub.
        </p>
        <div className="csm-bombstyle-exit-actions">
          <button
            type="button"
            className="csm-secondary-button"
            autoFocus
            onClick={resumeBombstyleSession}
          >
            Cancel
          </button>
          <button
            type="button"
            className="csm-danger-button"
            onClick={async () => {
              try {
                if (!isGuest) {
                  await CSM.api("arena/abandon", "POST", {
                    id: bombstyleSessionId,
                  });
                  await refreshWorkspace();
                }
              } catch (error) {
                triggerToast(error.message);
              }
              const afterExit = pendingBombstyleExitActionRef.current;
              pendingBombstyleExitActionRef.current = null;
              setBombstyleExitModalOpen(false);
              setBombstyleFeedback(null);
              setBombstyleRevealed(false);
              bombstyleAnswerSubmittedRef.current = false;
              setBombstylePhase("select_deck");
              afterExit?.();
            }}
          >
            Exit session
          </button>
        </div>
      </div>
    </div>
  );
}
