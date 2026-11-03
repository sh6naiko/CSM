import { CSM } from "../../services/client.js";
import { IconArrowRight } from "../../components/icons.jsx";
import { AdminReportArrivalNotice } from "./AdminReportArrivalNotice.jsx";
import React, { useEffect, useState } from "react";
export function AdminHome({ profile, onOpenAdmin }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [reports, setReports] = useState(null);
  const [reviewError, setReviewError] = useState("");
  const load = async () => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 86400000)
      .toISOString()
      .slice(0, 10);
    try {
      setDashboard(await CSM.api(`admin/dashboard&from=${from}&to=${to}`));
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load workspace activity.");
    }
    try {
      setReports((await CSM.api("admin/reports&status=open")).reports || []);
      setReviewError("");
    } catch (requestError) {
      setReviewError(requestError.message || "Could not load flagged reviews.");
    }
  };
  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <div className="csm-screen custom-scroll csm-admin-screen csm-admin-home">
      <AdminReportArrivalNotice profile={profile} />
      <div className="csm-page-head csm-admin-page-head">
        <div>
          <span className="csm-kicker">WORKSPACE OVERVIEW</span>
          <h1>
            Good to see you,{" "}
            {profile?.displayName || profile?.username || "Admin"}
          </h1>
          <p>
            Monitor who is using Co-StudyMaxx and review activity across the
            workspace.
          </p>
        </div>
        <button
          type="button"
          className="csm-primary-button"
          onClick={onOpenAdmin}
        >
          Open admin console <IconArrowRight />
        </button>
      </div>
      {error && (
        <div className="csm-admin-alert is-error" role="alert">
          {error}
        </div>
      )}
      {dashboard ? (
        <>
          <div className="csm-admin-metrics">
            {[
              [
                "Total users",
                dashboard.totals.users,
                "All registered accounts",
                "users",
              ],
              [
                "Active now",
                dashboard.totals.activeNow,
                "Seen in the last 5 minutes",
                "users",
              ],
              [
                "Active last 30 days",
                dashboard.period.activeUsers,
                "Distinct users with study activity",
                "users",
              ],
              [
                "Total decks",
                dashboard.totals.decks,
                "Across all accounts",
                "content",
              ],
              [
                "PDF uploads",
                dashboard.period.uploads,
                "Selected 30-day period",
                "content",
              ],
              [
                "Challenge sessions",
                dashboard.period.sessions,
                "Selected 30-day period",
                "overview",
              ],
            ].map(([label, value, description, section]) => (
              <button
                type="button"
                className={`csm-admin-metric csm-admin-metric-button ${label === "Active now" ? "is-live" : ""}`}
                key={label}
                onClick={() => onOpenAdmin(section)}
                aria-label={`${label}: ${value}. ${description}. Open ${section === "users" ? "user management" : section === "content" ? "deck moderation" : "activity overview"}.`}
                title={`Open ${section === "users" ? "user management" : section === "content" ? "deck moderation" : "activity overview"}`}
              >
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
          <section className="csm-admin-card csm-admin-home-note">
            <span className="csm-kicker">LIVE ACCOUNT ACTIVITY</span>
            <p>
              “Active now” counts accounts with a signed-in tab that contacted
              the server within five minutes. Period activity counts distinct
              users who generated study activity during the selected dates.
            </p>
          </section>
        </>
      ) : (
        !error && (
          <div className="csm-admin-empty">Loading workspace totals…</div>
        )
      )}
      <section className="csm-admin-card csm-admin-home-reviews">
        <div className="csm-admin-card-head">
          <div>
            <span className="csm-kicker">NEEDS ATTENTION</span>
            <h2>Flagged reviews</h2>
          </div>
          <div className="csm-admin-review-preview-actions">
            <span className="csm-admin-subtle">
              {reports ? `${reports.length} open` : "Loading…"}
            </span>
            <button
              type="button"
              className="csm-secondary-button"
              onClick={() => onOpenAdmin("reports")}
            >
              Open review queue <IconArrowRight />
            </button>
          </div>
        </div>
        {reviewError ? (
          <div className="csm-admin-alert is-error" role="alert">
            {reviewError}
          </div>
        ) : reports === null ? (
          <div className="csm-admin-empty">Loading flagged reviews…</div>
        ) : reports.length ? (
          <div className="csm-admin-report-list">
            {reports.slice(0, 3).map((report) => (
              <article className="csm-admin-report" key={report.id}>
                <div>
                  <span className="csm-admin-status is-locked">
                    Open review
                  </span>
                  <h3>{report.deckTitle}</h3>
                  <p>
                    {report.subject || "No subject"} · owner {report.owner} ·
                    reported by {report.flaggedBy || "staff"}
                  </p>
                  <blockquote>{report.reason}</blockquote>
                  <small>
                    Reported{" "}
                    {new Date(`${report.created_at}Z`).toLocaleString()}
                  </small>
                </div>
                <div className="csm-admin-row-actions">
                  <button
                    type="button"
                    className="csm-secondary-button"
                    onClick={() => onOpenAdmin("reports")}
                  >
                    Review in queue <IconArrowRight />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="csm-admin-review-preview-empty">
            No open flagged reviews.
          </div>
        )}
        {reports?.length > 3 && (
          <button
            type="button"
            className="csm-admin-review-preview-more"
            onClick={() => onOpenAdmin("reports")}
          >
            View all {reports.length} reviews
          </button>
        )}
      </section>
    </div>
  );
}
