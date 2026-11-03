import { CSM } from "../../services/client.js";
import { IconLogout, IconShare, IconUser } from "../icons.jsx";
import React from "react";
export function WorkspaceHeader({
  accountMenuOpen,
  activeTab,
  bombstyleActiveDeck,
  bombstylePhase,
  currentAvatar,
  currentSelectedDeck,
  defaultProfile,
  displayName,
  handleOpenAccount,
  isGuest,
  isStaff,
  mobileMenuOpen,
  notifications,
  notificationsOpen,
  notificationsUnread,
  notificationsWrapRef,
  profile,
  refreshNotifications,
  requestBombstyleExit,
  requestDeleteConfirmation,
  selectedDeckForFolderView,
  setAccountMenuOpen,
  setActiveTab,
  setBombstylePhase,
  setMobileMenuOpen,
  setNotifications,
  setNotificationsOpen,
  setNotificationsUnread,
  setSelectedDeckForFolderView,
  setSignOutConfirmationOpen,
  setSignOutError,
  sharedDeck,
  triggerToast,
}) {
  return (
    <header className="csm-topbar">
      <div className="csm-topbar-context">
        <button
          type="button"
          className="csm-mobile-navigation-trigger"
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <span className="csm-topbar-workspace">Workspace</span>
        <span className="csm-topbar-sep">/</span>
        <span className="csm-topbar-current">
          {activeTab === "home" && "Overview"}
          {activeTab === "library" &&
            (selectedDeckForFolderView
              ? currentSelectedDeck?.code || currentSelectedDeck?.title
              : "Reviewer Library")}
          {activeTab === "flashcards" && (
            <>
              <button
                type="button"
                className="csm-study-return-link"
                onClick={() => {
                  setActiveTab("library");
                }}
                aria-label={
                  selectedDeckForFolderView
                    ? `Return to ${currentSelectedDeck?.code || currentSelectedDeck?.title || "the selected reviewer"}`
                    : "Return to Reviewer Library"
                }
              >
                {selectedDeckForFolderView
                  ? currentSelectedDeck?.code ||
                    currentSelectedDeck?.title ||
                    "Reviewer Library"
                  : "Reviewer Library"}
              </button>
              <span className="csm-topbar-sep">/</span>
              <span className="text-slate-900 font-extrabold">Study</span>
            </>
          )}
          {activeTab === "creator" && (
            <>
              <span
                className="cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => {
                  setSelectedDeckForFolderView(null);
                  setActiveTab("library");
                }}
              >
                Reviewer Library
              </span>
              <span className="csm-topbar-sep">/</span>
              <span className="text-slate-900 font-extrabold">
                Create Bombcards
              </span>
            </>
          )}
          {activeTab === "highlighter" && "PDF Study Tool"}
          {activeTab === "archive" && (isStaff ? "Admin Archive" : "Archive")}
          {(activeTab === "arena" || activeTab === "game") && (
            <>
              <span
                className="cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() =>
                  requestBombstyleExit(() => setBombstylePhase("select_deck"))
                }
              >
                Challenge
              </span>
              <span className="csm-topbar-sep">/</span>
              <span
                className="text-slate-900 font-extrabold cursor-pointer hover:text-slate-700 transition-colors"
                onClick={() =>
                  requestBombstyleExit(() => setBombstylePhase("select_deck"))
                }
              >
                Bombstyle
              </span>
              {bombstylePhase === "configure" && (
                <>
                  <span className="csm-topbar-sep">/</span>
                  <span className="text-slate-500 font-medium">
                    {bombstyleActiveDeck?.code || "Configure"}
                  </span>
                </>
              )}
              {bombstylePhase === "gameplay" && bombstyleActiveDeck && (
                <>
                  <span className="csm-topbar-sep">/</span>
                  <span className="text-slate-500 font-medium">
                    {bombstyleActiveDeck.code}
                  </span>
                </>
              )}
              {bombstylePhase === "results" && (
                <>
                  <span className="csm-topbar-sep">/</span>
                  <span className="text-slate-500 font-medium">Results</span>
                </>
              )}
              {bombstylePhase === "review_missed" && (
                <>
                  <span className="csm-topbar-sep">/</span>
                  <span className="text-slate-500 font-medium">
                    Missed Cards
                  </span>
                </>
              )}
            </>
          )}
          {activeTab === "account" && "Account Settings"}
          {activeTab === "admin" && "Admin Console"}
          {activeTab === "people" && "Discover"}
        </span>
      </div>
      <div className="csm-topbar-role-slot">
        {["admin", "superadmin"].includes(profile.role) && (
          <span
            className={`csm-topbar-role ${profile.role === "superadmin" ? "is-super" : ""}`}
            aria-label={`Account role: ${profile.role === "superadmin" ? "Superadmin" : "Admin"}`}
            title={`Signed in as ${profile.role === "superadmin" ? "Superadmin" : "Admin"}`}
          >
            <IconUser className="csm-topbar-role-icon" />
            {profile.role === "superadmin" ? "Superadmin" : "Admin"}
          </span>
        )}
      </div>
      <div className="csm-top-actions">
        {isGuest ? (
          <div className="flex items-center gap-2.5">
            <span className="csm-guest-badge">
              <span className="csm-guest-dot animate-pulse" />
              Guest Mode
            </span>
            <button
              type="button"
              onClick={() => {
                const shareUrl = sharedDeck?.share?.url || window.location.href;
                navigator.clipboard
                  .writeText(shareUrl)
                  .then(() => triggerToast("Shared deck link copied!"));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#f04824] border border-[#f04824]/20 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Copy link to this shared reviewer"
            >
              <IconShare className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
            <a
              href="login.html?mode=signin"
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="login.html?mode=signup"
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#f04824] hover:bg-[#e03e1b] rounded-xl shadow-sm transition-all"
            >
              Sign Up
            </a>
          </div>
        ) : (
          <>
            <div className="csm-notifications-wrap" ref={notificationsWrapRef}>
              <button
                className={`csm-icon-button csm-notification ${notificationsUnread ? "" : "is-empty"}`}
                type="button"
                aria-label={
                  notificationsUnread
                    ? `Notifications, ${notificationsUnread} unread`
                    : "Notifications"
                }
                aria-expanded={notificationsOpen}
                title="Notifications"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  if (!notificationsOpen) refreshNotifications();
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
                {notificationsUnread > 0 && (
                  <span className="csm-notification-badge" aria-hidden="true">
                    {notificationsUnread > 99 ? "99+" : notificationsUnread}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div
                  className="csm-notifications-panel"
                  role="dialog"
                  aria-label="Notifications panel"
                >
                  <div className="csm-notifications-header">
                    <strong>Notifications</strong>
                    <span>
                      {notificationsUnread
                        ? `${notificationsUnread} unread`
                        : "All caught up"}
                    </span>
                  </div>
                  <div className="csm-notifications-list">
                    {notifications.length ? (
                      notifications.map((notification) => (
                        <article
                          className={`csm-notification-item ${notification.isRead ? "" : "is-unread"}`}
                          key={notification.id}
                        >
                          <span
                            className="csm-notification-item-icon"
                            aria-hidden="true"
                          >
                            {notification.type === "achievement_unlocked" ? (
                              <i className="bi bi-trophy-fill text-amber-500"></i>
                            ) : notification.type?.startsWith("deck") ? (
                              "▦"
                            ) : (
                              "•"
                            )}
                          </span>
                          <div className="csm-notification-item-copy">
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                            <time dateTime={notification.createdAt}>
                              {new Date(
                                `${notification.createdAt}Z`,
                              ).toLocaleString()}
                            </time>
                          </div>
                          {!notification.isRead && (
                            <button
                              className="csm-notification-mark-read"
                              type="button"
                              aria-label={`Mark ${notification.title} as read`}
                              onClick={async () => {
                                try {
                                  await CSM.api("notifications/read", "PATCH", {
                                    id: notification.id,
                                  });
                                  setNotifications((items) =>
                                    items.map((item) =>
                                      item.id === notification.id
                                        ? {
                                            ...item,
                                            isRead: true,
                                            readAt: new Date().toISOString(),
                                          }
                                        : item,
                                    ),
                                  );
                                  setNotificationsUnread((count) =>
                                    Math.max(0, count - 1),
                                  );
                                } catch (error) {
                                  triggerToast(error.message);
                                }
                              }}
                            >
                              Mark read
                            </button>
                          )}
                        </article>
                      ))
                    ) : (
                      <div className="csm-notifications-empty">
                        <span className="csm-notifications-empty-icon">
                          <i className="bi bi-check2-circle"></i>
                        </span>
                        <strong>No notifications</strong>
                        <p>
                          You’re all caught up. Achievements and deck review
                          updates will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="csm-notifications-actions">
                    <button
                      type="button"
                      disabled={!notificationsUnread}
                      onClick={async () => {
                        try {
                          await CSM.api("notifications/read", "PATCH", {});
                          setNotifications((items) =>
                            items.map((item) => ({
                              ...item,
                              isRead: true,
                              readAt: item.readAt || new Date().toISOString(),
                            })),
                          );
                          setNotificationsUnread(0);
                        } catch (error) {
                          triggerToast(error.message);
                        }
                      }}
                    >
                      Mark all as read
                    </button>
                    <button
                      type="button"
                      disabled={!notifications.length}
                      onClick={() => {
                        if (!notifications.length) return;
                        requestDeleteConfirmation({
                          title: "Clear all notifications?",
                          message:
                            "Every notification will be permanently removed from this list.",
                          confirmLabel: "Clear notifications",
                          action: async () => {
                            try {
                              await CSM.api("notifications", "DELETE");
                              setNotifications([]);
                              setNotificationsUnread(0);
                              triggerToast("Notifications cleared");
                            } catch (error) {
                              triggerToast(error.message);
                            }
                          },
                        });
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="csm-profile-wrap relative">
              <button
                className="csm-profile cursor-pointer"
                type="button"
                aria-label="Open profile menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((v) => !v)}
              >
                <span
                  className="csm-profile-avatar"
                  style={{
                    background: currentAvatar.background,
                  }}
                >
                  {currentAvatar.initials}
                </span>
                <span className="csm-profile-copy">
                  <strong>{displayName}</strong>
                  <small>@{profile.username || defaultProfile.username}</small>
                </span>
                <svg
                  className={`transition-transform duration-200 ${accountMenuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {accountMenuOpen && (
                <div
                  className="csm-account-dropdown animate-fadeIn"
                  role="menu"
                >
                  <div className="csm-account-dropdown-user">
                    <p>{displayName}</p>
                    <span>@{profile.username || defaultProfile.username}</span>
                  </div>
                  <button
                    type="button"
                    className="csm-account-dropdown-item"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      handleOpenAccount();
                    }}
                  >
                    <IconUser />
                    <span>Profile Settings</span>
                  </button>
                  <div className="csm-account-dropdown-divider" />
                  <button
                    type="button"
                    className="csm-account-dropdown-item danger"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setSignOutError("");
                      setSignOutConfirmationOpen(true);
                    }}
                  >
                    <IconLogout />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
