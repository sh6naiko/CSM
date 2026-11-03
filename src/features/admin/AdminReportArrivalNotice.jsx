import { CSM } from "../../services/client.js";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
export function AdminReportArrivalNotice({ profile }) {
  const [summary, setSummary] = useState(null);
  const [acknowledgeError, setAcknowledgeError] = useState("");
  const isSuperadmin = profile?.role === "superadmin";
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const requests = [
        CSM.api("notifications"),
        CSM.api("admin/archive/notices"),
      ];
      const [notificationResult, archiveResult] =
        await Promise.allSettled(requests);
      if (cancelled) return;
      const archiveNotices =
        archiveResult.status === "fulfilled" ? archiveResult.value : {};
      const inactiveUsers = Number(archiveNotices.inactiveUsers) || 0;
      const archivedSecurityEvents = isSuperadmin
        ? Number(archiveNotices.archivedSecurityEvents) || 0
        : 0;
      const reportedDecks =
        notificationResult.status === "fulfilled"
          ? Number(notificationResult.value?.unreadReportDeckCount) || 0
          : 0;
      const messages = [];
      if (reportedDecks)
        messages.push(
          `${reportedDecks} ${reportedDecks === 1 ? "deck was" : "decks were"} reported.`,
        );
      if (inactiveUsers)
        messages.push(
          `${inactiveUsers} ${inactiveUsers === 1 ? "user was" : "users were"} moved to the inactive users archive.`,
        );
      if (archivedSecurityEvents)
        messages.push(
          `${archivedSecurityEvents} ${archivedSecurityEvents === 1 ? "security event was" : "security events were"} moved to the archive.`,
        );
      if (!messages.length) return;
      setSummary({
        reportedDecks,
        inactiveUsers,
        archivedSecurityEvents,
        message: messages.join(" "),
      });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isSuperadmin, profile?.id]);
  if (!summary) return null;
  const acknowledge = async () => {
    try {
      await CSM.api("admin/archive/notices", "PATCH", {});
      setAcknowledgeError("");
    } catch (error) {
      setAcknowledgeError(
        error.message || "Could not save this notice. Please try again.",
      );
      return;
    }
    if (summary.reportedDecks) {
      try {
        await CSM.api("notifications/read", "PATCH", {
          type: "deck_report_received",
        });
        window.dispatchEvent(new Event("csm:notifications-refresh"));
      } catch {
        /* The report queue remains available if notifications cannot be updated. */
      }
    }
    setSummary(null);
  };
  return ReactDOM.createPortal(
    <div
      className="csm-modal-backdrop csm-admin-report-backdrop"
      role="presentation"
    >
      <section
        className="csm-admin-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csm-admin-report-title"
        aria-describedby="csm-admin-report-message"
      >
        <span className="csm-admin-report-modal-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            <path d="M8 7h8M8 11h8" />
          </svg>
        </span>
        <span className="csm-kicker">
          {summary.reportedDecks ? "REVIEW QUEUE" : "ARCHIVE ACTIVITY"}
        </span>
        <h2 id="csm-admin-report-title">While you were away</h2>
        <p id="csm-admin-report-message">{summary.message}</p>
        {acknowledgeError && (
          <p role="alert" className="csm-admin-report-error">
            {acknowledgeError}
          </p>
        )}
        <button
          type="button"
          className="csm-primary-button"
          onClick={acknowledge}
        >
          Got it!
        </button>
      </section>
    </div>,
    document.body,
  );
}
