import {
  IconCards,
  IconHome,
  IconLibrary,
  IconLock,
  IconPdf,
  IconSearch,
  IconSparkles,
  IconUser,
} from "../icons.jsx";
import React from "react";
export function Sidebar({
  activeDocument,
  activeTab,
  decks,
  handleOpenAccount,
  handleOpenAiGenerator,
  handleOpenDocument,
  handleSidebarLockToggle,
  handleSidebarMouseEnter,
  handleSidebarMouseLeave,
  isGuest,
  isStaff,
  libraryNavExpanded,
  mobileMenuOpen,
  openAdminAccess,
  prepareNewBombcard,
  profile,
  requestBombstyleExit,
  setActiveTab,
  setBombstylePhase,
  setFlashcardFlipped,
  setFlashcardIndex,
  setGuestLockedSection,
  setMobileMenuOpen,
  setSelectedDeckForFolderView,
  setSidebarExpanded,
  sharedDeck,
  sidebarExpanded,
  sidebarLocked,
}) {
  return (
    <nav
      id="primary-navigation"
      className={`w-14 min-w-[56px] bg-[#141922] py-4 flex flex-col items-center justify-between shadow-2xl flex-shrink-0 z-20 ${sidebarExpanded || mobileMenuOpen ? "sidebar-expanded" : ""} ${mobileMenuOpen ? "csm-mobile-nav-open" : ""}`}
      aria-label="Primary navigation"
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
      onClick={(event) => {
        if (
          event.target.closest("button") ||
          event.target.closest(".csm-sidebar-logo")
        )
          setMobileMenuOpen(false);
      }}
    >
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="csm-sidebar-brand-row w-full flex items-center justify-center">
          <button
            type="button"
            className="w-10 h-10 csm-sidebar-logo flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
            onClick={() => {
              if (isGuest) {
                if (sidebarExpanded || mobileMenuOpen)
                  setGuestLockedSection("home");
                else setSidebarExpanded(true);
                return;
              }
              if (sidebarExpanded || mobileMenuOpen)
                requestBombstyleExit(() => setActiveTab("home"));
              else setSidebarExpanded(true);
            }}
            title={
              isGuest
                ? "Co-StudyMaxx (Home Locked for Guests)"
                : sidebarExpanded || mobileMenuOpen
                  ? "Co-StudyMaxx Home"
                  : "Open sidebar"
            }
            aria-label={
              sidebarExpanded || mobileMenuOpen
                ? "Co-StudyMaxx Home"
                : "Open sidebar"
            }
          >
            <img
              src="assets/images/csm-sidebar-logo.png"
              alt="Co-StudyMaxx Logo"
              className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            />
            <svg
              className="csm-sidebar-open-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M9 4v16M14 8l4 4-4 4" />
            </svg>
            <span className="csm-sidebar-wordmark">Co-StudyMaxx</span>
          </button>
          <button
            type="button"
            className="csm-mobile-nav-close"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
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
          </button>
        </div>

        {/* Navigation Tabs (MAIN Category) */}
        <div className="flex flex-col items-center gap-2 mt-2 w-full">
          <span className="csm-sidebar-category">Dashboard</span>
          <span className="csm-sidebar-divider" />

          {/* 1. Home Dashboard (Locked for Guest) */}
          <button
            onClick={() => {
              if (isGuest) {
                setGuestLockedSection("home");
                return;
              }
              requestBombstyleExit(() => {
                setSelectedDeckForFolderView(null);
                setActiveTab("home");
              });
            }}
            data-tooltip={isGuest ? "Home (Sign in to unlock)" : "Overview"}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === "home" ? "active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
            title={
              isGuest ? "Home Dashboard (Sign in to unlock)" : "Home Dashboard"
            }
          >
            <IconHome />
            {isGuest && (
              <span
                className="csm-sidebar-lock-badge"
                title="Sign in to unlock"
              >
                <IconLock className="w-2.5 h-2.5" />
              </span>
            )}
            <span className="csm-sidebar-label">Home</span>
          </button>

          {/* 2. Reviewer Library (Parent with Nested Child Items) */}
          {!isStaff && (
            <div className="w-full flex flex-col items-center">
              <button
                onClick={() =>
                  requestBombstyleExit(() => {
                    setSelectedDeckForFolderView(
                      isGuest && sharedDeck ? sharedDeck : null,
                    );
                    setActiveTab("library");
                  })
                }
                data-tooltip="Reviewer Library"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTab === "library" ? "active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]" : ["flashcards", "creator", "highlighter"].includes(activeTab) ? "text-white bg-white/10 font-bold border border-white/15" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                title="Reviewer Library (Authoring & Management)"
              >
                <IconLibrary />
                <span className="csm-sidebar-label">Library</span>
              </button>

              {/* Nested Navigation: Study, Create, PDF Tools & AI Generator (Smooth Animated Accordion) */}
              <div
                className={`csm-sidebar-subnav-wrapper ${libraryNavExpanded ? "expanded" : "collapsed"}`}
                aria-hidden={!libraryNavExpanded}
              >
                <div className="csm-sidebar-subnav-inner">
                  <div className="csm-sidebar-subnav">
                    {/* 2a. Study Mini Sidebar */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() =>
                        requestBombstyleExit(() => {
                          setSelectedDeckForFolderView(null);
                          setFlashcardIndex(0);
                          setFlashcardFlipped(false);
                          setActiveTab("flashcards");
                        })
                      }
                      data-tooltip="Study"
                      className={`csm-sidebar-subitem flex items-center transition-all ${activeTab === "flashcards" ? "active" : ""}`}
                      title="Study (Review Bombcards)"
                    >
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                        <path d="M6 6h10" />
                        <path d="M6 10h10" />
                      </svg>
                      <span className="csm-sidebar-label">Study</span>
                    </button>

                    {/* 2b. Create Bombcards Mini Sidebar (Locked for Guest) */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() => {
                        if (isGuest) {
                          setGuestLockedSection("creator");
                          return;
                        }
                        requestBombstyleExit(() => {
                          prepareNewBombcard();
                          setSelectedDeckForFolderView(null);
                          setActiveTab("creator");
                        });
                      }}
                      data-tooltip={
                        isGuest
                          ? "Create Bombcards (Sign in to unlock)"
                          : "Create Bombcards"
                      }
                      className={`csm-sidebar-subitem flex items-center transition-all relative ${activeTab === "creator" ? "active" : ""}`}
                      title={
                        isGuest
                          ? "Create Bombcards (Sign in to unlock)"
                          : "Create Bombcards"
                      }
                    >
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                      {isGuest && (
                        <span
                          className="csm-sidebar-lock-badge"
                          title="Sign in to unlock"
                        >
                          <IconLock className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <span className="csm-sidebar-label">
                        Create Bombcards
                      </span>
                    </button>

                    {/* 2c. PDF Tools Mini Sidebar */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() => {
                        requestBombstyleExit(() => {
                          setSelectedDeckForFolderView(null);
                          if (!activeDocument) {
                            const firstDocDeck = decks.find(
                              (d) => d.documents && d.documents.length > 0,
                            );
                            if (firstDocDeck && firstDocDeck.documents[0]) {
                              handleOpenDocument(
                                firstDocDeck,
                                firstDocDeck.documents[0],
                              );
                              return;
                            }
                          }
                          setActiveTab("highlighter");
                        });
                      }}
                      data-tooltip="PDF Tools"
                      className={`csm-sidebar-subitem flex items-center transition-all ${activeTab === "highlighter" ? "active" : ""}`}
                      title="PDF Tools (Highlight & Generate Cards)"
                    >
                      <IconPdf className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                      <span className="csm-sidebar-label">PDF Tools</span>
                    </button>

                    {/* 2d. AI Flashcard Generator Modal Trigger */}
                    <button
                      type="button"
                      tabIndex={libraryNavExpanded ? 0 : -1}
                      onClick={() => {
                        if (isGuest) {
                          setGuestLockedSection("creator");
                          return;
                        }
                        requestBombstyleExit(() => handleOpenAiGenerator());
                      }}
                      data-tooltip={
                        isGuest
                          ? "AI Flashcards (Sign in to unlock)"
                          : "AI Generator"
                      }
                      className="csm-sidebar-subitem flex items-center transition-all relative text-[#ffb49c] hover:text-white"
                      title={
                        isGuest
                          ? "AI Flashcards (Sign in to unlock)"
                          : "AI Flashcards Generator (Gemini)"
                      }
                    >
                      <span className="csm-sidebar-ai-icon flex-shrink-0">
                        <IconSparkles className="w-3.5 h-3.5 text-white" />
                      </span>
                      {isGuest && (
                        <span
                          className="csm-sidebar-lock-badge"
                          title="Sign in to unlock"
                        >
                          <IconLock className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <span className="csm-sidebar-label">AI Generator</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Game Mode Section (Launch Lobby - Locked for Guest) */}
          {!isStaff && (
            <button
              onClick={() => {
                if (isGuest) {
                  setGuestLockedSection("arena");
                  return;
                }
                requestBombstyleExit(() => {
                  setBombstylePhase("select_deck");
                  setSelectedDeckForFolderView(null);
                  setActiveTab("arena");
                });
              }}
              data-tooltip={isGuest ? "Challenge (Sign in to unlock)" : "Challenge"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === "game" || activeTab === "arena" ? "active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.5)]" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              title={
                isGuest
                  ? "Challenge (Sign in to unlock)"
                  : "Challenge (Bombstyle Recall)"
              }
            >
              <IconCards className="w-6 h-6" />
              {isGuest && (
                <span
                  className="csm-sidebar-lock-badge"
                  title="Sign in to unlock"
                >
                  <IconLock className="w-2.5 h-2.5" />
                </span>
              )}
              <span className="csm-sidebar-label">Challenge</span>
            </button>
          )}

          {/* ACCOUNT Category — placed below Arena */}
          {!isGuest && (
            <button
              type="button"
              onClick={() =>
                requestBombstyleExit(() => {
                  setSelectedDeckForFolderView(null);
                  setActiveTab("archive");
                })
              }
              data-tooltip="Archive"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === "archive" ? "active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              title="Archive"
              aria-label="Open archive"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 4h18v4H3z" />
                <path d="M5 8v12h14V8M10 12h4" />
              </svg>
              <span className="csm-sidebar-label">Archive</span>
            </button>
          )}

          {!isGuest && !isStaff && (
            <button
              type="button"
              onClick={() =>
                requestBombstyleExit(() => {
                  setSelectedDeckForFolderView(null);
                  setActiveTab("people");
                })
              }
              data-tooltip="Discover"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${activeTab === "people" ? "active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              title="Discover people and public decks"
              aria-label="Discover"
            >
              <IconSearch
                className={`w-5 h-5 ${activeTab === "people" ? "text-white" : "text-zinc-400"}`}
              />
              <span className="csm-sidebar-label">Discover</span>
            </button>
          )}

          <span
            className="csm-sidebar-category"
            style={{
              marginTop: "8px",
            }}
          >
            ACCOUNT
          </span>
          <span className="csm-sidebar-divider" />

          {/* Profile Settings (Locked for Guest) */}
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${activeTab === "account" ? "active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}
            title={
              isGuest
                ? "Account Profile (Sign in to unlock)"
                : "Account Profile"
            }
            data-tooltip={
              isGuest ? "Profile (Sign in to unlock)" : "Profile Settings"
            }
            onClick={() => {
              if (isGuest) {
                setGuestLockedSection("profile");
                return;
              }
              requestBombstyleExit(() => handleOpenAccount());
            }}
          >
            <IconUser />
            {isGuest && (
              <span
                className="csm-sidebar-lock-badge"
                title="Sign in to unlock"
              >
                <IconLock className="w-2.5 h-2.5" />
              </span>
            )}
            <span className="csm-sidebar-label">Profile</span>
          </button>
          {["admin", "superadmin"].includes(profile.role) && (
            <button
              type="button"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === "admin" ? "active bg-[#f04824] text-white shadow-[0_0_15px_rgba(240,72,36,0.35)]" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}
              title="Admin console"
              data-tooltip="Admin console"
              aria-label="Admin console"
              onClick={() => requestBombstyleExit(openAdminAccess)}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="csm-sidebar-label">Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Sidebar lock — hover still controls the sidebar while unlocked */}
      <div className="flex flex-col items-center gap-2 w-full">
        <button
          type="button"
          className={`csm-sidebar-toggle h-10 flex items-center justify-center transition-colors cursor-pointer ${sidebarLocked ? "is-locked" : "text-zinc-500 hover:text-white"}`}
          title={sidebarLocked ? "Collapse sidebar" : "Expand sidebar"}
          data-tooltip={sidebarLocked ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={sidebarLocked ? "Collapse sidebar" : "Expand sidebar"}
          aria-pressed={sidebarLocked}
          onClick={handleSidebarLockToggle}
        >
          <span className="csm-sidebar-toggle-icon" aria-hidden="true">
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${sidebarLocked ? "" : "rotate-180"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 3v18" />
              <path d="m15 9-3 3 3 3" />
            </svg>
          </span>
          <span className="csm-sidebar-label">
            {sidebarLocked ? "Collapse sidebar" : "Expand sidebar"}
          </span>
        </button>
      </div>
    </nav>
  );
}
