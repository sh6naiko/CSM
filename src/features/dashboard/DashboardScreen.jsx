import { DailyStudyGoal } from "./DailyStudyGoal.jsx";
import { CSM } from "../../services/client.js";
import {
  IconArrowRight,
  IconCards,
  IconPlay,
  IconPlus,
  IconShare,
} from "../../components/icons.jsx";
import React from "react";
import { ProgressBar } from "../../components/ui/ProgressBar.jsx";
export function DashboardScreen({
  accountStats,
  activityChartMax,
  arenaChart,
  arenaSessions,
  badgesList,
  bestStudyStreak,
  currentStudyStreak,
  deckMasteryList,
  displayFirstName,
  formatActivityTime,
  formatTrend,
  greeting,
  handleOpenCreateFolderInfo,
  handleOpenGameMode,
  handleOpenLibrary,
  handleShareDeck,
  mostRecentDeck,
  openMasteryMenuId,
  openRecentActivity,
  recentActivities,
  requestDeleteConfirmation,
  setActiveTab,
  setMasteryProgressNotice,
  setOpenMasteryMenuId,
  setSelectedDeckForFolderView,
  setSelectedDeckIds,
  setStudyProgress,
  studyStreakLost,
  todayDayName,
  totalBombCards,
  totalReviewers,
  totalWeekActivity,
  triggerToast,
}) {
  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Dashboard Content Container */}
      <div className="home-dashboard-content flex-1 w-full overflow-y-auto custom-scroll">
        {/* Header */}
        <div className="home-dashboard-header flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <span className="home-dashboard-eyebrow">OVERVIEW</span>
            <h1 className="home-dashboard-title">
              {greeting}, {displayFirstName}
            </h1>
            <p className="home-dashboard-subtitle">
              Stay on top of your reviewers, practice progress, and study
              streak.
            </p>
          </div>
        </div>

        {/* Statistic Cards Row */}
        <div className="home-stat-grid mb-6">
          <div
            onClick={() => {
              setSelectedDeckForFolderView(null);
              setActiveTab("library");
            }}
            className="home-stat-card cursor-pointer"
            title="View your reviewers library"
          >
            <span className="home-stat-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7.5h6l1.7 2H21v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M3 7.5V5a2 2 0 0 1 2-2h4l1.7 2H19a2 2 0 0 1 2 2v2.5" />
              </svg>
            </span>
            <span className="home-stat-copy">
              <span className="home-stat-label">TOTAL DECKS</span>
              <span className="home-stat-value">{totalReviewers}</span>
              <span className="home-stat-description">
                {totalReviewers > 0 ? (
                  <React.Fragment>
                    <b className="csm-trend up">
                      {formatTrend(accountStats.decksTrend)}
                    </b>{" "}
                    this month
                  </React.Fragment>
                ) : (
                  <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                    Create your first deck <IconArrowRight />
                  </span>
                )}
              </span>
            </span>
          </div>

          <div
            onClick={() => {
              setSelectedDeckForFolderView(null);
              setActiveTab("library");
            }}
            className="home-stat-card cursor-pointer"
            title="View Bombcards"
          >
            <span className="home-stat-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="5"
                  y="4"
                  width="11"
                  height="14"
                  rx="2"
                  transform="rotate(-12 5 4)"
                />
                <rect
                  x="9"
                  y="6"
                  width="11"
                  height="14"
                  rx="2"
                  transform="rotate(12 9 6)"
                />
              </svg>
            </span>
            <span className="home-stat-copy">
              <span className="home-stat-label">TOTAL BOMBCARDS</span>
              <span className="home-stat-value">{totalBombCards}</span>
              <span className="home-stat-description">
                {totalBombCards > 0 ? (
                  <React.Fragment>
                    <b className="csm-trend up">
                      {formatTrend(accountStats.cardsTrend)}
                    </b>{" "}
                    across your sets
                  </React.Fragment>
                ) : (
                  <span className="inline-flex items-center gap-1 text-white/95 font-bold underline">
                    Create cards to practice <IconArrowRight />
                  </span>
                )}
              </span>
            </span>
          </div>

          <div
            className={`home-stat-card cursor-pointer csm-study-streak-card ${currentStudyStreak > 0 ? "is-active" : studyStreakLost ? "is-lost" : "is-new"}`}
            onClick={() => setActiveTab("flashcards")}
            title={
              studyStreakLost
                ? "Your study streak ended. Study today to start a new one."
                : "Practice cards to protect your streak"
            }
          >
            <span className="home-stat-icon csm-stat-streak" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21a8 8 0 0 0 5.8-13.7C16.4 6 14.5 4.4 14 2c-3 2-4.2 4.2-3.4 6.3A4.6 4.6 0 0 0 7.5 12c0 1.3.6 2.5 1.5 3.4" />
                <path d="M12 21c-2.8 0-5-1.8-5-4.2 0-1.5.8-2.7 2.2-3.6.1 2.1 1.4 3.5 3.2 3.5 1.4 0 2.5-1 2.5-2.5 1.3 1.1 2.1 2.4 2.1 3.8 0 1.7-1.3 3-3 3Z" />
              </svg>
            </span>
            <span className="home-stat-copy">
              <span className="home-stat-label">
                {studyStreakLost ? "STREAK LOST" : "STUDY STREAK"}
              </span>
              <span className="home-stat-value">
                {currentStudyStreak === 1
                  ? "1 day"
                  : `${currentStudyStreak} days`}
              </span>
              <span className="home-stat-description">
                {studyStreakLost ? (
                  <span className="csm-streak-lost-message">
                    You missed a day. Study today to start again.
                  </span>
                ) : currentStudyStreak > 0 ? (
                  <>
                    <b className="csm-streak-best">
                      {bestStudyStreak === 1
                        ? "1 day"
                        : `${bestStudyStreak} days`}
                    </b>{" "}
                    personal best
                  </>
                ) : (
                  <span className="csm-streak-lost-message">
                    Study today to start your streak.
                  </span>
                )}
              </span>
            </span>
          </div>

          <div
            className="home-stat-card cursor-pointer"
            onClick={() => handleOpenGameMode()}
            title="Test accuracy in Bombstyle Challenge"
          >
            <span
              className="home-stat-icon csm-stat-accuracy"
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
                <path d="M4 19V5M4 19h16" />
                <path d="m7 15 3-4 3 2 5-7" />
              </svg>
            </span>
            <span className="home-stat-copy">
              <span className="home-stat-label">AVG. ACCURACY</span>
              <span className="home-stat-value">
                {accountStats.accuracy || 0}%
              </span>
              <span className="home-stat-description csm-accuracy-description">
                {(accountStats.accuracy || 0) > 0 ? (
                  <React.Fragment>
                    Across all decks ·{" "}
                    <b
                      className={`csm-trend ${(accountStats.accuracyTrend || 0) < 0 ? "down" : "up"}`}
                    >
                      {formatTrend(accountStats.accuracyTrend)}
                    </b>{" "}
                    than last week
                  </React.Fragment>
                ) : (
                  <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                    Across all decks · Test in Challenge quiz <IconArrowRight />
                  </span>
                )}
              </span>
            </span>
          </div>
        </div>

        {/* Quick Resume Hero Banner */}
        {mostRecentDeck ? (
          <section className="csm-resume-hero mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#141d2b] via-[#1a2538] to-[#251f28] text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-zinc-700/60">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-[#f04824]/20 text-[#ff7a58] border border-[#f04824]/40 uppercase">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M 10 8 L 16 12 L 10 16 Z" />
                  </svg>
                  Pick up where you left off
                </span>
                {mostRecentDeck.subject && (
                  <span className="text-xs text-zinc-300 font-medium px-2 py-0.5 rounded bg-white/10">
                    {mostRecentDeck.subject}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-2.5">
                <span>{mostRecentDeck.code || mostRecentDeck.title}</span>
                {mostRecentDeck.title &&
                  mostRecentDeck.title !== mostRecentDeck.code && (
                    <span className="text-zinc-300 font-medium text-base sm:text-lg hidden sm:inline">
                      · {mostRecentDeck.title}
                    </span>
                  )}
              </h2>
              <p className="text-xs text-zinc-300 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <i className="bi bi-collection text-[#ff7a58]"></i>{" "}
                  {mostRecentDeck.cards?.length || 0} Bombcards
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="bi bi-clock-history text-zinc-400"></i> Ready
                  for review
                </span>
                {mostRecentDeck.documents?.length > 0 && (
                  <React.Fragment>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <i className="bi bi-file-earmark-pdf text-red-400"></i>{" "}
                      {mostRecentDeck.documents.length} PDF notes
                    </span>
                  </React.Fragment>
                )}
              </p>
            </div>
            <div className="relative z-10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedDeckIds([mostRecentDeck.id]);
                  setActiveTab("flashcards");
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#f04824] hover:bg-[#d83c1b] text-white shadow-md flex items-center gap-2 transition-all duration-150 transform hover:-translate-y-0.5"
              >
                <IconPlay className="w-3.5 h-3.5" />
                <span>Continue Review</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDeckIds([mostRecentDeck.id]);
                  handleOpenGameMode();
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-2 transition-all"
              >
                <span className="inline-flex items-center gap-1.5">
                  <i className="bi bi-controller"></i> Enter Challenge
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDeckForFolderView(mostRecentDeck);
                  setActiveTab("library");
                }}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2.5 rounded-xl font-medium text-xs text-zinc-300 hover:text-white transition-colors"
                title="View in Library"
              >
                <span>View details</span>
                <IconArrowRight />
              </button>
            </div>
          </section>
        ) : (
          <section className="csm-welcome-banner mb-6 p-6 rounded-2xl bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-100/50 border border-orange-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <span className="text-[11px] font-bold text-orange-700 tracking-wider uppercase mb-1 block">
                Getting Started
              </span>
              <h2 className="text-xl font-extrabold text-zinc-900 mb-1 flex items-center gap-2">
                Welcome to Co-StudyMaxx!{" "}
                <i className="bi bi-stars text-orange-500"></i>
              </h2>
              <p className="text-xs text-zinc-600 max-w-md">
                Create your first reviewer deck, then add PDF notes or build
                Bombcards with AI.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOpenCreateFolderInfo}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#f04824] hover:bg-[#d83c1b] text-white shadow-sm flex items-center gap-2 transition-all"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Create First Deck</span>
              </button>
            </div>
          </section>
        )}

        {/* Analytics & Focus Goal Row */}
        <div className="csm-dash-analytics-grid grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Left (2 cols): Weekly Study Activity Chart */}
          <section className="lg:col-span-2 csm-chart-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">
                    DATA & PROGRESS
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                    Weekly Challenge Sessions
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Challenge sessions started each day, compared with last week.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-xs bg-[#182231] inline-block"></i>{" "}
                    This week
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-xs bg-[#f04824] inline-block"></i>{" "}
                    Last week
                  </span>
                </div>
              </div>

              {/* Chart Columns */}
              <div className="csm-modern-chart h-40 flex items-end justify-around gap-2 pt-4 pb-2 border-b border-zinc-100 relative">
                {arenaChart.map(({ day, current = 0, previous = 0 }) => {
                  const isToday = day === todayDayName;
                  const currHeight = Math.max(
                    8,
                    ((Number(current) || 0) / activityChartMax) * 100,
                  );
                  const prevHeight = Math.max(
                    8,
                    ((Number(previous) || 0) / activityChartMax) * 100,
                  );
                  return (
                    <div
                      className={`flex-1 flex flex-col items-center justify-end h-full gap-2 group relative ${isToday ? "csm-chart-today" : ""}`}
                      key={day}
                    >
                      {/* Hover tooltip */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] font-semibold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {day}: {current} Challenge session{current === 1 ? "" : "s"}{" "}
                        {previous ? `(last week: ${previous})` : ""}
                      </div>
                      <div className="w-full flex items-end justify-center gap-1.5 h-full">
                        {previous > 0 && (
                          <span
                            className="w-2.5 sm:w-3.5 bg-[#f04824]/60 hover:bg-[#f04824] rounded-t-sm transition-all"
                            style={{
                              height: `${prevHeight}%`,
                            }}
                            title={`Last week Challenge sessions: ${previous}`}
                          />
                        )}
                        <span
                          className={`w-2.5 sm:w-3.5 rounded-t-sm transition-all ${isToday ? "bg-[#f04824] shadow-sm shadow-orange-500/30" : "bg-[#182231] hover:bg-[#283850]"}`}
                          style={{
                            height: `${currHeight}%`,
                          }}
                          title={`This week Challenge sessions: ${current}`}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-semibold ${isToday ? "text-[#f04824] font-extrabold underline" : "text-zinc-500"}`}
                      >
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 text-xs text-zinc-500 flex items-center gap-1.5 border-t border-zinc-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>
                <b>{totalWeekActivity}</b> Challenge session
                {totalWeekActivity === 1 ? "" : "s"} this week
              </span>
            </div>
          </section>

          <DailyStudyGoal onStudy={() => setActiveTab("flashcards")} />
        </div>

        {/* Subject Mastery & Readiness Breakdown */}
        {deckMasteryList.length > 0 && (
          <section className="csm-subject-mastery mb-6 p-5 sm:p-6 rounded-2xl bg-white border border-[#dce5ee] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">
                  READINESS
                </span>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  Subject Mastery & Weak Spots
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Track your confidence level and mastered cards across
                  subjects.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className="text-xs font-bold text-[#f04824] hover:underline flex items-center gap-1"
              >
                View all decks <IconArrowRight />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {deckMasteryList.map((deck) => (
                <div
                  key={deck.id}
                  className="p-4 rounded-xl border border-zinc-100 hover:border-orange-200 bg-zinc-50/50 hover:bg-orange-50/20 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-zinc-900">
                          {deck.code}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-zinc-200/70 text-zinc-700">
                          {deck.subject || "General"}
                        </span>
                      </div>
                      {deck.title && (
                        <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-[200px]">
                          {deck.title}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${deck.masteryPct >= 75 ? "bg-emerald-50 text-emerald-700" : deck.masteryPct >= 40 ? "bg-amber-50 text-amber-700" : "bg-orange-50 text-orange-700"}`}
                    >
                      {deck.masteryPct}% Mastery
                    </span>
                  </div>

                  {/* Mastery Bar */}
                  <ProgressBar
                    className="w-full bg-zinc-200/80 rounded-full h-1.5 overflow-hidden mb-3"
                    fillAs="div"
                    fillClassName={`h-1.5 rounded-full ${deck.masteryPct >= 75 ? "bg-emerald-500" : deck.masteryPct >= 40 ? "bg-amber-500" : "bg-[#f04824]"}`}
                    label={`${deck.code || deck.title} mastery progress`}
                    value={deck.masteryPct}
                  />

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/40">
                    <span>
                      {deck.knownCount} of {deck.totalCards} cards known
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeckIds([deck.id]);
                          setActiveTab("flashcards");
                        }}
                        className="csm-mastery-study-button"
                      >
                        <span>Study</span>
                        <IconArrowRight />
                      </button>
                      <div className="csm-admin-deck-menu csm-mastery-menu">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMasteryMenuId((current) =>
                              current === deck.id ? null : deck.id,
                            )
                          }
                          className="csm-admin-deck-menu-trigger csm-mastery-menu-trigger"
                          aria-label={`More actions for ${deck.code || deck.title}`}
                          aria-haspopup="menu"
                          aria-expanded={openMasteryMenuId === deck.id}
                          title="More deck actions"
                        >
                          <svg
                            className="csm-admin-user-more-icon"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <circle cx="5" cy="12" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="19" cy="12" r="1.8" />
                          </svg>
                        </button>
                        {openMasteryMenuId === deck.id && (
                          <div
                            className="csm-admin-deck-menu-popover csm-mastery-menu-popover"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMasteryMenuId(null);
                                handleOpenGameMode(deck.id);
                              }}
                            >
                              <IconPlay />
                              Challenge
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="is-danger"
                              onClick={() => {
                                setOpenMasteryMenuId(null);
                                if (!deck.hasProgress) {
                                  setMasteryProgressNotice({
                                    id: Date.now(),
                                    message:
                                      "Progress is already empty. There is nothing to reset.",
                                  });
                                  return;
                                }
                                requestDeleteConfirmation({
                                  kicker: "RESET DECK PROGRESS",
                                  icon: "reset",
                                  title: `Reset progress for ${deck.code || deck.title}?`,
                                  message:
                                    "This clears known/mastery progress for every Bombcard in this deck. Your cards and Challenge session history will remain.",
                                  confirmLabel: "Reset progress",
                                  action: async () => {
                                    try {
                                      const result = await CSM.api(
                                        "study/progress",
                                        "DELETE",
                                        {
                                          deckId: deck.id,
                                        },
                                      );
                                      if (!Number(result.deleted)) {
                                        setMasteryProgressNotice({
                                          id: Date.now(),
                                          message:
                                            "Progress is already empty. There is nothing to reset.",
                                        });
                                        return;
                                      }
                                      setStudyProgress((current) =>
                                        current.filter(
                                          (progress) =>
                                            progress.deck_id !== deck.id,
                                        ),
                                      );
                                      triggerToast(
                                        `Progress for ${deck.code || deck.title} has been reset.`,
                                      );
                                    } catch (error) {
                                      setMasteryProgressNotice({
                                        id: Date.now(),
                                        message:
                                          error.message ||
                                          "Could not reset deck progress.",
                                      });
                                    }
                                  },
                                });
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
                                <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
                                <path d="M3 3v5h5" />
                              </svg>
                              Reset progress
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Co-Study & Gamification Row */}
        <div className="csm-dash-social-grid grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Arena & Community Challenge Card */}
          <section className="csm-arena-challenge-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">
                    CO-STUDYMAXX CHALLENGE
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                    Bombstyle Countdown Challenge
                  </h2>
                </div>
                <span className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-[#f04824] shadow-xs">
                  <i className="bi bi-controller text-xl"></i>
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Pressure-based recall with high scores. Challenge your personal
                record or study with friends.
              </p>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Best Challenge Streak
                  </span>
                  <span className="text-xl font-extrabold text-zinc-900 flex items-center gap-1.5 mt-0.5">
                    <i className="bi bi-fire text-orange-500"></i>{" "}
                    {accountStats.studyBestDays || 0}
                    <span className="text-xs font-semibold text-zinc-400">
                      cards
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Challenge Sessions
                  </span>
                  <span className="text-xl font-extrabold text-zinc-900 mt-0.5 block">
                    {arenaSessions.length}{" "}
                    <span className="text-xs font-semibold text-zinc-400">
                      played
                    </span>
                  </span>
                </div>
              </div>

              {arenaSessions.length > 0 && arenaSessions[0] && (
                <div className="text-xs text-zinc-600 bg-orange-50/50 p-2.5 rounded-lg border border-orange-100/60 mb-3 flex items-center justify-between">
                  <span>
                    Latest: <b>{arenaSessions[0].title || "Challenge Run"}</b>
                  </span>
                  <span className="font-bold text-[#f04824]">
                    {arenaSessions[0].correctCount || 0} correct
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleOpenGameMode}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#f04824] hover:bg-[#d83c1b] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span>Enter Bombstyle Challenge</span>
                <IconArrowRight />
              </button>
              {mostRecentDeck && (
                <button
                  type="button"
                  onClick={(e) => handleShareDeck(mostRecentDeck, e)}
                  className="py-2.5 px-3 rounded-xl border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Share reviewer with study group"
                >
                  <IconShare />
                  <span>Share Deck</span>
                </button>
              )}
            </div>
          </section>

          {/* Gamified Achievements & Badges Card */}
          <section className="csm-badges-card bg-white rounded-2xl p-5 sm:p-6 border border-[#dce5ee] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="csm-kicker text-[10px] font-extrabold text-[#f04824] tracking-widest uppercase block mb-1">
                    ACHIEVEMENTS
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                    Study Milestones & Badges
                  </h2>
                </div>
                <span className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs">
                  <i className="bi bi-trophy-fill text-xl"></i>
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Earn recognition as you build consistent study habits and master
                your decks.
              </p>

              <div className="space-y-2.5">
                {badgesList.map((badge) => (
                  <div
                    key={badge.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${badge.unlocked ? "bg-orange-50/40 border-orange-200/60" : "bg-zinc-50/60 border-zinc-100 opacity-60"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center shrink-0">
                        {badge.icon}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block leading-tight">
                          {badge.title}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {badge.desc}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badge.unlocked ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}
                    >
                      {badge.unlocked ? (
                        <span className="inline-flex items-center gap-1">
                          <i className="bi bi-check-circle-fill text-[10px]"></i>{" "}
                          Unlocked
                        </span>
                      ) : (
                        badge.progress
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>
                {badgesList.filter((b) => b.unlocked).length} of{" "}
                {badgesList.length} badges earned
              </span>
              <span className="font-semibold text-zinc-600">
                Keep studying to unlock all!
              </span>
            </div>
          </section>
        </div>

        {/* Recent Activity */}
        <section className="csm-live-activity-card">
          <div className="csm-live-activity-heading">
            <div>
              <span className="csm-kicker">ACTIVITY</span>
              <h2>Recent Activity</h2>
              <p>
                Your latest accessed study areas and quiz sessions appear here.
              </p>
            </div>
            <button
              type="button"
              className="csm-outline-button"
              onClick={handleOpenLibrary}
            >
              View library <IconArrowRight />
            </button>
          </div>
          <div className="csm-live-activity-list">
            {recentActivities.length ? (
              recentActivities.slice(0, 5).map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  className="csm-live-activity-row group"
                  onClick={() => openRecentActivity(activity)}
                  title={`Jump into ${activity.material}`}
                >
                  <span
                    className={`csm-live-activity-icon ${activity.mode === "PDF Tools" ? "bg-red-50 text-red-600 border border-red-200" : activity.mode === "BombStyle quiz" || activity.mode === "BombStyle lobby" ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-blue-50 text-blue-600 border border-blue-200"}`}
                  >
                    {activity.mode === "PDF Tools" ? (
                      "PDF"
                    ) : activity.mode === "Profile" ? (
                      "ME"
                    ) : activity.mode === "BombStyle quiz" ||
                      activity.mode === "BombStyle lobby" ? (
                      "BS"
                    ) : (
                      <IconCards className="w-4 h-4" />
                    )}
                  </span>
                  <span className="csm-live-activity-copy">
                    <strong>{activity.material}</strong>
                    <small>
                      {activity.mode} · {formatActivityTime(activity.timestamp)}
                    </small>
                  </span>
                  {activity.accuracy && activity.accuracy !== "—" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 hidden sm:inline-block">
                      {activity.accuracy} acc
                    </span>
                  )}
                  <span className="csm-live-activity-status">
                    {activity.status}
                  </span>
                  <IconArrowRight className="csm-live-activity-arrow w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>
              ))
            ) : (
              <div className="csm-live-activity-empty">
                No activity has been recorded yet. Study a deck to start
                tracking!
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
