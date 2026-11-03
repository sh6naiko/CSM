import { CSM } from "../../services/client.js";
import { IconDownload, IconUser } from "../../components/icons.jsx";
import {
  adminAvatarBackgrounds,
  getAccountInitials,
} from "../../utils/accounts.js";
import { getCompactPageItems } from "../../utils/pagination.js";
import { formatAdminEventLabel } from "./adminPresentation.js";
import { AdminReportArrivalNotice } from "./AdminReportArrivalNotice.jsx";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
export function AdminPanel({ profile }) {
  const isSuper = profile?.role === "superadmin";
  const [section, setSection] = useState(() => {
    const requestedSection = new URLSearchParams(window.location.search).get(
      "section",
    );
    return ["overview", "content", "reports", "users"].includes(
      requestedSection,
    )
      ? requestedSection
      : "overview";
  });
  const [range, setRange] = useState(() => ({
    from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }));
  const [activitySummaryPage, setActivitySummaryPage] = useState(1);
  const [dateFilterError, setDateFilterError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userProfileModal, setUserProfileModal] = useState(null);
  const [userProfileTab, setUserProfileTab] = useState("activity");
  const [userProfileReportPage, setUserProfileReportPage] = useState(1);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState("");
  const [userProfileNotice, setUserProfileNotice] = useState("");
  const userProfileTriggerRef = useRef(null);
  const userProfileCloseRef = useRef(null);
  const [decks, setDecks] = useState([]);
  const [deckTotal, setDeckTotal] = useState(0);
  const [deckPage, setDeckPage] = useState(1);
  const [reports, setReports] = useState([]);
  const reportCountStorageKey = `csm-admin-open-report-count:${profile?.username || "admin"}`;
  const [openReportCount, setOpenReportCount] = useState(() => {
    try {
      return Math.max(
        0,
        Number(window.localStorage.getItem(reportCountStorageKey)) || 0,
      );
    } catch {
      return 0;
    }
  });
  const [events, setEvents] = useState([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventPage, setEventPage] = useState(1);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminActionModal, setAdminActionModal] = useState(null);
  const [adminActionReason, setAdminActionReason] = useState("");
  const [adminActionPassword, setAdminActionPassword] = useState("");
  const [adminActionError, setAdminActionError] = useState("");
  const adminActionReasonRef = useRef(null);
  const adminActionPasswordRef = useRef(null);
  const adminActionConfirmRef = useRef(null);
  const adminActionTriggerRef = useRef(null);
  const [flagDeckTarget, setFlagDeckTarget] = useState(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagReasonError, setFlagReasonError] = useState("");
  const flagReasonRef = useRef(null);
  const flagTriggerRef = useRef(null);
  const [deckPreview, setDeckPreview] = useState(null);
  const [deckPreviewLoading, setDeckPreviewLoading] = useState(false);
  const [deckPreviewError, setDeckPreviewError] = useState("");
  const deckPreviewTriggerRef = useRef(null);
  const deckPreviewCloseRef = useRef(null);
  const deckPreviewRequestRef = useRef(0);
  const rangeInitializedRef = useRef(false);
  const rangeTouchedRef = useRef(false);
  const syncOpenReports = (openReports) => {
    const nextReports = Array.isArray(openReports) ? openReports : [];
    setReports(nextReports);
    setOpenReportCount(nextReports.length);
    try {
      window.localStorage.setItem(
        reportCountStorageKey,
        String(nextReports.length),
      );
    } catch {
      // The live report list still works when browser storage is unavailable.
    }
  };
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const applyWebsiteStartDate = (summary) => {
    if (
      rangeInitializedRef.current ||
      rangeTouchedRef.current ||
      !summary.startDate
    )
      return;
    rangeInitializedRef.current = true;
    setRange((current) => ({
      ...current,
      from: summary.startDate,
    }));
  };
  const load = async (
    query = search,
    requestedDeckPage = deckPage,
    requestedUserPage = userPage,
    requestedEventPage = eventPage,
  ) => {
    setError("");
    try {
      if (section === "overview") {
        const [summary, reviewData] = await Promise.all([
          CSM.api(
            `admin/dashboard&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
          ),
          CSM.api("admin/reports&status=open"),
        ]);
        setDashboard(summary);
        applyWebsiteStartDate(summary);
        syncOpenReports(reviewData.reports);
      }
      if (section === "users") {
        const result = await CSM.api(
          `admin/users&q=${encodeURIComponent(query)}&role=${encodeURIComponent(userRoleFilter)}&limit=10&offset=${(requestedUserPage - 1) * 10}`,
        );
        setUsers(result.users || []);
        setUserTotal(Number(result.total) || 0);
      }
      if (section === "content") {
        const result = await CSM.api(
          `admin/decks&q=${encodeURIComponent(query)}&limit=10&offset=${(requestedDeckPage - 1) * 10}`,
        );
        const nextDecks = result.decks || [];
        setDecks(nextDecks);
        setDeckTotal(Number(result.total) || 0);
      }
      if (section === "reports") {
        const result = await CSM.api("admin/reports&status=open");
        syncOpenReports(result.reports);
      }
      if (section === "audit" && isSuper) {
        const result = await CSM.api(
          `admin/audit&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&limit=10&offset=${(requestedEventPage - 1) * 10}`,
        );
        setEvents(result.events || []);
        setEventTotal(Number(result.total) || 0);
      }
      if (section === "system" && isSuper)
        setSettings(await CSM.api("admin/settings"));
    } catch (requestError) {
      setError(requestError.message || "Could not load administrator data.");
    }
  };
  useEffect(() => {
    load();
  }, [
    section,
    range.from,
    range.to,
    deckPage,
    userPage,
    userRoleFilter,
    eventPage,
  ]);
  useEffect(() => {
    // AdminPanel can render before the session profile is ready. Start the
    // report count request once the authenticated admin identity is available
    // so the badge is populated even when the Review queue tab is never opened.
    if (!profile?.id) return undefined;

    let isMounted = true;
    const refreshOpenReports = async () => {
      try {
        const result = await CSM.api("admin/reports&status=open");
        if (isMounted) {
          syncOpenReports(result.reports);
        }
      } catch {
        // Keep the current badge state if the background refresh is unavailable.
      }
    };

    refreshOpenReports();
    const interval = window.setInterval(refreshOpenReports, 30000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [profile?.id, profile?.username]);
  useEffect(() => {
    if (section !== "overview") return undefined;
    const interval = window.setInterval(async () => {
      try {
        const [summary, reviewData] = await Promise.all([
          CSM.api(
            `admin/dashboard&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
          ),
          CSM.api("admin/reports&status=open"),
        ]);
        setDashboard(summary);
        applyWebsiteStartDate(summary);
        syncOpenReports(reviewData.reports);
      } catch {
        /* The current dashboard remains visible; the next refresh can recover. */
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [section, range.from, range.to]);
  useEffect(() => {
    if (section !== "users") return undefined;
    const interval = window.setInterval(async () => {
      try {
        const result = await CSM.api(
          `admin/users&q=${encodeURIComponent(search)}&role=${encodeURIComponent(userRoleFilter)}&limit=10&offset=${(userPage - 1) * 10}`,
        );
        setUsers(result.users || []);
        setUserTotal(Number(result.total) || 0);
      } catch {
        /* Keep the last known status visible until the next refresh. */
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [section, search, userPage, userRoleFilter]);
  const runAction = async (action, success) => {
    setBusy(true);
    setError("");
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await load();
    } catch (actionError) {
      setError(actionError.message || "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  };
  const downloadAdminCsv = async (route, filename, successMessage) => {
    setBusy(true);
    setError("");
    setNotice(null);
    try {
      await CSM.downloadFile(route, filename);
      setNotice(successMessage);
    } catch (downloadError) {
      setError(
        downloadError.message || "The CSV export could not be downloaded.",
      );
    } finally {
      setBusy(false);
    }
  };
  const requestAdminAction = (event, options) => {
    adminActionTriggerRef.current =
      event.currentTarget?.tagName === "FORM"
        ? event.nativeEvent?.submitter
        : event.currentTarget;
    setAdminActionReason("");
    setAdminActionPassword("");
    setAdminActionError("");
    setAdminActionModal(options);
  };
  const viewAccountProfile = async (event, account) => {
    const menuDetails = event.currentTarget.closest("details");
    userProfileTriggerRef.current =
      menuDetails?.querySelector("summary") || event.currentTarget;
    if (menuDetails) menuDetails.open = false;
    setUserProfileTab("activity");
    setUserProfileReportPage(1);
    setUserProfileError("");
    setUserProfileNotice("");
    setUserProfileLoading(true);
    setUserProfileModal({
      account,
      data: null,
    });
    try {
      const result = await CSM.api(
        `admin/users/profile&id=${encodeURIComponent(account.id)}`,
      );
      setUserProfileModal({
        account,
        data: result,
      });
    } catch (profileError) {
      setUserProfileError(
        profileError.message || "Could not load this account profile.",
      );
    } finally {
      setUserProfileLoading(false);
    }
  };
  const closeUserProfile = () => {
    if (busy) return;
    setUserProfileModal(null);
    setUserProfileError("");
  };
  const closeAdminActionModal = () => {
    if (busy) return;
    setAdminActionModal(null);
    setAdminActionReason("");
    setAdminActionPassword("");
    setAdminActionError("");
  };
  const submitAdminAction = async (event) => {
    event.preventDefault();
    if (!adminActionModal || busy) return;
    const reason = adminActionReason.trim();
    if (adminActionModal.requiresReason && !reason) {
      setAdminActionError("Enter a reason to continue.");
      adminActionReasonRef.current?.focus();
      return;
    }
    if (adminActionModal.requiresPassword && !adminActionPassword) {
      setAdminActionError("Enter your password to confirm this promotion.");
      adminActionPasswordRef.current?.focus();
      return;
    }
    const { action, success } = adminActionModal;
    if (adminActionModal.requiresPassword) {
      const password = adminActionPassword;
      setBusy(true);
      setError("");
      setNotice(null);
      setAdminActionError("");
      try {
        await action(reason.slice(0, 1000), password);
        setAdminActionModal(null);
        setAdminActionPassword("");
        setNotice(success);
        await load();
      } catch (actionError) {
        setAdminActionPassword("");
        setAdminActionError(
          actionError.message ||
            "Password confirmation failed. Please try again.",
        );
        window.setTimeout(() => adminActionPasswordRef.current?.focus(), 0);
      } finally {
        setBusy(false);
      }
      return;
    }
    setAdminActionModal(null);
    setAdminActionReason("");
    runAction(() => action(reason.slice(0, 1000)), success);
  };
  const closeFlagModal = () => {
    if (busy) return;
    setFlagDeckTarget(null);
    setFlagReason("");
    setFlagReasonError("");
  };
  const loadDeckPreview = async (deck) => {
    const requestId = ++deckPreviewRequestRef.current;
    setDeckPreview(deck);
    setDeckPreviewLoading(true);
    setDeckPreviewError("");
    try {
      const result = await CSM.api(
        `admin/decks/view&id=${encodeURIComponent(deck.id)}`,
      );
      if (requestId === deckPreviewRequestRef.current)
        setDeckPreview({
          ...result.deck,
          documents: result.documents || [],
        });
    } catch (requestError) {
      if (requestId === deckPreviewRequestRef.current)
        setDeckPreviewError(
          requestError.message || "Could not load this deck preview.",
        );
    } finally {
      if (requestId === deckPreviewRequestRef.current)
        setDeckPreviewLoading(false);
    }
  };
  const closeDeckPreview = () => {
    deckPreviewRequestRef.current++;
    setDeckPreview(null);
    setDeckPreviewLoading(false);
    setDeckPreviewError("");
  };
  const submitFlagReview = async (event) => {
    event.preventDefault();
    const reason = flagReason.trim();
    if (!reason) {
      setFlagReasonError(
        "Enter a reason so the moderation team can review this deck.",
      );
      flagReasonRef.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setNotice(null);
    setFlagReasonError("");
    try {
      await CSM.api("admin/decks/flag", "POST", {
        deckId: flagDeckTarget.id,
        reason: reason.slice(0, 1000),
      });
      setNotice("Deck added to the review queue.");
      setFlagDeckTarget(null);
      setFlagReason("");
      await load();
    } catch (requestError) {
      setFlagReasonError(
        requestError.message ||
          "The deck could not be flagged. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!flagDeckTarget) {
      flagTriggerRef.current?.focus();
      return undefined;
    }
    flagReasonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        closeFlagModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flagDeckTarget, busy]);
  useEffect(() => {
    if (!adminActionModal) {
      adminActionTriggerRef.current?.focus();
      return undefined;
    }
    (adminActionModal.requiresReason
      ? adminActionReasonRef.current
      : adminActionModal.requiresPassword
        ? adminActionPasswordRef.current
        : adminActionConfirmRef.current
    )?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        closeAdminActionModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [adminActionModal, busy]);
  useEffect(() => {
    if (!deckPreview) {
      deckPreviewTriggerRef.current?.focus();
      return undefined;
    }
    deckPreviewCloseRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDeckPreview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [Boolean(deckPreview)]);
  useEffect(() => {
    if (!userProfileModal) {
      userProfileTriggerRef.current?.focus();
      return undefined;
    }
    userProfileCloseRef.current?.focus();
    return undefined;
  }, [Boolean(userProfileModal)]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(deckTotal / 10));
    if (deckPage > lastPage) setDeckPage(lastPage);
  }, [deckPage, deckTotal]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(userTotal / 10));
    if (userPage > lastPage) setUserPage(lastPage);
  }, [userPage, userTotal]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(eventTotal / 10));
    if (eventPage > lastPage) setEventPage(lastPage);
  }, [eventPage, eventTotal]);
  const today = new Date();
  const maxAvailableDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const updateDateFilter = (field, value, resetEventPage) => {
    if (!value) {
      setDateFilterError("Choose a date to view the activity period.");
      return;
    }
    if (value > maxAvailableDate) {
      setDateFilterError(
        "Future dates are not available yet. Choose today or an earlier date.",
      );
      return;
    }
    if (field === "from" && range.to && value > range.to) {
      setDateFilterError("The start date must be on or before the end date.");
      return;
    }
    if (field === "to" && range.from && value < range.from) {
      setDateFilterError("The end date must be on or after the start date.");
      return;
    }
    setDateFilterError("");
    setActivitySummaryPage(1);
    rangeTouchedRef.current = true;
    rangeInitializedRef.current = true;
    if (resetEventPage) setEventPage(1);
    setRange((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const dateFilters = (label = "Activity period", resetEventPage = false) => (
    <div className="csm-admin-date-filter">
      <span>{label}</span>
      <label>
        From
        <input
          type="date"
          max={
            range.to && range.to < maxAvailableDate
              ? range.to
              : maxAvailableDate
          }
          value={range.from}
          aria-invalid={dateFilterError ? "true" : undefined}
          aria-describedby={
            dateFilterError ? "admin-date-filter-error" : undefined
          }
          onChange={(event) =>
            updateDateFilter("from", event.target.value, resetEventPage)
          }
        />
      </label>
      <label>
        To
        <input
          type="date"
          min={range.from || undefined}
          max={maxAvailableDate}
          value={range.to}
          aria-invalid={dateFilterError ? "true" : undefined}
          aria-describedby={
            dateFilterError ? "admin-date-filter-error" : undefined
          }
          onChange={(event) =>
            updateDateFilter("to", event.target.value, resetEventPage)
          }
        />
      </label>
      {dateFilterError && (
        <span
          id="admin-date-filter-error"
          className="csm-admin-date-error"
          role="alert"
        >
          {dateFilterError}
        </span>
      )}
    </div>
  );
  const buildAdminPagination = (label, page, total, setPage) => {
    const pageCount = Math.max(1, Math.ceil(total / 10));
    const pageItems = getCompactPageItems(page, pageCount);
    return (
      total > 10 && (
        <nav className="csm-admin-pagination" aria-label={`${label} pages`}>
          <span className="csm-admin-pagination-summary">
            Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of{" "}
            {total} {label.toLowerCase()}
          </span>
          <div className="csm-admin-pagination-controls">
            <button
              type="button"
              className="csm-admin-page-button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            {pageItems.map((item) =>
              item.type === "ellipsis" ? (
                <span
                  key={item.key}
                  className="csm-admin-page-ellipsis"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  key={item.value}
                  type="button"
                  className={`csm-admin-page-number ${item.value === page ? "active" : ""}`}
                  aria-label={`Page ${item.value}`}
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
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
              disabled={page === pageCount}
            >
              Next
            </button>
          </div>
        </nav>
      )
    );
  };
  const deckPagination = buildAdminPagination(
    "Decks",
    deckPage,
    deckTotal,
    setDeckPage,
  );
  const userPagination = buildAdminPagination(
    "Users",
    userPage,
    userTotal,
    setUserPage,
  );
  const eventPagination = buildAdminPagination(
    "Security events",
    eventPage,
    eventTotal,
    setEventPage,
  );
  const activitySummaryRows =
    dashboard?.days?.slice(
      (activitySummaryPage - 1) * 10,
      activitySummaryPage * 10,
    ) || [];
  const activitySummaryPagination = buildAdminPagination(
    "Activity days",
    activitySummaryPage,
    dashboard?.days?.length || 0,
    setActivitySummaryPage,
  );
  const sections = [
    ["overview", "Overview"],
    ["content", "Content"],
    ["reports", "Review queue"],
    ["users", "Users"],
    ...(isSuper
      ? [
          ["audit", "Security log"],
          ["system", "System"],
        ]
      : []),
  ];
  const profileReports =
    userProfileTab === "submitted"
      ? userProfileModal?.data?.submittedReports || []
      : userProfileModal?.data?.receivedReports || [];
  const profileReportPageSize = 4;
  const profileReportPageCount = Math.max(
    1,
    Math.ceil(profileReports.length / profileReportPageSize),
  );
  const currentProfileReportPage = Math.min(
    userProfileReportPage,
    profileReportPageCount,
  );
  const visibleProfileReports = profileReports.slice(
    (currentProfileReportPage - 1) * profileReportPageSize,
    currentProfileReportPage * profileReportPageSize,
  );
  const profileReportsView = profileReports.length ? (
    <>
      <div className="csm-admin-profile-report-grid">
        {visibleProfileReports.map((report) => (
          <article className="csm-admin-profile-report-card" key={report.id}>
            <div className="csm-admin-profile-report-card-head">
              <span
                className={`csm-admin-status ${report.status === "open" ? "is-locked" : ""}`}
              >
                {report.status}
              </span>
              <strong>{report.deck_title}</strong>
            </div>
            <small>
              {userProfileTab === "submitted"
                ? `Deck owner: ${report.deck_owner || "Unknown"}`
                : `Reported by: ${report.flagged_by || "Unknown"}`}
              {" · "}
              {new Date(`${report.created_at}Z`).toLocaleString()}
            </small>
            <p>{report.reason}</p>
          </article>
        ))}
      </div>
      {profileReports.length > profileReportPageSize && (
        <nav className="csm-admin-pagination csm-admin-profile-report-pagination" aria-label="Report pages">
          <span className="csm-admin-pagination-summary">
            Showing {(currentProfileReportPage - 1) * profileReportPageSize + 1}–
            {Math.min(currentProfileReportPage * profileReportPageSize, profileReports.length)} of {profileReports.length} reports
          </span>
          <div className="csm-admin-pagination-controls">
            <button
              type="button"
              className="csm-admin-page-button"
              onClick={() => setUserProfileReportPage((page) => Math.max(1, page - 1))}
              disabled={currentProfileReportPage === 1}
            >
              Previous
            </button>
            {getCompactPageItems(currentProfileReportPage, profileReportPageCount).map((item) =>
              item.type === "ellipsis" ? (
                <span key={item.key} className="csm-admin-page-ellipsis" aria-hidden="true">…</span>
              ) : (
                <button
                  key={item.value}
                  type="button"
                  className={`csm-admin-page-number ${item.value === currentProfileReportPage ? "active" : ""}`}
                  aria-label={`Page ${item.value}`}
                  aria-current={item.value === currentProfileReportPage ? "page" : undefined}
                  onClick={() => setUserProfileReportPage(item.value)}
                >
                  {item.value}
                </button>
              ),
            )}
            <button
              type="button"
              className="csm-admin-page-button"
              onClick={() => setUserProfileReportPage((page) => Math.min(profileReportPageCount, page + 1))}
              disabled={currentProfileReportPage === profileReportPageCount}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </>
  ) : (
    <div className="csm-admin-empty">
      {userProfileTab === "submitted"
        ? "This account has not submitted any deck reports."
        : "No reports have been filed against this account’s decks."}
    </div>
  );
  return (
    <div className="csm-screen custom-scroll csm-admin-screen">
      <AdminReportArrivalNotice profile={profile} />
      <div className="csm-page-head csm-admin-page-head">
        <div>
          <span className="csm-kicker">WORKSPACE ADMINISTRATION</span>
          <h1>Admin console</h1>
          <p>Review app activity and manage accounts and study content.</p>
        </div>
        <span className={`csm-admin-role-pill ${isSuper ? "is-super" : ""}`}>
          {isSuper ? "Superadmin" : "Admin"}
        </span>
      </div>
      <div
        className="csm-admin-tabs"
        role="tablist"
        aria-label="Admin console sections"
      >
        {sections.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={`${section === id ? "active" : ""}${id === "reports" && openReportCount > 0 ? " has-open-reports" : ""}`}
            onClick={() => {
              if (id === "content") setDeckPage(1);
              if (id === "users") setUserPage(1);
              if (id === "audit") setEventPage(1);
              setSection(id);
              setNotice(null);
              setError("");
            }}
          >
            {label}
            {id === "reports" && openReportCount > 0 && (
              <span
                className="csm-admin-review-dot"
                aria-label={`${openReportCount} open reports`}
                title={`${openReportCount} open reports`}
              />
            )}
          </button>
        ))}
      </div>
      {error && (
        <div className="csm-admin-alert is-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div
          className="csm-deck-visibility-toast"
          role="status"
          aria-live="polite"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
          <span>{notice}</span>
        </div>
      )}

      {section === "overview" && (
        <>
          {dateFilters()}
          {dashboard?.beforeLaunch && (
            <div className="csm-admin-date-before-launch" role="status">
              No activity is available before the first account was registered
              on {dashboard.startDate}. Period metrics are shown as zero.
            </div>
          )}
          {!dashboard && !error ? (
            <div className="csm-admin-empty">Loading activity…</div>
          ) : (
            dashboard && (
              <>
                <div className="csm-admin-metrics">
                  {[
                    ["Total users", dashboard.totals.users],
                    ["Active now", dashboard.totals.activeNow],
                    ["Active users (period)", dashboard.period.activeUsers],
                    ["Total decks", dashboard.totals.decks],
                    ["PDF uploads (period)", dashboard.period.uploads],
                    ["Challenge sessions (period)", dashboard.period.sessions],
                    [
                      "PDF storage",
                      `${(dashboard.totals.storageBytes / 1048576).toFixed(1)} MB`,
                    ],
                  ].map(([label, value]) => (
                    <article
                      className={`csm-admin-metric ${label === "Active now" ? "is-live" : ""}`}
                      key={label}
                    >
                      <span>{label}</span>
                      <strong>{value}</strong>
                      {label === "Active now" && (
                        <small>Seen in the last 5 minutes</small>
                      )}
                    </article>
                  ))}
                </div>
                <div className="csm-admin-card">
                  <div className="csm-admin-card-head">
                    <div>
                      <span className="csm-kicker">SELECTED PERIOD</span>
                      <h2>Activity summary</h2>
                    </div>
                    <div className="csm-admin-content-tools">
                      <span className="csm-admin-subtle">
                        {dashboard.from} – {dashboard.to}
                      </span>
                      <button
                        type="button"
                        className="csm-secondary-button"
                        disabled={busy}
                        onClick={() =>
                          downloadAdminCsv(
                            `admin/dashboard/export&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
                            `co-studymaxx-activity-summary-${range.from}-to-${range.to}.csv`,
                            "CSV export started.",
                          )
                        }
                      >
                        <IconDownload />
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="csm-admin-period-grid">
                    {[
                      ["Active users", dashboard.period.activeUsers],
                      ["New users", dashboard.period.newUsers],
                      ["New decks", dashboard.period.newDecks],
                      ["Documents uploaded", dashboard.period.uploads],
                      ["Challenge sessions", dashboard.period.sessions],
                      [
                        "Sessions completed",
                        dashboard.period.completedSessions,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  {dashboard.days.length ? (
                    <div className="csm-admin-table-wrap">
                      <table className="csm-admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Active users</th>
                            <th>Decks</th>
                            <th>Uploads</th>
                            <th>Challenge sessions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activitySummaryRows.map((day) => (
                            <tr key={day.date}>
                              <td>{day.date}</td>
                              <td>{day.activeUsers}</td>
                              <td>{day.decks}</td>
                              <td>{day.uploads}</td>
                              <td>{day.arenaSessions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="csm-admin-table-wrap">
                      <table className="csm-admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Active users</th>
                            <th>Decks</th>
                            <th>Uploads</th>
                            <th>Challenge sessions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              {dashboard.from === dashboard.to
                                ? dashboard.from
                                : "Selected period"}
                            </td>
                            <td>0</td>
                            <td>0</td>
                            <td>0</td>
                            <td>0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {activitySummaryPagination}
                </div>
                <div className="csm-admin-card csm-admin-review-preview">
                  <div className="csm-admin-card-head">
                    <div>
                      <span className="csm-kicker">NEEDS ATTENTION</span>
                      <h2>Flagged review preview</h2>
                    </div>
                    <div className="csm-admin-review-preview-actions">
                      <span className="csm-admin-subtle">
                        {reports.length} open
                      </span>
                      <button
                        type="button"
                        className="csm-secondary-button"
                        onClick={() => setSection("reports")}
                      >
                        Open review queue
                      </button>
                    </div>
                  </div>
                  {reports.length ? (
                    <div className="csm-admin-report-list">
                      {reports.slice(0, 3).map((report) => (
                        <article className="csm-admin-report" key={report.id}>
                          <div>
                            <span className="csm-admin-status is-locked">
                              Open review
                            </span>
                            <h3>{report.deckTitle}</h3>
                            <p>
                              {report.subject || "No subject"} · owner{" "}
                              {report.owner} · reported by{" "}
                              {report.flaggedBy || "staff"}
                            </p>
                            <blockquote>{report.reason}</blockquote>
                            <small>
                              Reported{" "}
                              {new Date(
                                `${report.created_at}Z`,
                              ).toLocaleString()}
                            </small>
                          </div>
                          <div className="csm-admin-row-actions">
                            <button
                              type="button"
                              className="csm-secondary-button"
                              disabled={deckPreviewLoading}
                              onClick={(event) => {
                                deckPreviewTriggerRef.current = event.currentTarget;
                                loadDeckPreview({
                                  id: report.deckId,
                                  title: report.deckTitle,
                                  subject: report.subject,
                                  owner: report.owner,
                                });
                              }}
                            >
                              {deckPreviewLoading &&
                              deckPreview?.id === report.deckId
                                ? "Loading deck…"
                                : "View deck"}
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
                  {reports.length > 3 && (
                    <button
                      type="button"
                      className="csm-admin-review-preview-more"
                      onClick={() => setSection("reports")}
                    >
                      View all {reports.length} reviews
                    </button>
                  )}
                </div>
              </>
            )
          )}
        </>
      )}

      {(section === "users" || section === "content") && (
        <div className="csm-admin-card">
          <div className="csm-admin-card-head">
            <div>
              <span className="csm-kicker">
                {section === "users"
                  ? "ACCOUNT DIRECTORY"
                  : "PRIVATE STUDY CONTENT"}
              </span>
              <h2>
                {section === "users" ? "User management" : "Deck moderation"}
              </h2>
              {section === "content" && (
                <small className="csm-admin-subtle">
                  Search or page through decks, then preview from a deck row.
                </small>
              )}
            </div>
            <div className="csm-admin-content-tools">
              {section === "users" ? (
                <div className="csm-admin-user-tools">
                  <div className="csm-admin-user-search-row">
                    <select
                      className="csm-admin-role-filter"
                      aria-label="Filter users by role"
                      value={userRoleFilter}
                      onChange={(event) => {
                        setUserRoleFilter(event.target.value);
                        setUserPage(1);
                      }}
                    >
                      <option value="all">All roles</option>
                      <option value="user">Users</option>
                      <option value="admin">Admins</option>
                      <option value="superadmin">Superadmins</option>
                    </select>
                    <form
                      className="csm-admin-search"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setUserPage(1);
                        load(search, deckPage, 1);
                      }}
                    >
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search username or email"
                        aria-label="Search"
                      />
                      <button className="csm-secondary-button" type="submit">
                        Search
                      </button>
                    </form>
                  </div>
                  <button
                    type="button"
                    className="csm-secondary-button"
                    disabled={busy}
                    onClick={() =>
                      downloadAdminCsv(
                        "admin/users/export",
                        "co-studymaxx-users.csv",
                        "User directory downloaded as CSV.",
                      )
                    }
                  >
                    <IconDownload />
                    Export all users CSV
                  </button>
                </div>
              ) : (
                <div className="csm-admin-content-search-stack">
                  <form
                    className="csm-admin-search"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setDeckPage(1);
                      load(search, 1);
                    }}
                  >
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search deck or owner"
                      aria-label="Search"
                    />
                    <button className="csm-secondary-button" type="submit">
                      Search
                    </button>
                  </form>
                  <button
                    type="button"
                    className="csm-secondary-button"
                    disabled={busy}
                    onClick={() =>
                      downloadAdminCsv(
                        "admin/content/export",
                        "co-studymaxx-content.csv",
                        "Workspace content downloaded as CSV.",
                      )
                    }
                  >
                    <IconDownload />
                    Export content CSV
                  </button>
                </div>
              )}
            </div>
          </div>
          {section === "users" ? (
            users.length ? (
              <div className="csm-admin-table-wrap">
                <table className="csm-admin-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Role</th>
                      <th>Decks / PDFs</th>
                      <th>Last active</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((account) => {
                      const isCurrentSuperadmin =
                        isSuper && account.username === profile?.username;
                      return (
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
                                {account.is_active_now && (
                                  <span
                                    className="csm-admin-online-dot"
                                    title="Online now"
                                    aria-label="Online now"
                                  />
                                )}
                              </span>
                              <div>
                                <strong>
                                  {account.username}
                                  {isCurrentSuperadmin && (
                                    <small className="csm-admin-self-label">
                                      You
                                    </small>
                                  )}
                                </strong>
                                <small>
                                  {account.email || "No email on file"}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {isSuper ? (
                              isCurrentSuperadmin ? (
                                <span
                                  className="csm-admin-status"
                                  title="Your own superadmin role cannot be changed here"
                                >
                                  Superadmin
                                </span>
                              ) : (
                                <select
                                  aria-label={`Role for ${account.username}`}
                                  value={account.role}
                                  disabled={busy}
                                  onChange={(event) => {
                                    const role = event.target.value;
                                    if (role !== account.role)
                                      requestAdminAction(event, {
                                        title:
                                          role === "superadmin"
                                            ? `Promote ${account.username} to superadmin?`
                                            : "Update account role?",
                                        message:
                                          role === "superadmin"
                                            ? `Promoting ${account.username} grants full superadmin privileges. Enter your current password to confirm.`
                                            : `Change ${account.username}'s role to ${role}?`,
                                        confirmLabel:
                                          role === "superadmin"
                                            ? "Promote to superadmin"
                                            : "Update role",
                                        requiresPassword: role === "superadmin",
                                        success:
                                          role === "superadmin"
                                            ? `${account.username} promoted to superadmin.`
                                            : "Account role updated.",
                                        action: (_reason, password) =>
                                          CSM.api("admin/users/role", "POST", {
                                            userId: account.id,
                                            role,
                                            ...(role === "superadmin"
                                              ? {
                                                  password,
                                                }
                                              : {}),
                                          }),
                                      });
                                  }}
                                >
                                  {["user", "admin", "superadmin"].map(
                                    (role) => (
                                      <option key={role}>{role}</option>
                                    ),
                                  )}
                                </select>
                              )
                            ) : (
                              <span className="csm-admin-status">
                                {account.role}
                              </span>
                            )}
                          </td>
                          <td>
                            {account.deck_count} / {account.document_count}
                          </td>
                          <td>
                            {account.last_active
                              ? new Date(
                                  `${account.last_active}Z`,
                                ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>
                            <div className="csm-admin-user-status-actions">
                              <div className="csm-admin-user-status-main">
                                <span
                                  className={`csm-admin-status ${account.banned_at ? "is-locked" : account.locked_until && new Date(`${account.locked_until}Z`) > new Date() ? "is-locked" : account.is_active_now ? "is-active" : "is-inactive"}`}
                                >
                                  {account.banned_at
                                    ? "Banned"
                                    : account.locked_until &&
                                        new Date(`${account.locked_until}Z`) >
                                          new Date()
                                      ? `Locked until ${new Date(`${account.locked_until}Z`).toLocaleString()}`
                                      : account.is_active_now
                                        ? "Active now"
                                        : "Inactive"}
                                </span>
                                {!account.banned_at &&
                                  account.locked_until &&
                                  new Date(`${account.locked_until}Z`) >
                                    new Date() && (
                                    <button
                                      type="button"
                                      className="csm-admin-account-action"
                                      disabled={busy}
                                      onClick={(event) =>
                                        requestAdminAction(event, {
                                          title: `Unlock ${account.username}?`,
                                          message:
                                            "This clears the temporary sign-in lock for this account.",
                                          confirmLabel: "Unlock account",
                                          requiresReason: true,
                                          reasonLabel: "Reason for unlocking",
                                          success: "Account unlocked.",
                                          action: (reason) =>
                                            CSM.api(
                                              "admin/users/unlock",
                                              "POST",
                                              {
                                                userId: account.id,
                                                reason,
                                              },
                                            ),
                                        })
                                      }
                                    >
                                      Unlock
                                    </button>
                                  )}
                              </div>
                              <div className="csm-admin-deck-menu">
                                <details>
                                  <summary
                                    className="csm-admin-deck-menu-trigger csm-admin-user-menu-trigger"
                                    aria-label={`Actions for ${account.username}`}
                                    title="Account actions"
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
                                  <div className="csm-admin-deck-menu-popover csm-admin-user-menu-popover">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        const details =
                                          event.currentTarget.closest(
                                            "details",
                                          );
                                        userProfileTriggerRef.current =
                                          details.querySelector("summary");
                                        details.open = false;
                                        viewAccountProfile(event, account);
                                      }}
                                    >
                                      <IconUser />
                                      View profile
                                    </button>
                                  </div>
                                </details>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="csm-admin-empty">
                No accounts match this search.
              </div>
            )
          ) : (
            <>
              {decks.length ? (
                <div className="csm-admin-table-wrap">
                  <table className="csm-admin-table csm-admin-decks-table">
                    <thead>
                      <tr>
                        <th>Deck</th>
                        <th>Owner</th>
                        <th>Cards / PDFs</th>
                        <th>Visibility</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decks.map((deck) => (
                        <tr key={deck.id}>
                          <td>
                            <strong>{deck.title}</strong>
                            <small>
                              {deck.subject || "No subject"} ·{" "}
                              {deck.open_reports} open report(s)
                            </small>
                          </td>
                          <td>{deck.owner}</td>
                          <td>
                            {deck.card_count} / {deck.document_count}
                          </td>
                          <td>
                            <span
                              className={`csm-admin-status ${deck.moderation_status === "hidden" ? "is-locked" : ""}`}
                            >
                              {deck.moderation_status}
                            </span>
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
                                    disabled={busy || deckPreviewLoading}
                                    onClick={(event) => {
                                      const details =
                                        event.currentTarget.closest("details");
                                      deckPreviewTriggerRef.current =
                                        details.querySelector("summary");
                                      details.open = false;
                                      loadDeckPreview(deck);
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
                                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                      <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    {deckPreviewLoading &&
                                    deckPreview?.id === deck.id
                                      ? "Loading..."
                                      : "View deck"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={(event) => {
                                      const details =
                                        event.currentTarget.closest("details");
                                      flagTriggerRef.current =
                                        details.querySelector("summary");
                                      details.open = false;
                                      setFlagDeckTarget(deck);
                                      setFlagReason("");
                                      setFlagReasonError("");
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
                                      <path d="M4 22V4" />
                                      <path d="M4 4c5-4 11 4 16 0v12c-5 4-11-4-16 0" />
                                    </svg>
                                    Flag for review
                                  </button>
                                  <button
                                    type="button"
                                    className={
                                      deck.moderation_status === "hidden"
                                        ? "is-restore"
                                        : "is-danger"
                                    }
                                    disabled={busy}
                                    onClick={(event) => {
                                      const details =
                                        event.currentTarget.closest("details");
                                      adminActionTriggerRef.current =
                                        details.querySelector("summary");
                                      details.open = false;
                                      const action =
                                        deck.moderation_status === "hidden"
                                          ? "restore"
                                          : "hide";
                                      requestAdminAction(event, {
                                        title: `${action === "hide" ? "Hide" : "Restore"} this deck?`,
                                        message: `${action === "hide" ? "The owner will lose access to" : "Make visible to its owner"} \"${deck.title}\". The owner will receive a notification with your review note.`,
                                        confirmLabel:
                                          action === "hide"
                                            ? "Hide deck"
                                            : "Restore deck",
                                        requiresReason: true,
                                        reasonLabel:
                                          "Review note for the owner",
                                        success: `Deck ${action === "hide" ? "hidden" : "restored"}.`,
                                        action: (reason) =>
                                          CSM.api(
                                            "admin/decks/visibility",
                                            "PATCH",
                                            {
                                              deckId: deck.id,
                                              action,
                                              reason,
                                            },
                                          ),
                                      });
                                      adminActionTriggerRef.current =
                                        details.querySelector("summary");
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
                                      {deck.moderation_status === "hidden" ? (
                                        <>
                                          <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
                                          <path d="M21 3v5h-5" />
                                          <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
                                          <path d="M3 21v-5h5" />
                                        </>
                                      ) : (
                                        <>
                                          <path d="M3 3l18 18" />
                                          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                          <path d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.2 4.1" />
                                          <path d="M6.6 6.6C3.6 8.3 2 12 2 12s3.5 7 10 7c1 0 2-.2 2.9-.5" />
                                        </>
                                      )}
                                    </svg>
                                    {deck.moderation_status === "hidden"
                                      ? "Restore"
                                      : "Hide"}
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
                  No decks match this search.
                </div>
              )}
              {deckPagination}
            </>
          )}
        </div>
      )}
      {section === "users" && userPagination}

      {section === "reports" && (
        <div className="csm-admin-card">
          <div className="csm-admin-card-head">
            <div>
              <span className="csm-kicker">STAFF REVIEW QUEUE</span>
              <h2>Flagged decks</h2>
            </div>
            <span className="csm-admin-subtle">
              Private content is only visible to its owner and authorized staff.
            </span>
          </div>
          {reports.length ? (
            <div className="csm-admin-report-list">
              {reports.map((report) => (
                <article className="csm-admin-report" key={report.id}>
                  <div>
                    <div className="csm-admin-report-heading">
                      <span className="csm-admin-status is-locked">
                        Open review
                      </span>
                      <button
                        type="button"
                        className="csm-secondary-button csm-admin-report-view-button"
                        disabled={deckPreviewLoading}
                        onClick={(event) => {
                          deckPreviewTriggerRef.current = event.currentTarget;
                          loadDeckPreview({
                            id: report.deckId,
                            title: report.deckTitle,
                            subject: report.subject,
                            owner: report.owner,
                          });
                        }}
                      >
                        {deckPreviewLoading && deckPreview?.id === report.deckId
                          ? "Loading deck…"
                          : "View deck"}
                      </button>
                    </div>
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
                      disabled={busy}
                      onClick={(event) =>
                        requestAdminAction(event, {
                          title: "Dismiss this report?",
                          message: `This report will be closed without hiding “${report.deckTitle}”. The deck owner will be notified of the review outcome.`,
                          confirmLabel: "Dismiss report",
                          requiresReason: true,
                          reasonLabel: "Review note for the owner",
                          success: "Report dismissed.",
                          action: (reason) =>
                            CSM.api("admin/reports", "PATCH", {
                              id: Number(report.id),
                              action: "dismiss",
                              reason,
                            }),
                        })
                      }
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="csm-primary-button"
                      disabled={busy}
                      onClick={(event) =>
                        requestAdminAction(event, {
                          title: "Hide this deck?",
                          message: `“${report.deckTitle}” will be hidden from its owner. They will receive a notification with your review note.`,
                          confirmLabel: "Hide deck",
                          requiresReason: true,
                          reasonLabel: "Review note for the owner",
                          success:
                            "Deck hidden and moderation action recorded.",
                          action: (reason) =>
                            CSM.api("admin/reports", "PATCH", {
                              id: Number(report.id),
                              action: "hide",
                              reason,
                            }),
                        })
                      }
                    >
                      Hide deck
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="csm-admin-empty">
              No decks are waiting for review.
            </div>
          )}
        </div>
      )}

      {section === "audit" && isSuper && (
        <>
          {dateFilters("Security event period", true)}
          <div className="csm-admin-card">
            <div className="csm-admin-card-head">
              <div>
                <span className="csm-kicker">SUPERADMIN ONLY</span>
                <h2>Security event log</h2>
              </div>
              <div className="csm-admin-content-tools">
                <span className="csm-admin-subtle">
                  IP addresses are stored as one-way hashes.
                </span>
                <button
                  type="button"
                  className="csm-secondary-button"
                  disabled={busy}
                  onClick={() =>
                    downloadAdminCsv(
                      `admin/audit/export&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
                      `co-studymaxx-security-events-${range.from}-to-${range.to}.csv`,
                      "Security event log downloaded as CSV.",
                    )
                  }
                >
                  <IconDownload />
                  Export CSV
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
                      <th>Non-sensitive details</th>
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
                          <code>{JSON.stringify(event.details)}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="csm-admin-empty">
                No security events were recorded in this date range.
              </div>
            )}
          </div>
          {eventPagination}
        </>
      )}

      {section === "system" && isSuper && (
        <div className="csm-admin-system-grid">
          {settings && (
            <>
              <section className="csm-admin-card">
                <span className="csm-kicker">SERVICE AVAILABILITY</span>
                <h2>Maintenance mode</h2>
                <p>
                  When enabled, regular accounts cannot load or change workspace
                  data. Administrators can continue working; sign-in and
                  sign-out remain available.
                </p>
                <div className="csm-admin-setting-row">
                  <span
                    className={`csm-admin-status ${settings.maintenanceMode ? "is-locked" : ""}`}
                  >
                    {settings.maintenanceMode ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    className={
                      settings.maintenanceMode
                        ? "csm-secondary-button"
                        : "csm-primary-button"
                    }
                    disabled={busy}
                    onClick={(event) =>
                      requestAdminAction(event, {
                        title: `${settings.maintenanceMode ? "Disable" : "Enable"} maintenance mode?`,
                        message: settings.maintenanceMode
                          ? "Regular users will be able to access the workspace again."
                          : "Regular users will see the maintenance page. Admins and superadmins can continue working.",
                        confirmLabel: settings.maintenanceMode
                          ? "Disable maintenance"
                          : "Enable maintenance",
                        success: `Maintenance mode ${settings.maintenanceMode ? "disabled" : "enabled"}.`,
                        action: async () =>
                          setSettings(
                            await CSM.api("admin/settings", "PATCH", {
                              maintenanceMode: !settings.maintenanceMode,
                            }),
                          ),
                      })
                    }
                  >
                    {settings.maintenanceMode ? "Disable" : "Enable"}
                  </button>
                </div>
              </section>
              <section className="csm-admin-card">
                <span className="csm-kicker">DOCUMENT STORAGE</span>
                <h2>Global PDF storage limit</h2>
                <p>
                  Limits the combined stored PDF size across all accounts.
                  Existing files are retained if the limit is reduced.
                </p>
                <form
                  className="csm-admin-storage-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const bytes = Math.round(
                      Number(event.currentTarget.elements.storage.value) *
                        1048576,
                    );
                    requestAdminAction(event, {
                      title: "Update the storage limit?",
                      message:
                        "The new limit applies across all stored PDFs. Existing files will not be removed.",
                      confirmLabel: "Save storage limit",
                      success: "Storage limit updated.",
                      action: async () =>
                        setSettings(
                          await CSM.api("admin/settings", "PATCH", {
                            storageLimitBytes: bytes,
                          }),
                        ),
                    });
                  }}
                >
                  <label>
                    Limit in MiB
                    <input
                      name="storage"
                      type="number"
                      min="1"
                      max="1048576"
                      step="1"
                      defaultValue={Math.floor(
                        settings.storageLimitBytes / 1048576,
                      )}
                    />
                  </label>
                  <div className="csm-admin-subtle">
                    Currently used:{" "}
                    {(settings.storageUsedBytes / 1048576).toFixed(1)} MiB
                  </div>
                  <button
                    type="submit"
                    className="csm-secondary-button"
                    disabled={busy}
                  >
                    Save limit
                  </button>
                </form>
              </section>
              <section className="csm-admin-card csm-admin-danger-card">
                <span className="csm-kicker">SESSION SECURITY</span>
                <h2>Sign out all users</h2>
                <p>
                  Revokes every active login on every device, including yours.
                  Everyone must sign in again.
                </p>
                <button
                  type="button"
                  className="csm-admin-danger-button"
                  disabled={busy}
                  onClick={(event) =>
                    requestAdminAction(event, {
                      title: "Sign out every user?",
                      message:
                        "This revokes every active login on every device, including yours. Everyone will need to sign in again.",
                      confirmLabel: "Clear all sessions",
                      danger: true,
                      success: "All sessions cleared.",
                      action: async () => {
                        const result = await CSM.api(
                          "admin/sessions/clear",
                          "POST",
                          {
                            confirm: true,
                          },
                        );
                        setNotice(
                          `${result.sessionsRemoved} sessions cleared; ${result.accountsInvalidated} accounts must sign in again.`,
                        );
                        setTimeout(
                          () =>
                            location.replace(
                              "login.html?mode=signin&reason=session_ended",
                            ),
                          1200,
                        );
                      },
                    })
                  }
                >
                  Clear all sessions
                </button>
              </section>
            </>
          )}
        </div>
      )}

      {(userProfileModal ||
        flagDeckTarget ||
        adminActionModal ||
        deckPreview) &&
        ReactDOM.createPortal(
          <>
            {userProfileModal && (
              <div
                className={`csm-modal-backdrop csm-admin-profile-backdrop${deckPreview ? " is-owner-profile-open" : ""}`}
                role="presentation"
                onClick={closeUserProfile}
              >
                <section
                  className="csm-admin-profile-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-user-profile-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="csm-admin-profile-header">
                    <div className="csm-admin-profile-identity">
                      <span
                        className="csm-admin-avatar"
                        style={{
                          background:
                            adminAvatarBackgrounds[
                              userProfileModal.data?.account?.avatar ||
                                userProfileModal.account.avatar
                            ] || adminAvatarBackgrounds.ember,
                        }}
                        aria-hidden="true"
                      >
                        {getAccountInitials(
                          userProfileModal.data?.account ||
                            userProfileModal.account,
                        )}
                      </span>
                      <div>
                        <span className="csm-kicker">USER PROFILE</span>
                        <h2 id="admin-user-profile-title">
                          {userProfileModal.data?.account?.display_name ||
                            userProfileModal.account.display_name ||
                            userProfileModal.account.username}
                        </h2>
                        <p>
                          @{userProfileModal.account.username} ·{" "}
                          {userProfileModal.data?.account?.email ||
                            userProfileModal.account.email ||
                            "No email on file"}
                        </p>
                      </div>
                    </div>
                    <button
                      ref={userProfileCloseRef}
                      type="button"
                      className="csm-admin-preview-close"
                      onClick={closeUserProfile}
                      aria-label="Close user profile"
                    >
                      ×
                    </button>
                  </header>
                  {userProfileError && (
                    <div className="csm-admin-alert is-error" role="alert">
                      {userProfileError}
                    </div>
                  )}
                  {userProfileNotice && (
                    <div className="csm-admin-alert is-success" role="status">
                      {userProfileNotice}
                    </div>
                  )}
                  {userProfileLoading ? (
                    <div className="csm-admin-empty" role="status">
                      Loading account profile…
                    </div>
                  ) : (
                    userProfileModal.data && (
                      <>
                        <div className="csm-admin-profile-summary">
                          <span
                            className={`csm-admin-status ${userProfileModal.data.account.banned_at ? "is-locked" : ""}`}
                          >
                            {userProfileModal.data.account.banned_at
                              ? "Banned"
                              : userProfileModal.data.account.role}
                          </span>
                          <span>
                            Joined{" "}
                            {new Date(
                              `${userProfileModal.data.account.created_at}Z`,
                            ).toLocaleDateString()}
                          </span>
                          <span>
                            {userProfileModal.data.account.deck_count} decks ·{" "}
                            {userProfileModal.data.account.document_count} PDFs
                          </span>
                          <span>
                            Last active{" "}
                            {userProfileModal.data.account.last_active
                              ? new Date(
                                  `${userProfileModal.data.account.last_active}Z`,
                                ).toLocaleString()
                              : "—"}
                          </span>
                        </div>
                        {userProfileModal.data.account.banned_at && (
                          <div
                            className="csm-admin-alert is-error"
                            role="status"
                          >
                            Banned{" "}
                            {new Date(
                              `${userProfileModal.data.account.banned_at}Z`,
                            ).toLocaleString()}
                            :{" "}
                            {userProfileModal.data.account.ban_reason ||
                              "No reason recorded."}
                          </div>
                        )}
                        <div
                          className="csm-admin-tabs csm-admin-profile-tabs"
                          role="tablist"
                          aria-label="User profile information"
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={userProfileTab === "activity"}
                            className={
                              userProfileTab === "activity" ? "active" : ""
                            }
                            onClick={() => setUserProfileTab("activity")}
                          >
                            Activity
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={userProfileTab === "submitted"}
                            className={
                              userProfileTab === "submitted" ? "active" : ""
                            }
                            onClick={() => {
                              setUserProfileTab("submitted");
                              setUserProfileReportPage(1);
                            }}
                          >
                            Reports submitted (
                            {userProfileModal.data.submittedReports.length})
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={userProfileTab === "received"}
                            className={
                              userProfileTab === "received" ? "active" : ""
                            }
                            onClick={() => {
                              setUserProfileTab("received");
                              setUserProfileReportPage(1);
                            }}
                          >
                            Reports on decks (
                            {userProfileModal.data.receivedReports.length})
                          </button>
                        </div>
                        <div className="csm-admin-profile-content">
                          {userProfileTab === "activity" &&
                            (userProfileModal.data.activity.length ? (
                              <div className="csm-admin-profile-list">
                                {userProfileModal.data.activity.map(
                                  (item, index) => (
                                    <article
                                      className="csm-admin-profile-activity"
                                      key={`${item.created_at}-${index}`}
                                    >
                                      <div>
                                        <strong>{item.material}</strong>
                                        <small>
                                          {item.mode} · {item.screen} ·{" "}
                                          {item.status}
                                          {item.accuracy !== null
                                            ? ` · ${Number(item.accuracy)}% accuracy`
                                            : ""}
                                        </small>
                                      </div>
                                      <time>
                                        {new Date(
                                          `${item.created_at}Z`,
                                        ).toLocaleString()}
                                      </time>
                                    </article>
                                  ),
                                )}
                              </div>
                            ) : (
                              <div className="csm-admin-empty">
                                No study activity has been recorded.
                              </div>
                            ))}
                          {(userProfileTab === "submitted" ||
                            userProfileTab === "received") &&
                            profileReportsView}
                        </div>
                      </>
                    )
                  )}
                  <footer className="csm-admin-profile-actions">
                    <button
                      type="button"
                      className="csm-secondary-button"
                      onClick={closeUserProfile}
                    >
                      Close
                    </button>
                    {userProfileModal.data?.account.role === "user" &&
                      userProfileModal.account.username !==
                        profile?.username && (
                        <>
                          {userProfileModal.data.account.banned_at ? (
                            <button
                              type="button"
                              className="csm-secondary-button"
                              disabled={busy}
                              onClick={(event) =>
                                requestAdminAction(event, {
                                  title: `Unban ${userProfileModal.account.username}?`,
                                  message:
                                    "This will allow the account to sign in again.",
                                  confirmLabel: "Unban account",
                                  requiresReason: true,
                                  reasonLabel: "Reason for unbanning",
                                  success: "Account unbanned.",
                                  action: async (reason) => {
                                    await CSM.api("admin/users/unban", "POST", {
                                      userId: userProfileModal.account.id,
                                      reason,
                                    });
                                    setUserProfileModal((current) =>
                                      current
                                        ? {
                                            ...current,
                                            data: {
                                              ...current.data,
                                              account: {
                                                ...current.data.account,
                                                banned_at: null,
                                                ban_reason: null,
                                              },
                                            },
                                          }
                                        : current,
                                    );
                                    setUserProfileNotice("Account unbanned.");
                                  },
                                })
                              }
                            >
                              Unban
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="csm-secondary-button"
                                disabled={busy}
                                onClick={(event) =>
                                  requestAdminAction(event, {
                                    title: `Warn ${userProfileModal.account.username}?`,
                                    message:
                                      "The user will receive this warning in their account notifications.",
                                    confirmLabel: "Send warning",
                                    requiresReason: true,
                                    reasonLabel: "Warning message and reason",
                                    success: "Warning sent to the user.",
                                    action: async (reason) => {
                                      await CSM.api(
                                        "admin/users/warn",
                                        "POST",
                                        {
                                          userId: userProfileModal.account.id,
                                          reason,
                                        },
                                      );
                                      setUserProfileNotice(
                                        "Warning sent to the user.",
                                      );
                                    },
                                  })
                                }
                              >
                                Warn user
                              </button>
                              <button
                                type="button"
                                className="csm-admin-danger-button"
                                disabled={busy}
                                onClick={(event) =>
                                  requestAdminAction(event, {
                                    title: `Ban ${userProfileModal.account.username}?`,
                                    message:
                                      "Banning immediately signs the account out and blocks future sign-ins. Add a reason for the audit record.",
                                    confirmLabel: "Ban account",
                                    requiresReason: true,
                                    reasonLabel: "Ban reason",
                                    danger: true,
                                    success: "Account banned and signed out.",
                                    action: async (reason) => {
                                      await CSM.api("admin/users/ban", "POST", {
                                        userId: userProfileModal.account.id,
                                        reason,
                                      });
                                      setUserProfileModal((current) =>
                                        current
                                          ? {
                                              ...current,
                                              data: {
                                                ...current.data,
                                                account: {
                                                  ...current.data.account,
                                                  banned_at:
                                                    new Date().toISOString(),
                                                  ban_reason: reason,
                                                },
                                              },
                                            }
                                          : current,
                                      );
                                      setUserProfileNotice(
                                        "Account banned and signed out.",
                                      );
                                    },
                                  })
                                }
                              >
                                Ban user
                              </button>
                            </>
                          )}
                        </>
                      )}
                  </footer>
                </section>
              </div>
            )}
            {flagDeckTarget && (
              <div
                className="csm-modal-backdrop csm-admin-flag-backdrop"
                role="presentation"
                onClick={closeFlagModal}
              >
                <form
                  className="csm-admin-flag-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-flag-title"
                  aria-describedby="admin-flag-description"
                  onSubmit={submitFlagReview}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="csm-admin-flag-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 21V4m0 1h12l-2.5 4L17 13H5" />
                    </svg>
                  </div>
                  <span className="csm-kicker">CONTENT MODERATION</span>
                  <h2 id="admin-flag-title">
                    Flag “{flagDeckTarget.code || flagDeckTarget.title}” for
                    review
                  </h2>
                  <p id="admin-flag-description">
                    Tell the moderation team why this reviewer needs attention.
                    Your reason will be included in the private review queue.
                  </p>
                  <label
                    className="csm-admin-flag-label"
                    htmlFor="admin-flag-reason"
                  >
                    Reason for review
                  </label>
                  <textarea
                    id="admin-flag-reason"
                    ref={flagReasonRef}
                    value={flagReason}
                    onChange={(event) => {
                      setFlagReason(event.target.value);
                      if (flagReasonError) setFlagReasonError("");
                    }}
                    maxLength={1000}
                    rows={4}
                    placeholder="Describe the concern…"
                    disabled={busy}
                    aria-required="true"
                    aria-invalid={Boolean(flagReasonError)}
                    aria-describedby={
                      flagReasonError
                        ? "admin-flag-description admin-flag-error"
                        : "admin-flag-description"
                    }
                  />
                  <div className="csm-admin-flag-meta">
                    <span>{flagReason.length}/1000</span>
                    {flagReasonError && (
                      <span
                        id="admin-flag-error"
                        className="csm-admin-flag-error"
                        role="alert"
                      >
                        {flagReasonError}
                      </span>
                    )}
                  </div>
                  <div className="csm-admin-flag-actions">
                    <button
                      type="button"
                      className="csm-secondary-button"
                      onClick={closeFlagModal}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="csm-primary-button"
                      disabled={busy}
                    >
                      {busy ? "Submitting…" : "Submit flag"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            {adminActionModal && (
              <div
                className="csm-modal-backdrop csm-admin-action-backdrop"
                role="presentation"
                onClick={closeAdminActionModal}
              >
                <form
                  className="csm-admin-action-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-action-title"
                  aria-describedby="admin-action-description"
                  onSubmit={submitAdminAction}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div
                    className={`csm-admin-action-icon ${adminActionModal.danger ? "is-danger" : ""}`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" />
                      <path d="M12 8v4m0 4h.01" />
                    </svg>
                  </div>
                  <span className="csm-kicker">ADMIN ACTION</span>
                  <h2 id="admin-action-title">{adminActionModal.title}</h2>
                  <p id="admin-action-description">
                    {adminActionModal.message}
                  </p>
                  {adminActionModal.requiresPassword && (
                    <>
                      <label
                        className="csm-admin-flag-label"
                        htmlFor="admin-action-password"
                      >
                        Your current password
                      </label>
                      <input
                        id="admin-action-password"
                        ref={adminActionPasswordRef}
                        type="password"
                        autoComplete="current-password"
                        value={adminActionPassword}
                        onChange={(event) => {
                          setAdminActionPassword(event.target.value);
                          if (adminActionError) setAdminActionError("");
                        }}
                        maxLength={72}
                        aria-required="true"
                        aria-invalid={Boolean(adminActionError)}
                        aria-describedby={
                          adminActionError
                            ? "admin-action-description admin-action-password-error"
                            : "admin-action-description"
                        }
                      />
                      {adminActionError && (
                        <p
                          id="admin-action-password-error"
                          className="csm-admin-flag-error"
                          role="alert"
                        >
                          {adminActionError}
                        </p>
                      )}
                    </>
                  )}
                  {adminActionModal.requiresReason && (
                    <>
                      <label
                        className="csm-admin-flag-label"
                        htmlFor="admin-action-reason"
                      >
                        {adminActionModal.reasonLabel || "Reason"}
                      </label>
                      <textarea
                        id="admin-action-reason"
                        ref={adminActionReasonRef}
                        value={adminActionReason}
                        onChange={(event) => {
                          setAdminActionReason(event.target.value);
                          if (adminActionError) setAdminActionError("");
                        }}
                        maxLength={1000}
                        rows={4}
                        placeholder="Add a clear note…"
                        aria-required="true"
                        aria-invalid={Boolean(adminActionError)}
                        aria-describedby={
                          adminActionError
                            ? "admin-action-description admin-action-error"
                            : "admin-action-description"
                        }
                      />
                      <div className="csm-admin-flag-meta">
                        <span>{adminActionReason.length}/1000</span>
                        {adminActionError && (
                          <span
                            id="admin-action-error"
                            className="csm-admin-flag-error"
                            role="alert"
                          >
                            {adminActionError}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  <div className="csm-admin-flag-actions">
                    <button
                      type="button"
                      className="csm-secondary-button"
                      onClick={closeAdminActionModal}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      ref={adminActionConfirmRef}
                      type="submit"
                      className={
                        adminActionModal.danger
                          ? "csm-admin-danger-button"
                          : "csm-primary-button"
                      }
                      disabled={busy}
                    >
                      {busy
                        ? "Working…"
                        : adminActionModal.confirmLabel || "Continue"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            {deckPreview && (
              <div
                className={`csm-modal-backdrop csm-admin-preview-backdrop${userProfileModal ? " is-owner-profile-open" : ""}`}
                role="presentation"
                onClick={closeDeckPreview}
                aria-hidden={Boolean(userProfileModal)}
              >
                <section
                  className="csm-admin-preview-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-preview-title"
                  aria-describedby="admin-preview-description"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="csm-admin-preview-header">
                    <div>
                      <span className="csm-kicker">
                        AUTHORIZED STAFF · READ ONLY
                      </span>
                      <h2 id="admin-preview-title">
                        {deckPreview.title ||
                          deckPreview.code ||
                          "Deck preview"}
                      </h2>
                      <p>
                        {deckPreview.owner ? (
                          <>
                            Owned by{" "}
                            <button
                              type="button"
                              className="csm-admin-preview-owner"
                              disabled={!deckPreview.owner_id}
                              aria-label={`View ${deckPreview.owner}'s profile`}
                              onClick={(event) =>
                                viewAccountProfile(event, {
                                  id: deckPreview.owner_id,
                                  username: deckPreview.owner,
                                  display_name: deckPreview.owner,
                                })
                              }
                            >
                              {deckPreview.owner}
                            </button>
                          </>
                        ) : (
                          "Loading deck owner…"
                        )}{" "}
                        · {deckPreview.subject || "No subject"} ·{" "}
                        {deckPreview.document_count || 0} PDF(s)
                      </p>
                    </div>
                    <div className="csm-admin-preview-header-actions">
                      <button
                        type="button"
                        className="csm-secondary-button"
                        onClick={() => loadDeckPreview(deckPreview)}
                        disabled={deckPreviewLoading}
                      >
                        {deckPreviewLoading ? "Refreshing…" : "Refresh"}
                      </button>
                      <button
                        ref={deckPreviewCloseRef}
                        type="button"
                        className="csm-admin-preview-close"
                        onClick={closeDeckPreview}
                        aria-label="Close deck preview"
                      >
                        ×
                      </button>
                    </div>
                  </header>
                  <p
                    className="csm-admin-preview-description"
                    id="admin-preview-description"
                  >
                    View only this account’s attached PDF materials. Staff
                    access is read-only and recorded for moderation oversight.
                  </p>
                  <div className="csm-admin-preview-content">
                    {deckPreviewLoading ? (
                      <div className="csm-admin-empty" role="status">
                        Loading the latest deck contents…
                      </div>
                    ) : deckPreviewError ? (
                      <div className="csm-admin-alert is-error" role="alert">
                        {deckPreviewError}
                      </div>
                    ) : (
                      <>
                        <section
                          className="csm-admin-preview-documents"
                          aria-label="PDF files attached to this deck"
                        >
                          <div className="csm-admin-preview-documents-heading">
                            <div>
                              <span className="csm-kicker">
                                REFERENCE FILES
                              </span>
                              <h3>Attached PDFs</h3>
                            </div>
                            <span className="csm-admin-status">
                              {deckPreview.documents?.length || 0} files
                            </span>
                          </div>
                          {deckPreview.documents?.length ? (
                            <div className="csm-admin-preview-document-list">
                              {deckPreview.documents.map((file) => (
                                <article
                                  className="csm-admin-preview-document"
                                  key={file.id}
                                >
                                  <span
                                    className="csm-admin-preview-pdf-icon"
                                    aria-hidden="true"
                                  >
                                    PDF
                                  </span>
                                  <div className="csm-admin-preview-document-info">
                                    <strong>{file.title}</strong>
                                    <small>
                                      {(Number(file.size) / 1048576).toFixed(2)}{" "}
                                      MB · Uploaded{" "}
                                      {new Date(
                                        `${file.uploadedAt}Z`,
                                      ).toLocaleDateString()}
                                    </small>
                                  </div>
                                  <a
                                    className="csm-secondary-button"
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open PDF ↗
                                  </a>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="csm-admin-empty csm-admin-preview-document-empty">
                              No PDF files are attached to this deck.
                            </div>
                          )}
                        </section>
                      </>
                    )}
                  </div>
                  {deckPreview.updated_at && (
                    <footer className="csm-admin-preview-footer">
                      Last updated{" "}
                      {new Date(`${deckPreview.updated_at}Z`).toLocaleString()}
                    </footer>
                  )}
                </section>
              </div>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}
