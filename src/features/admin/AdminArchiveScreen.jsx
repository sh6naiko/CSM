import { CSM } from "../../services/client.js";
import { IconDownload, IconTrash } from "../../components/icons.jsx";
import {
  adminAvatarBackgrounds,
  getAccountInitials,
} from "../../utils/accounts.js";
import { getCompactPageItems } from "../../utils/pagination.js";
import { formatAdminEventLabel } from "./adminPresentation.js";
import React, { useEffect, useState } from "react";
export function AdminArchiveScreen({ profile }) {
  const isSuper = profile?.role === "superadmin";
  const [section, setSection] = useState("inactive-users");
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [inactiveTotal, setInactiveTotal] = useState(0);
  const [inactivePage, setInactivePage] = useState(1);
  const [events, setEvents] = useState([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [hiddenDecks, setHiddenDecks] = useState([]);
  const [hiddenTotal, setHiddenTotal] = useState(0);
  const [hiddenPage, setHiddenPage] = useState(1);
  const [restoringDeckId, setRestoringDeckId] = useState(null);
  const [deletingHiddenDecks, setDeletingHiddenDecks] = useState(false);
  const [hiddenDeckDeleteTarget, setHiddenDeckDeleteTarget] = useState(null);
  const [hiddenDeckDeleteError, setHiddenDeckDeleteError] = useState("");
  const [selectedHiddenDeckIds, setSelectedHiddenDeckIds] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const pageSize = 10;
  const downloadArchiveCsv = async (route, filename, label) => {
    setExporting(true);
    setError("");
    setNotice("");
    try {
      await CSM.downloadFile(route, filename);
      setNotice(`${label} downloaded as CSV.`);
    } catch (downloadError) {
      setError(
        downloadError.message || "The CSV export could not be downloaded.",
      );
    } finally {
      setExporting(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError("");
      try {
        if (section === "inactive-users") {
          const result = await CSM.api(
            `admin/archive/inactive-users&limit=${pageSize}&offset=${(inactivePage - 1) * pageSize}`,
          );
          if (!cancelled) {
            setInactiveUsers(result.users || []);
            setInactiveTotal(Number(result.total) || 0);
          }
        } else if (section === "hidden-decks") {
          const result = await CSM.api(
            `admin/archive/hidden-decks&limit=${pageSize}&offset=${(hiddenPage - 1) * pageSize}`,
          );
          if (!cancelled) {
            setHiddenDecks(result.decks || []);
            setHiddenTotal(Number(result.total) || 0);
          }
        } else if (section === "security-events" && isSuper) {
          const result = await CSM.api(
            `admin/archive/security-events&limit=${pageSize}&offset=${(eventPage - 1) * pageSize}`,
          );
          if (!cancelled) {
            setEvents(result.events || []);
            setEventTotal(Number(result.total) || 0);
          }
        }
      } catch (requestError) {
        if (!cancelled)
          setError(requestError.message || "Could not load archive data.");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [section, inactivePage, hiddenPage, eventPage, isSuper]);
  const requestHiddenDeckDeletion = (ids) => {
    const selectedIds = [...new Set(ids.map(String))];
    if (selectedIds.length) {
      setHiddenDeckDeleteError("");
      setHiddenDeckDeleteTarget(selectedIds);
    }
  };
  const confirmHiddenDeckDeletion = async () => {
    const selectedIds = hiddenDeckDeleteTarget || [];
    if (!selectedIds.length || deletingHiddenDecks) return;
    setDeletingHiddenDecks(true);
    setError("");
    setHiddenDeckDeleteError("");
    setNotice("");
    try {
      const result = await CSM.api(
        "admin/archive/hidden-decks/delete",
        "DELETE",
        {
          ids: selectedIds,
        },
      );
      const deletedIds = new Set(selectedIds);
      setHiddenDecks((current) =>
        current.filter((deck) => !deletedIds.has(String(deck.id))),
      );
      setHiddenTotal((current) =>
        Math.max(0, current - (Number(result.deleted) || selectedIds.length)),
      );
      setSelectedHiddenDeckIds((current) =>
        current.filter((id) => !deletedIds.has(String(id))),
      );
      setNotice(
        `${Number(result.deleted) || selectedIds.length} hidden ${selectedIds.length === 1 ? "deck" : "decks"} permanently deleted.`,
      );
      if (selectedIds.length >= hiddenDecks.length && hiddenPage > 1)
        setHiddenPage((current) => current - 1);
      setHiddenDeckDeleteTarget(null);
    } catch (deleteError) {
      setHiddenDeckDeleteError(
        deleteError.message ||
          "Could not permanently delete the selected decks.",
      );
    } finally {
      setDeletingHiddenDecks(false);
    }
  };
  const restoreHiddenDeck = async (deck) => {
    setRestoringDeckId(deck.id);
    setError("");
    setNotice("");
    try {
      await CSM.api("admin/decks/visibility", "PATCH", {
        deckId: deck.id,
        action: "restore",
        reason: "Restored from the hidden deck archive.",
      });
      setHiddenDecks((current) =>
        current.filter((item) => String(item.id) !== String(deck.id)),
      );
      setSelectedHiddenDeckIds((current) =>
        current.filter((id) => String(id) !== String(deck.id)),
      );
      setHiddenTotal((current) => Math.max(0, current - 1));
      setNotice(`"${deck.title}" restored and returned to deck moderation.`);
      if (hiddenDecks.length === 1 && hiddenPage > 1)
        setHiddenPage((current) => current - 1);
    } catch (restoreError) {
      setError(restoreError.message || "Could not restore this deck.");
    } finally {
      setRestoringDeckId(null);
    }
  };
  const pagination = (label, page, total, setPage) => {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (total <= pageSize) return null;
    return (
      <nav className="csm-admin-pagination" aria-label={`${label} pages`}>
        <span className="csm-admin-pagination-summary">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}{" "}
          of {total} {label.toLowerCase()}
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
          {getCompactPageItems(page, pageCount).map((item) =>
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
    );
  };
  return (
    <div className="csm-screen custom-scroll csm-admin-screen csm-standalone-archive">
      <div className="csm-page-head csm-admin-page-head">
        <div>
          <span className="csm-kicker">WORKSPACE ADMINISTRATION</span>
          <h1>Archive</h1>
          <p>
            Review hidden decks, inactive accounts, and older security events.
          </p>
        </div>
        <span className={`csm-admin-role-pill ${isSuper ? "is-super" : ""}`}>
          {isSuper ? "Superadmin" : "Admin"}
        </span>
      </div>
      <div
        className="csm-admin-tabs csm-admin-archive-tabs"
        role="tablist"
        aria-label="Archive sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={section === "inactive-users"}
          className={section === "inactive-users" ? "active" : ""}
          onClick={() => {
            setSection("inactive-users");
            setInactivePage(1);
          }}
        >
          Inactive users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "hidden-decks"}
          className={section === "hidden-decks" ? "active" : ""}
          onClick={() => {
            setSection("hidden-decks");
            setHiddenPage(1);
          }}
        >
          Hidden decks
        </button>
        {isSuper && (
          <button
            type="button"
            role="tab"
            aria-selected={section === "security-events"}
            className={section === "security-events" ? "active" : ""}
            onClick={() => {
              setSection("security-events");
              setEventPage(1);
            }}
          >
            Security event log
          </button>
        )}
      </div>
      {error && (
        <div className="csm-admin-alert is-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="csm-admin-alert is-success" role="status">
          {notice}
        </div>
      )}
      {section === "inactive-users" && (
        <div className="csm-admin-card">
          <div className="csm-admin-card-head">
            <div>
              <span className="csm-kicker">ACCOUNT ARCHIVE</span>
              <h2>Inactive users</h2>
              <small className="csm-admin-subtle">
                Accounts appear here after seven days without activity. They are
                excluded from the user directory and search, but can still sign
                in.
              </small>
            </div>
            <div className="csm-admin-content-tools">
              <span className="csm-archive-count">
                {inactiveTotal} accounts
              </span>
              <button
                type="button"
                className="csm-secondary-button"
                disabled={exporting}
                onClick={() =>
                  downloadArchiveCsv(
                    "admin/archive/inactive-users/export",
                    "co-studymaxx-inactive-users.csv",
                    "Inactive users",
                  )
                }
              >
                <IconDownload />
                {exporting ? "Preparing CSV…" : "Export CSV"}
              </button>
            </div>
          </div>
          {inactiveUsers.length ? (
            <div className="csm-admin-table-wrap">
              <table className="csm-admin-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Last active</th>
                    <th>Inactive for</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveUsers.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <div className="csm-admin-account">
                          <span className="csm-admin-avatar-wrap">
                            <span
                              className="csm-admin-avatar"
                              style={{
                                background:
                                  adminAvatarBackgrounds[account.avatar] ||
                                  adminAvatarBackgrounds.ember,
                              }}
                              aria-hidden="true"
                            >
                              {getAccountInitials(account)}
                            </span>
                          </span>
                          <div>
                            <strong>{account.username}</strong>
                            <small>{account.email || "No email on file"}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="csm-admin-status">{account.role}</span>
                      </td>
                      <td>
                        {account.last_seen_at
                          ? new Date(
                              `${account.last_seen_at}Z`,
                            ).toLocaleString()
                          : "—"}
                      </td>
                      <td>{account.inactive_days} days</td>
                      <td>
                        {account.created_at
                          ? new Date(
                              `${account.created_at}Z`,
                            ).toLocaleDateString()
                          : "—"}
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
                : "No accounts have been inactive for seven days."}
            </div>
          )}
          {pagination(
            "Inactive users",
            inactivePage,
            inactiveTotal,
            setInactivePage,
          )}
        </div>
      )}
      {section === "hidden-decks" && (
        <div className="csm-admin-card">
          <div className="csm-admin-card-head">
            <div>
              <span className="csm-kicker">MODERATION ARCHIVE</span>
              <h2>Hidden decks</h2>
              <small className="csm-admin-subtle">
                Decks hidden by staff are kept here so they can be restored if
                needed.
              </small>
            </div>
            <div className="csm-admin-content-tools">
              <span className="csm-archive-count">{hiddenTotal} decks</span>
              {selectedHiddenDeckIds.length > 0 && (
                <button
                  type="button"
                  className="csm-admin-danger-button csm-archive-bulk-delete"
                  disabled={deletingHiddenDecks || restoringDeckId !== null}
                  onClick={() =>
                    requestHiddenDeckDeletion(selectedHiddenDeckIds)
                  }
                >
                  <IconTrash />
                  Delete selected ({selectedHiddenDeckIds.length})
                </button>
              )}
            </div>
          </div>
          {hiddenDecks.length ? (
            <div className="csm-admin-table-wrap csm-admin-hidden-decks-table-wrap">
              <table className="csm-admin-table csm-admin-hidden-decks-table">
                <thead>
                  <tr>
                    <th>
                      <label className="csm-admin-select-all">
                        <input
                          type="checkbox"
                          aria-label="Select all hidden decks on this page"
                          checked={
                            hiddenDecks.length > 0 &&
                            hiddenDecks.every((deck) =>
                              selectedHiddenDeckIds.includes(String(deck.id)),
                            )
                          }
                          onChange={(event) =>
                            setSelectedHiddenDeckIds((current) =>
                              event.target.checked
                                ? [
                                    ...new Set([
                                      ...current,
                                      ...hiddenDecks.map((deck) =>
                                        String(deck.id),
                                      ),
                                    ]),
                                  ]
                                : current.filter(
                                    (id) =>
                                      !hiddenDecks.some(
                                        (deck) =>
                                          String(deck.id) === String(id),
                                      ),
                                  ),
                            )
                          }
                        />
                        Deck
                      </label>
                    </th>
                    <th>Owner</th>
                    <th>Cards / PDFs</th>
                    <th>Hidden</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hiddenDecks.map((deck) => (
                    <tr key={deck.id}>
                      <td>
                        <div className="csm-admin-hidden-deck-account">
                          <input
                            type="checkbox"
                            aria-label={`Select ${deck.title}`}
                            checked={selectedHiddenDeckIds.includes(
                              String(deck.id),
                            )}
                            onChange={(event) =>
                              setSelectedHiddenDeckIds((current) =>
                                event.target.checked
                                  ? [...new Set([...current, String(deck.id)])]
                                  : current.filter(
                                      (id) => String(id) !== String(deck.id),
                                    ),
                              )
                            }
                          />
                          <div>
                            <strong>{deck.title}</strong>
                            <small>{deck.subject || "No subject"}</small>
                          </div>
                        </div>
                      </td>
                      <td>{deck.owner}</td>
                      <td>
                        {deck.card_count} / {deck.document_count}
                      </td>
                      <td>
                        {deck.hidden_at
                          ? new Date(`${deck.hidden_at}Z`).toLocaleString()
                          : "Not recorded"}
                      </td>
                      <td>
                        <div className="csm-admin-deck-menu">
                          <details>
                            <summary
                              className="csm-admin-deck-menu-trigger"
                              aria-label={`Actions for ${deck.title}`}
                              title="Deck actions"
                            >
                              <svg
                                className="csm-admin-user-more-icon"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <circle cx="5" cy="12" r="1.7" />
                                <circle cx="12" cy="12" r="1.7" />
                                <circle cx="19" cy="12" r="1.7" />
                              </svg>
                            </summary>
                            <div className="csm-admin-deck-menu-popover">
                              <button
                                type="button"
                                disabled={
                                  restoringDeckId !== null ||
                                  deletingHiddenDecks
                                }
                                onClick={(event) => {
                                  event.currentTarget.closest("details").open =
                                    false;
                                  restoreHiddenDeck(deck);
                                }}
                              >
                                <svg
                                  className="csm-admin-menu-item-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
                                  <path d="M21 3v5h-5" />
                                  <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
                                  <path d="M3 21v-5h5" />
                                </svg>
                                {restoringDeckId === deck.id
                                  ? "Restoring..."
                                  : "Restore deck"}
                              </button>
                              <button
                                type="button"
                                className="is-danger"
                                disabled={
                                  deletingHiddenDecks ||
                                  restoringDeckId !== null
                                }
                                onClick={(event) => {
                                  event.currentTarget.closest("details").open =
                                    false;
                                  requestHiddenDeckDeletion([deck.id]);
                                }}
                              >
                                <IconTrash />
                                Delete permanently
                              </button>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="csm-admin-empty">
              {error ? "Archive could not be loaded." : "No hidden decks."}
            </div>
          )}
          {pagination("Hidden decks", hiddenPage, hiddenTotal, setHiddenPage)}
        </div>
      )}
      {section === "security-events" && isSuper && (
        <div className="csm-admin-card">
          <div className="csm-admin-card-head">
            <div>
              <span className="csm-kicker">SUPERADMIN ONLY</span>
              <h2>Archived security events</h2>
              <small className="csm-admin-subtle">
                The newest 100 events remain in Security log. Older events
                appear here.
              </small>
            </div>
            <div className="csm-admin-content-tools">
              <span className="csm-admin-subtle">
                IP addresses are one-way hashes.
              </span>
              <button
                type="button"
                className="csm-secondary-button"
                disabled={exporting}
                onClick={() =>
                  downloadArchiveCsv(
                    "admin/archive/security-events/export",
                    "co-studymaxx-archived-security-events.csv",
                    "Archived security events",
                  )
                }
              >
                <IconDownload />
                {exporting ? "Preparing CSV…" : "Export CSV"}
              </button>
            </div>
          </div>
          {events.length ? (
            <div className="csm-admin-table-wrap">
              <table className="csm-admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Target</th>
                    <th>IP fingerprint</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        {new Date(`${event.created_at}Z`).toLocaleString()}
                      </td>
                      <td>
                        <span className="csm-admin-status csm-admin-security-event">
                          {formatAdminEventLabel(event.event)}
                        </span>
                      </td>
                      <td>{event.actor || "System"}</td>
                      <td>{event.target || "—"}</td>
                      <td>
                        <code>
                          {event.ip_hash ? event.ip_hash.slice(0, 16) : "—"}
                        </code>
                      </td>
                      <td>
                        <code>{JSON.stringify(event.details || {})}</code>
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
                : "The event log has not exceeded ten pages yet."}
            </div>
          )}
          {pagination(
            "Archived security events",
            eventPage,
            eventTotal,
            setEventPage,
          )}
        </div>
      )}
      {hiddenDeckDeleteTarget && (
        <div
          className="csm-modal-backdrop csm-admin-action-backdrop"
          role="presentation"
          onClick={() =>
            !deletingHiddenDecks && setHiddenDeckDeleteTarget(null)
          }
        >
          <section
            className="csm-admin-action-modal csm-archive-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-delete-title"
            aria-describedby="archive-delete-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="csm-admin-action-icon is-danger" aria-hidden="true">
              <IconTrash />
            </div>
            <span className="csm-kicker">PERMANENT DELETION</span>
            <h2 id="archive-delete-title">
              Delete {hiddenDeckDeleteTarget.length} hidden{" "}
              {hiddenDeckDeleteTarget.length === 1 ? "deck" : "decks"}?
            </h2>
            <p id="archive-delete-description">
              This permanently removes{" "}
              {hiddenDeckDeleteTarget.length === 1
                ? "this deck"
                : "these decks"}{" "}
              and all attached PDFs from the workspace. This action cannot be
              undone.
            </p>
            {hiddenDeckDeleteError && (
              <div className="csm-admin-alert is-error" role="alert">
                {hiddenDeckDeleteError}
              </div>
            )}
            <div className="csm-admin-flag-actions">
              <button
                type="button"
                className="csm-secondary-button"
                autoFocus
                disabled={deletingHiddenDecks}
                onClick={() => setHiddenDeckDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="csm-admin-danger-button"
                disabled={deletingHiddenDecks}
                onClick={confirmHiddenDeckDeletion}
              >
                {deletingHiddenDecks ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
