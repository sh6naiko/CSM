import { CSM } from "../../services/client.js";
import { IconRestore, IconTrash } from "../../components/icons.jsx";
import { getCompactPageItems } from "../../utils/pagination.js";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
export function UserArchiveScreen({ onWorkspaceRefresh }) {
  const [decks, setDecks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const pageSize = 10;
  const load = async () => {
    setError("");
    try {
      const result = await CSM.api(
        `archive/decks&limit=${pageSize}&offset=${(page - 1) * pageSize}`,
      );
      setDecks(result.decks || []);
      setTotal(Number(result.total) || 0);
    } catch (requestError) {
      setError(requestError.message || "Could not load archived decks.");
    }
  };
  useEffect(() => {
    load();
  }, [page]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(""), 4600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);
  const act = async (deck, action) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await CSM.api(
        action === "restore"
          ? "archive/decks/restore"
          : "archive/decks/permanent",
        action === "restore" ? "POST" : "DELETE",
        {
          id: deck.id,
        },
      );
      setNotice(
        action === "restore"
          ? "Deck restored to your library."
          : "Deck permanently deleted.",
      );
      if (action === "delete") setDeleteTarget(null);
      if (action === "restore") await onWorkspaceRefresh?.();
      if (decks.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (actionError) {
      const message =
        actionError.message || "Could not update this archived deck.";
      if (action === "delete") setDeleteError(message);
      else setError(message);
    } finally {
      setBusy(false);
    }
  };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = getCompactPageItems(page, pageCount);
  return (
    <div className="csm-screen custom-scroll csm-user-archive">
      <div className="csm-page-head">
        <div>
          <span className="csm-kicker">YOUR LIBRARY</span>
          <h1>Recently deleted</h1>
          <p>Decks stay here until you restore or permanently delete them.</p>
        </div>
        <span className="csm-archive-count">
          {total} {total === 1 ? "deck" : "decks"}
        </span>
      </div>
      {error && (
        <div className="csm-admin-alert is-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div
          className="csm-archive-notice-toast"
          role="status"
          aria-live="polite"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.6 2.6L16.5 9" />
          </svg>
          <span>{notice}</span>
        </div>
      )}
      <section className="csm-admin-card csm-archive-card">
        <div className="csm-admin-card-head">
          <div>
            <span className="csm-kicker">ARCHIVE</span>
            <h2>Archived decks</h2>
          </div>
        </div>
        {decks.length ? (
          <div className="csm-admin-table-wrap">
            <table className="csm-admin-table">
              <thead>
                <tr>
                  <th>Deck</th>
                  <th>Bombcards</th>
                  <th>PDFs</th>
                  <th>Deleted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {decks.map((deck) => (
                  <tr key={deck.id}>
                    <td>
                      <strong>{deck.title}</strong>
                      <small>{deck.subject || "No subject"}</small>
                    </td>
                    <td>{deck.card_count}</td>
                    <td>{deck.document_count}</td>
                    <td>
                      {deck.deleted_at
                        ? new Date(`${deck.deleted_at}Z`).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <div className="csm-admin-row-actions">
                        <button
                          type="button"
                          className="csm-secondary-button"
                          disabled={busy}
                          onClick={() => act(deck, "restore")}
                        >
                          <IconRestore />
                          Restore
                        </button>
                        <button
                          type="button"
                          className="csm-admin-deck-action is-danger csm-archive-delete"
                          disabled={busy}
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(deck);
                          }}
                        >
                          <IconTrash />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="csm-admin-empty">
            {error
              ? "Archive could not be loaded."
              : "No recently deleted decks."}
          </div>
        )}
        {total > pageSize && (
          <nav
            className="csm-admin-pagination"
            aria-label="Archived deck pages"
          >
            <span className="csm-admin-pagination-summary">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} of {total} decks
            </span>
            <div className="csm-admin-pagination-controls">
              <button
                type="button"
                className="csm-admin-page-button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              {pages.map((item) =>
                item.type === "ellipsis" ? (
                  <span key={item.key} className="csm-admin-page-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={item.value}
                    className={`csm-admin-page-number ${item.value === page ? "active" : ""}`}
                    aria-current={item.value === page ? "page" : undefined}
                    onClick={() => setPage(item.value)}
                  >
                    {item.value}
                  </button>
                ),
              )}
              <button
                type="button"
                className="csm-admin-page-button"
                disabled={page >= pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </section>
      {deleteTarget &&
        ReactDOM.createPortal(
          <div
            className="csm-modal-backdrop csm-admin-action-backdrop"
            role="presentation"
            onClick={() => !busy && setDeleteTarget(null)}
          >
            <section
              className="csm-admin-action-modal csm-archive-delete-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="user-archive-delete-title"
              aria-describedby="user-archive-delete-description"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="csm-admin-action-icon is-danger"
                aria-hidden="true"
              >
                <IconTrash />
              </div>
              <span className="csm-kicker">PERMANENT DELETION</span>
              <h2 id="user-archive-delete-title">
                Delete “{deleteTarget.title}” permanently?
              </h2>
              <p id="user-archive-delete-description">
                This permanently deletes the deck and its attached PDFs. This
                action cannot be undone.
              </p>
              {deleteError && (
                <div className="csm-admin-alert is-error" role="alert">
                  {deleteError}
                </div>
              )}
              <div className="csm-admin-flag-actions">
                <button
                  type="button"
                  className="csm-secondary-button"
                  autoFocus
                  disabled={busy}
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="csm-admin-danger-button"
                  disabled={busy}
                  onClick={() => act(deleteTarget, "delete")}
                >
                  {busy ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
