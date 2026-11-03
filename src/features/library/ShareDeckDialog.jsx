import { IconShare } from "../../components/icons.jsx";
import React from "react";
export function ShareDeckDialog({
  handleCopyShareUrl,
  handleRegenerateShareLink,
  handleShareDeck,
  handleToggleShareActive,
  isGuest,
  setShareDeckTarget,
  shareDeckTarget,
  shareModalCopied,
  shareModalData,
  shareModalError,
  shareModalLoading,
}) {
  return (
    <div
      className="csm-modal-backdrop"
      role="presentation"
      onClick={() => setShareDeckTarget(null)}
    >
      <div
        className="csm-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csm-form-modal-header">
          <div>
            <span className="csm-kicker">SHARE REVIEWER</span>
            <h2 id="share-modal-title">
              Share “{shareDeckTarget.code || shareDeckTarget.title}”
            </h2>
          </div>
          <button
            type="button"
            className="csm-form-modal-close"
            onClick={() => setShareDeckTarget(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="csm-form-modal-help">
          Anyone with this link can view the reviewer, study its cards, and read
          shared PDFs. Editing tools require signing in.
        </p>

        {shareModalLoading && !shareModalData ? (
          <div
            style={{
              padding: "28px 0",
              textAlign: "center",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Generating unique share link...
          </div>
        ) : shareModalError ? (
          <div
            style={{
              padding: "14px 16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              color: "#b91c1c",
              fontSize: "11px",
              marginBottom: "16px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 700,
              }}
            >
              {shareModalError}
            </p>
            <div
              style={{
                marginTop: "10px",
              }}
            >
              <button
                type="button"
                className="csm-secondary-button"
                onClick={() => handleShareDeck(shareDeckTarget)}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          shareModalData && (
            <div>
              <div>
                {shareModalData.isActive ? (
                  <span className="csm-share-status active">
                    ● Link active — Guest access enabled
                  </span>
                ) : (
                  <span className="csm-share-status inactive">
                    ○ Link disabled — Access revoked
                  </span>
                )}
              </div>

              <div className="csm-share-url-group">
                <input
                  type="text"
                  readOnly
                  value={shareModalData.url || ""}
                  className="csm-share-url-input"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className={`csm-copy-button ${shareModalCopied ? "copied" : ""}`}
                  onClick={handleCopyShareUrl}
                >
                  {shareModalCopied ? (
                    <React.Fragment>
                      <i className="bi bi-check-lg"></i> Copied!
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <IconShare /> Copy Link
                    </React.Fragment>
                  )}
                </button>
              </div>

              <div className="csm-share-actions-row">
                {!isGuest &&
                  (shareModalData.isActive ? (
                    <button
                      type="button"
                      className="csm-secondary-button danger-tint"
                      disabled={shareModalLoading}
                      onClick={() => handleToggleShareActive(false)}
                    >
                      Disable / Revoke Link
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="csm-secondary-button success-tint"
                      disabled={shareModalLoading}
                      onClick={() => handleToggleShareActive(true)}
                    >
                      Enable Link
                    </button>
                  ))}

                {!isGuest && (
                  <button
                    type="button"
                    className="csm-secondary-button"
                    disabled={shareModalLoading}
                    onClick={handleRegenerateShareLink}
                    title="Generate a fresh token and deactivate the previous link"
                  >
                    Regenerate Link
                  </button>
                )}

                {shareModalData.isActive && (
                  <a
                    href={shareModalData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="csm-secondary-button"
                    style={{
                      marginLeft: "auto",
                      textDecoration: "none",
                    }}
                  >
                    Open as Guest ↗
                  </a>
                )}
              </div>

              <div className="csm-share-tip">
                Guests can open and study this shared reviewer without signing
                in. Reviewer editing tools remain locked.
              </div>
            </div>
          )
        )}

        <div
          className="csm-delete-actions"
          style={{
            marginTop: "20px",
          }}
        >
          <button
            type="button"
            className="csm-primary-button"
            onClick={() => setShareDeckTarget(null)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
