import { sound } from "../../audio/SoundEngine.js";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCards,
  IconSparkles,
  IconSpeaker,
} from "../../components/icons.jsx";
import React from "react";
export function ArenaScreen({
  BOMBSTYLE_DIFFICULTIES,
  activeBombstyleCard,
  arenaDeckChoices,
  bombTimerPercent,
  bombstyleActiveDeck,
  bombstyleAnswerDraft,
  bombstyleAnswerError,
  bombstyleAnswerInputRef,
  bombstyleAvailableCards,
  bombstyleCorrectCount,
  bombstyleCountdown,
  bombstyleDeckId,
  bombstyleDifficulty,
  bombstyleDurationSeconds,
  bombstyleFeedback,
  bombstyleIndex,
  bombstyleMaxStreak,
  bombstyleMissedCards,
  bombstylePhase,
  bombstyleQueue,
  bombstyleRevealed,
  bombstyleStreak,
  bombstyleTimeRemaining,
  bombstyleTimerHelpOpen,
  cancelBombstyleCountdown,
  decks,
  handleBombstyleAnswer,
  handleSelectBombstyleDeck,
  handleSetDifficulty,
  handleStartBombstyle,
  handleStudyMissedDeck,
  isBombDanger,
  isBombExploded,
  isBombStartled,
  isBombWorried,
  isBombWrong,
  publicArenaDeck,
  requestBombstyleExit,
  selectedBombstyleDifficulty,
  setBombstyleAnswerDraft,
  setBombstyleAnswerError,
  setBombstylePhase,
  setBombstyleTimerHelpOpen,
  setSoundMuted,
  soundMuted,
  triggerToast,
}) {
  return (
    <div className="csm-screen csm-arena-screen custom-scroll">
      {/* PHASE 1: DECK SELECTION HUB */}
      {bombstylePhase === "select_deck" && (
        <div>
          <div className="csm-page-head">
            <div>
              <span className="csm-kicker">CHALLENGE • BOMBSTYLE</span>
              <h1>Bombstyle Challenge</h1>
              <p>
                Test your Bombcards under pressure. Active recall and one
                countdown for the whole round. Choose a deck to start.
              </p>
            </div>
          </div>

          {/* Arena High-Level Stats Overview */}
          <div className="csm-arena-hub-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#f04824] flex items-center justify-center font-bold">
                <IconCards className="w-5 h-5" />
              </div>
              <div>
                <span className="csm-arena-hub-stat-label text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Ready Decks
                </span>
                <span className="csm-arena-hub-stat-value text-xl font-extrabold text-slate-900 leading-none">
                  {decks.filter((d) => d.cards && d.cards.length > 0).length}{" "}
                  Decks
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#f04824] text-white flex items-center justify-center font-bold shadow-sm">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <div>
                <span className="csm-arena-hub-stat-label text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Playable Cards
                </span>
                <span className="csm-arena-hub-stat-value text-xl font-extrabold text-slate-900 leading-none">
                  {decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0)}{" "}
                  Bombcards
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 21a6 6 0 0 0 6-6c0-2.1-1.1-4.1-3.2-6.1.1 1.8-.7 3-1.8 3.9.2-3.6-1.8-6.2-4.3-8.8.2 3.3-2.7 5.4-2.7 9A6 6 0 0 0 12 21Z" />
                  <path d="M12 17.5a2.5 2.5 0 0 0 2.5-2.5c0-.6-.2-1.2-.6-1.7-.2.8-.7 1.3-1.3 1.7-.1-1.1-.7-1.9-1.5-2.6.1 1.1-.8 1.8-.8 2.9a2.5 2.5 0 0 0 1.7 2.2Z" />
                </svg>
              </div>
              <div>
                <span className="csm-arena-hub-stat-label text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Best Streak
                </span>
                <span className="csm-arena-hub-stat-value text-xl font-extrabold text-slate-900 leading-none">
                  {bombstyleMaxStreak}x Recall
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <span className="csm-arena-hub-stat-label text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Time Pressure
                </span>
                <span className="csm-arena-hub-stat-value text-xl font-extrabold text-slate-900 leading-none">
                  10s – 30s
                </span>
              </div>
            </div>
          </div>

          <div className="csm-arena-deck-grid">
            {arenaDeckChoices.map((deck) => {
              const cardCount = deck.cards ? deck.cards.length : 0;
              const hasCards = cardCount > 0;
              const isSelected = bombstyleDeckId === deck.id;
              const isTemporary =
                publicArenaDeck?.id === deck.id &&
                !decks.some((ownedDeck) => ownedDeck.id === deck.id);
              return (
                <div
                  key={deck.id}
                  className={`csm-arena-deck-card ${isSelected ? "is-selected" : ""} ${!hasCards ? "is-disabled" : ""} ${isTemporary ? "is-temporary" : ""}`}
                  onClick={() => {
                    if (!hasCards) {
                      triggerToast(
                        "This deck has no Bombcards. Create cards in Library first!",
                      );
                      return;
                    }
                    handleSelectBombstyleDeck(deck.id);
                  }}
                >
                  <div>
                    <div className="csm-arena-deck-top">
                      <span className="csm-arena-deck-code">
                        {deck.code || deck.title}
                      </span>
                      <span
                        className={`csm-arena-deck-badge ${hasCards ? "has-cards" : ""}`}
                      >
                        {cardCount} {cardCount === 1 ? "Bombcard" : "Bombcards"}
                      </span>
                    </div>
                    <p className="csm-arena-deck-subject">
                      {deck.subject || "General Studies"}
                    </p>
                    {isTemporary && (
                      <span
                        className="csm-arena-temporary-badge"
                        title="This shared deck is available in Challenge only and is not saved to your library."
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="10" cy="10" r="7.2" />
                          <path d="M10 5.8v4.6l3 1.8" />
                        </svg>
                        <span>Temporary deck</span>
                        <span className="csm-arena-temporary-note">
                          Challenge only · not saved
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="csm-arena-deck-bottom">
                    <span className="csm-arena-deck-meta">
                      {deck.category || "Deck"} &bull; {deck.cards?.length || 0}{" "}
                      items
                    </span>
                    <span className="csm-arena-deck-action">
                      {hasCards ? (
                        <>
                          <span>Select Deck</span>
                          <IconArrowRight />
                        </>
                      ) : (
                        "No cards yet"
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PHASE 2: SESSION CONFIGURATION */}
      {bombstylePhase === "configure" && (
        <div className="csm-bombstyle-config">
          <header className="csm-bombstyle-config-head">
            <span className="csm-kicker">SESSION SETUP</span>
            <h1>Build your challenge.</h1>
            <p>Your deck. Your pace. A little pressure.</p>
          </header>

          <div className="csm-bombstyle-config-layout">
            <section
              className="csm-bombstyle-settings-card"
              aria-labelledby="bombstyle-difficulty-title"
            >
              <div className="csm-bombstyle-selected-deck">
                <span className="csm-bombstyle-deck-icon">
                  <IconCards className="w-7 h-7" />
                </span>
                <div className="csm-bombstyle-deck-copy">
                  <span>Selected Deck</span>
                  <strong>
                    {bombstyleActiveDeck?.code ||
                      bombstyleActiveDeck?.title ||
                      "Your deck"}
                  </strong>
                  <small>
                    {bombstyleAvailableCards.length} Bombcards available
                  </small>
                </div>
                <button
                  type="button"
                  className="csm-bombstyle-change-deck"
                  onClick={() => setBombstylePhase("select_deck")}
                >
                  Change deck
                </button>
              </div>

              <div className="csm-bombstyle-difficulty-heading">
                <span className="csm-bombstyle-step">01</span>
                <div>
                  <h2 id="bombstyle-difficulty-title">Pick your difficulty</h2>
                  <p>
                    Choose your starting time. The countdown runs for the whole
                    round.
                  </p>
                </div>
              </div>

              <div
                className="csm-bombstyle-difficulty-grid"
                role="radiogroup"
                aria-label="Difficulty"
              >
                {Object.entries(BOMBSTYLE_DIFFICULTIES).map(
                  ([key, difficulty]) => {
                    const isSelected = bombstyleDifficulty === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`csm-bombstyle-difficulty-card ${isSelected ? "is-selected" : ""}`}
                        onClick={() => handleSetDifficulty(key)}
                      >
                        <span
                          className="csm-bombstyle-difficulty-icon"
                          aria-hidden="true"
                        >
                          {key === "easy" && (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 4C11 4 5 7 5 14c0 3 2 5 5 5 7 0 10-6 10-15Z" />
                              <path d="M4 21c3-5 6-8 11-11" />
                            </svg>
                          )}
                          {key === "normal" && (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
                              <path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z" />
                            </svg>
                          )}
                          {key === "hard" && (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
                            </svg>
                          )}
                        </span>
                        <strong>{difficulty.label}</strong>
                        <span>{difficulty.timeLabel}</span>
                        {isSelected && (
                          <span
                            className="csm-bombstyle-selected-check"
                            aria-hidden="true"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m5 12 4 4L19 6" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  },
                )}
              </div>

              <button
                type="button"
                className="csm-bombstyle-timer-toggle"
                aria-expanded={bombstyleTimerHelpOpen}
                aria-controls="bombstyle-timer-explanation"
                onClick={() => setBombstyleTimerHelpOpen((open) => !open)}
              >
                <span className="csm-bombstyle-info-icon" aria-hidden="true">
                  i
                </span>
                <span>How the timer works</span>
                <svg
                  className="csm-bombstyle-toggle-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div
                id="bombstyle-timer-explanation"
                className={`csm-bombstyle-timer-explanation ${bombstyleTimerHelpOpen ? "is-open" : ""}`}
                aria-hidden={!bombstyleTimerHelpOpen}
              >
                <div className="csm-bombstyle-explanation-inner">
                  <h3>Keep your bomb ticking</h3>
                  <p>
                    Correct answers add 8 seconds to your remaining time. Wrong
                    answers subtract 5 seconds.
                  </p>
                  <div className="csm-bombstyle-timer-effects">
                    <div>
                      <span className="csm-bombstyle-effect-icon is-correct">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m5 12 4 4L19 6" />
                        </svg>
                      </span>
                      <span>
                        <small>Correct answer</small>
                        <strong>+8 seconds</strong>
                      </span>
                    </div>
                    <div>
                      <span className="csm-bombstyle-effect-icon is-wrong">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M6 6 18 18M18 6 6 18" />
                        </svg>
                      </span>
                      <span>
                        <small>Wrong answer</small>
                        <strong>&minus;5 seconds</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="csm-bombstyle-one-timer">
                One timer for the entire round.
              </p>
            </section>

            <aside
              className="csm-bombstyle-summary-card"
              aria-labelledby="bombstyle-summary-title"
            >
              <div className="csm-bombstyle-illustration">
                <img
                  src="assets/images/csm-mascot.png"
                  alt="Friendly bomb mascot"
                />
              </div>
              <h2 id="bombstyle-summary-title">Ready when you are.</h2>
              <p className="csm-bombstyle-summary-subtitle">
                Here&rsquo;s your game plan.
              </p>
              <div className="csm-bombstyle-summary-list">
                <div>
                  <span className="csm-bombstyle-summary-icon">
                    <IconSparkles />
                  </span>
                  <span>Difficulty</span>
                  <strong>{selectedBombstyleDifficulty.label}</strong>
                </div>
                <div>
                  <span className="csm-bombstyle-summary-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                  <span>Starting time</span>
                  <strong>{selectedBombstyleDifficulty.timeLabel}</strong>
                </div>
                <div>
                  <span className="csm-bombstyle-summary-icon is-positive">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                  </span>
                  <span>Correct answer</span>
                  <strong>+8 seconds</strong>
                </div>
                <div>
                  <span className="csm-bombstyle-summary-icon is-negative">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M8 12h8" />
                    </svg>
                  </span>
                  <span>Wrong answer</span>
                  <strong>&minus;5 seconds</strong>
                </div>
              </div>
              <button
                type="button"
                className="csm-bombstyle-start-button"
                disabled={bombstyleAvailableCards.length === 0}
                onClick={() => handleStartBombstyle()}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 6 8 6-8 6V6Z" />
                </svg>
                Start Bombstyle
              </button>
              <button
                type="button"
                className="csm-bombstyle-cancel-button"
                onClick={() => setBombstylePhase("select_deck")}
              >
                Cancel
              </button>
            </aside>
          </div>
        </div>
      )}

      {bombstylePhase === "countdown" && (
        <section
          className="csm-bombstyle-countdown"
          role="status"
          aria-live="assertive"
          aria-label={`Game starts in ${bombstyleCountdown} ${bombstyleCountdown === 1 ? "second" : "seconds"}`}
        >
          <span className="csm-kicker">CHALLENGE STARTING</span>
          <svg
            className="csm-bombstyle-stopwatch"
            viewBox="0 0 300 320"
            aria-hidden="true"
          >
            <rect x="127" y="31" width="46" height="51" rx="5" fill="#ed3e18" />
            <rect x="96" y="5" width="108" height="34" rx="7" fill="#17172f" />
            <rect x="103" y="12" width="94" height="19" rx="2" fill="#f04419" />
            <g transform="rotate(45 270 79)">
              <rect
                x="255"
                y="68"
                width="30"
                height="21"
                rx="4"
                fill="#17172f"
              />
              <rect
                x="261"
                y="72"
                width="18"
                height="12"
                rx="2"
                fill="#f04419"
              />
            </g>
            <circle
              cx="150"
              cy="190"
              r="123"
              fill="#27263d"
              stroke="#17172f"
              strokeWidth="8"
            />
            <circle cx="150" cy="190" r="111" fill="#4a495f" />
            <circle
              cx="150"
              cy="190"
              r="101"
              fill="#eeeaf3"
              stroke="#d7d3df"
              strokeWidth="4"
            />
            <g
              className="csm-bombstyle-stopwatch-ticks"
              fill="none"
              stroke="#17172f"
              strokeLinecap="round"
              strokeWidth="7"
            >
              <path d="M150 91v16" />
              <path d="m225 115-12 12" />
              <path d="M249 190h-16" />
              <path d="m225 265-12-12" />
              <path d="M150 289v-16" />
              <path d="m75 265 12-12" />
              <path d="M51 190h16" />
              <path d="m75 115 12 12" />
            </g>
            <g
              className="csm-bombstyle-stopwatch-hand"
              style={{
                transform: `rotate(${(3 - bombstyleCountdown) * 120}deg)`,
              }}
            >
              <path
                d="M150 126 160 181a10 10 0 0 1-20 0Z"
                fill="#f04419"
                stroke="#17172f"
                strokeWidth="6"
                strokeLinejoin="round"
              />
            </g>
            <text
              className="csm-bombstyle-countdown-number"
              x="150"
              y="221"
              key={bombstyleCountdown}
            >
              {bombstyleCountdown}
            </text>
            <text className="csm-bombstyle-stopwatch-unit" x="150" y="244">
              SEC
            </text>
            <circle cx="150" cy="190" r="9" fill="#17172f" />
            <circle cx="150" cy="190" r="4" fill="#f04419" />
          </svg>
          <h1>Get ready</h1>
          <p>
            {bombstyleActiveDeck?.code ||
              bombstyleActiveDeck?.title ||
              "Your deck"}{" "}
            is about to begin.
          </p>
          <button
            type="button"
            className="csm-bombstyle-cancel-button csm-bombstyle-countdown-cancel"
            onClick={cancelBombstyleCountdown}
          >
            Cancel countdown
          </button>
        </section>
      )}

      {/* PHASE 3: GAMEPLAY SCREEN */}
      {bombstylePhase === "gameplay" && (
        <div className="csm-arena-gameplay-wrap">
          {/* Top HUD */}
          <header className="csm-arena-hud">
            {/* Left: Exit & Deck Title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="csm-secondary-button"
                style={{
                  height: "34px",
                  width: "34px",
                  padding: 0,
                }}
                title="Exit Run to Challenge Hub"
                onClick={() =>
                  requestBombstyleExit(() => setBombstylePhase("select_deck"))
                }
              >
                <IconArrowLeft />
              </button>
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    fontWeight: 800,
                    display: "block",
                    lineHeight: 1,
                  }}
                >
                  DECK
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#090d14",
                  }}
                >
                  {bombstyleActiveDeck?.code || bombstyleActiveDeck?.title}
                </span>
              </div>
            </div>

            {/* Center: Card Progress */}
            <div
              style={{
                textAlign: "center",
              }}
            >
              <span className="csm-arena-hud-progress">
                {bombstyleIndex + 1} / {bombstyleQueue.length} BOMBCARDS
              </span>
            </div>

            {/* Right: Sound & Streak */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="csm-secondary-button"
                style={{
                  height: "34px",
                  width: "34px",
                  padding: 0,
                }}
                onClick={() => setSoundMuted(sound.toggleMute())}
                title={soundMuted ? "Unmute" : "Mute"}
              >
                <IconSpeaker muted={soundMuted} />
              </button>

              {/* Streak Badge */}
              <div
                className={`csm-arena-streak-badge ${bombstyleStreak >= 3 ? "streak-hot" : ""}`}
              >
                <svg
                  className="w-3.5 h-3.5 inline-block mr-1 text-amber-500 fill-amber-500"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                STREAK ×{bombstyleStreak}
              </div>
            </div>
          </header>

          {/* Central Stage */}
          <div className="csm-arena-stage-center relative">
            {/* Micro Feedback Popup */}
            {bombstyleFeedback === "defused" && (
              <div className="bombstyle-feedback-pill defused">
                <svg
                  className="w-4 h-4 inline-block mr-1 fill-emerald-500"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                DEFUSED!
              </div>
            )}
            {isBombWrong && (
              <div className="bombstyle-feedback-pill wrong">WRONG ANSWER</div>
            )}
            {bombstyleFeedback === "exploded" && (
              <div className="bombstyle-feedback-pill exploded">
                <svg
                  className="w-4 h-4 inline-block mr-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                EXPLODED!
              </div>
            )}

            {/* Animated SVG Bomb Mascot */}
            <div className="csm-arena-mascot-wrap">
              <div
                className={`relative transition-transform duration-150 ${isBombExploded ? "csm-arena-mascot-exploding" : isBombWrong ? "csm-arena-mascot-wrong" : isBombDanger ? "csm-arena-mascot-danger" : "csm-arena-mascot-calm"}`}
              >
                {/* Glow Aura */}
                <div
                  className={`absolute inset-2 rounded-full blur-xl transition-opacity duration-300 pointer-events-none ${isBombDanger || isBombWrong || isBombExploded ? "bg-orange-500/20 opacity-100" : "bg-[#f04824]/10 opacity-50"}`}
                />

                <svg
                  width="150"
                  height="150"
                  viewBox="0 0 200 200"
                  className="relative z-10 drop-shadow-lg"
                  role="img"
                  aria-label={
                    bombstyleFeedback === "defused"
                      ? "Happy defused bomb"
                      : isBombExploded
                        ? "Friendly surprised exploding bomb"
                        : isBombWrong
                          ? "Bomb mascot reacting to an incorrect answer"
                          : isBombStartled
                            ? "Startled bomb with a sweat drop and exclamation mark"
                            : isBombWorried
                              ? "Worried sweating bomb"
                              : "Happy bomb mascot"
                  }
                >
                  <defs>
                    <radialGradient id="bsBombBody" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#45464b" />
                      <stop offset="45%" stopColor="#202126" />
                      <stop offset="100%" stopColor="#0c0d10" />
                    </radialGradient>
                    <radialGradient
                      id="bsBombDangerBody"
                      cx="35%"
                      cy="30%"
                      r="70%"
                    >
                      <stop offset="0%" stopColor="#ffda95" />
                      <stop offset="45%" stopColor="#ff9c38" />
                      <stop offset="100%" stopColor="#e65a24" />
                    </radialGradient>
                    <radialGradient
                      id="bsBombWrongBody"
                      cx="35%"
                      cy="30%"
                      r="70%"
                    >
                      <stop offset="0%" stopColor="#ffc19c" />
                      <stop offset="48%" stopColor="#fb754b" />
                      <stop offset="100%" stopColor="#d9472b" />
                    </radialGradient>
                    <radialGradient
                      id="bsBombDefusedBody"
                      cx="35%"
                      cy="30%"
                      r="70%"
                    >
                      <stop offset="0%" stopColor="#dcfff0" />
                      <stop offset="45%" stopColor="#72e6b1" />
                      <stop offset="100%" stopColor="#16a66a" />
                    </radialGradient>
                    <radialGradient id="bsSpark" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="40%" stopColor="#fef08a" />
                      <stop offset="80%" stopColor="#f04824" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>

                  {/* Fuse */}
                  <path
                    d="M 100 48 C 94 26, 126 36, 132 15"
                    fill="none"
                    stroke={
                      bombstyleFeedback === "defused"
                        ? "#059669"
                        : isBombWrong
                          ? "#b93824"
                          : isBombDanger || isBombExploded
                            ? "#c2410c"
                            : "#d97706"
                    }
                    strokeWidth="6"
                    strokeLinecap="round"
                  />

                  {/* Fuse Spark */}
                  {bombstyleFeedback !== "defused" && (
                    <g transform="translate(132, 15)">
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill="url(#bsSpark)"
                        className="animate-spark-pulse"
                      />
                      <path
                        d="M 0 -12 L 0 -4 M 0 4 L 0 12 M -12 0 L -4 0 M 4 0 L 12 0"
                        stroke={
                          isBombWrong || isBombDanger || isBombExploded
                            ? "#fb6542"
                            : "#fef08a"
                        }
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                    </g>
                  )}

                  {/* Cap */}
                  <rect
                    x="87"
                    y="40"
                    width="26"
                    height="17"
                    rx="6"
                    fill="#45464b"
                    stroke="#25262b"
                    strokeWidth="2"
                  />
                  <path
                    d="M 93 45 H 106"
                    stroke="#85868d"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Sphere */}
                  <ellipse
                    cx="100"
                    cy="116"
                    rx="73"
                    ry="70"
                    fill={
                      bombstyleFeedback === "defused"
                        ? "url(#bsBombDefusedBody)"
                        : isBombWrong
                          ? "url(#bsBombWrongBody)"
                          : isBombDanger || isBombExploded
                            ? "url(#bsBombDangerBody)"
                            : "url(#bsBombBody)"
                    }
                    stroke={
                      bombstyleFeedback === "defused"
                        ? "#059669"
                        : isBombWrong
                          ? "#c2412d"
                          : isBombDanger || isBombExploded
                            ? "#ea580c"
                            : "#3f3f46"
                    }
                    strokeWidth="2.5"
                  />
                  {/* Soft shell sheen keeps the rounded body readable at small sizes. */}
                  <path
                    d="M 48 91 Q 58 65 83 61"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="7"
                    strokeLinecap="round"
                    opacity="0.13"
                  />
                  <path
                    d="M 131 171 Q 150 162 157 147"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.08"
                  />

                  {/* Eyes & Mouth Expression */}
                  {bombstyleFeedback === "defused" ? (
                    <g>
                      <path
                        d="M 73 111 L 80 103 L 87 111 M 113 111 L 120 103 L 127 111"
                        fill="none"
                        stroke="#065f46"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 82 128 Q 100 148 118 128"
                        fill="none"
                        stroke="#065f46"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </g>
                  ) : isBombExploded ? (
                    <g>
                      {/* A soft surprised expression keeps wrong-answer feedback friendly. */}
                      <path
                        d="M 70 111 Q 79 101 88 111 M 112 111 Q 121 101 130 111"
                        fill="none"
                        stroke="#71351d"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                      />
                      <ellipse
                        cx="100"
                        cy="136"
                        rx="5.5"
                        ry="7"
                        fill="none"
                        stroke="#71351d"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="72"
                        cy="128"
                        r="5"
                        fill="#fb7185"
                        opacity="0.28"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="5"
                        fill="#fb7185"
                        opacity="0.28"
                      />
                    </g>
                  ) : isBombWrong ? (
                    <g>
                      <path
                        d="M 72 111 L 80 105 L 88 111 M 112 111 L 120 105 L 128 111"
                        fill="none"
                        stroke="#7f271c"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 88 137 Q 100 125 112 137"
                        fill="none"
                        stroke="#7f271c"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="72"
                        cy="128"
                        r="5"
                        fill="#be123c"
                        opacity="0.48"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="5"
                        fill="#be123c"
                        opacity="0.48"
                      />
                    </g>
                  ) : isBombStartled ? (
                    <g
                      fill="none"
                      stroke={isBombDanger ? "#71351d" : "#fff4e6"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path
                        d="M 73 104 L 83 110 L 73 116 M 127 104 L 117 110 L 127 116"
                        strokeWidth="4.5"
                      />
                      <path
                        d="M 73 94 L 85 91 M 115 91 L 127 94"
                        strokeWidth="3"
                      />
                      <ellipse
                        cx="100"
                        cy="134"
                        rx="5"
                        ry="7"
                        strokeWidth="3.5"
                      />
                    </g>
                  ) : isBombWorried ? (
                    <g>
                      <path
                        d="M 72 110 L 80 103 L 88 110"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 112 110 L 120 103 L 128 110"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 72 96 L 86 92 M 114 92 L 128 96"
                        fill="none"
                        stroke="#fff4e6"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 91 136 Q 100 129 109 136"
                        fill="none"
                        stroke="#fff4e6"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="72"
                        cy="128"
                        r="5"
                        fill="#fb7185"
                        opacity="0.3"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="5"
                        fill="#fb7185"
                        opacity="0.3"
                      />
                    </g>
                  ) : (
                    <g>
                      <path
                        d="M 73 110 L 80 103 L 87 110"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 113 110 L 120 103 L 127 110"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="76"
                        cy="126"
                        r="5"
                        fill="#fb7185"
                        opacity="0.35"
                      />
                      <circle
                        cx="124"
                        cy="126"
                        r="5"
                        fill="#fb7185"
                        opacity="0.35"
                      />
                      <path
                        d="M 90 130 Q 100 141 110 130"
                        fill="none"
                        stroke="#fff4e6"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </g>
                  )}
                  {(isBombWorried || isBombStartled) && (
                    <g>
                      {/* One temple sweat bead, clearly above the eyes. */}
                      <path
                        d="M 51 65 C 48 74 41 81 41 87 C 41 99 59 99 59 87 C 59 81 54 72 51 65 Z"
                        fill="#7dd3fc"
                        stroke="#0284c7"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 46 84 Q 44 88 47 91"
                        fill="none"
                        stroke="#e0f2fe"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </g>
                  )}
                  {isBombStartled && (
                    <g transform="rotate(12 180 69)" aria-hidden="true">
                      <rect
                        x="169"
                        y="47"
                        width="22"
                        height="40"
                        rx="11"
                        fill="#fff3e3"
                        stroke="#fdba74"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 180 56 V 69"
                        stroke="#c2410c"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <circle cx="180" cy="78" r="2.2" fill="#c2410c" />
                    </g>
                  )}
                </svg>
              </div>
              {isBombExploded && (
                <div className="csm-arena-cartoon-explosion" aria-hidden="true">
                  <span className="csm-arena-smoke puff-1" />
                  <span className="csm-arena-smoke puff-2 is-dark" />
                  <span className="csm-arena-smoke puff-3" />
                  <span className="csm-arena-smoke puff-4 is-dark" />
                  <span className="csm-arena-smoke puff-5 is-dark" />
                  <span className="csm-arena-smoke puff-6" />
                  <span className="csm-arena-smoke puff-7" />
                  <span className="csm-arena-smoke puff-8 is-dark" />
                  <span className="csm-arena-smoke puff-9 is-dark" />
                  <span className="csm-arena-smoke puff-10" />
                  <span className="csm-arena-smoke puff-11" />
                  <span className="csm-arena-smoke puff-12 is-dark" />
                  <i className="csm-arena-debris debris-1" />
                  <i className="csm-arena-debris debris-2" />
                  <i className="csm-arena-debris debris-3" />
                  <i className="csm-arena-debris debris-4" />
                  <i className="csm-arena-debris debris-5" />
                  <i className="csm-arena-debris debris-6" />
                  <i className="csm-arena-debris debris-7" />
                  <i className="csm-arena-debris debris-8" />
                </div>
              )}
            </div>

            {/* Session Timer Progress Bar */}
            <div className="csm-arena-timer-box">
              <div
                className={`csm-arena-timer-text ${isBombDanger ? "danger" : ""}`}
              >
                {bombstyleTimeRemaining.toFixed(1)}s
              </div>
              <div className="csm-arena-timer-bar">
                <div
                  className={`csm-arena-timer-fill ${isBombDanger ? "danger" : ""}`}
                  style={{
                    width: `${bombTimerPercent}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card (Consistent High Contrast) */}
            {activeBombstyleCard && (
              <div className="csm-arena-question-card">
                <div className="csm-arena-question-kicker">
                  QUESTION #{bombstyleIndex + 1}{" "}
                  {activeBombstyleCard.hint
                    ? `• ${activeBombstyleCard.hint}`
                    : ""}
                </div>
                <div className="csm-arena-question-prompt">
                  {activeBombstyleCard.prompt}
                </div>
              </div>
            )}

            {/* Answer Box (Shown when Revealed) */}
            {bombstyleRevealed && activeBombstyleCard && (
              <div
                className={`csm-arena-answer-box ${isBombExploded || isBombWrong ? "incorrect" : "correct"}`}
                role="status"
                aria-live="polite"
              >
                {bombstyleAnswerDraft && (
                  <div className="csm-arena-submitted-answer">
                    YOUR ANSWER: {bombstyleAnswerDraft}
                    {isBombExploded || isBombWrong ? " — INCORRECT" : ""}
                  </div>
                )}
                <div className="csm-arena-answer-label">CORRECT ANSWER</div>
                <div className="csm-arena-answer-content">
                  {activeBombstyleCard.correctAnswer}
                </div>
                {activeBombstyleCard.explanation && (
                  <div className="csm-arena-answer-explanation">
                    {activeBombstyleCard.explanation}
                  </div>
                )}
              </div>
            )}

            {/* Action / Decision Zone */}
            <div className="csm-arena-controls-zone">
              {!bombstyleRevealed ? (
                activeBombstyleCard.type === "MULTIPLE_CHOICE" ? (
                  <div className="csm-arena-answer-choice-wrap">
                    <div className="csm-arena-choice-grid">
                      {(activeBombstyleCard.options || []).map(
                        (option, optionIndex) => (
                          <button
                            key={optionIndex}
                            type="button"
                            className="csm-arena-choice-btn"
                            onClick={() => handleBombstyleAnswer(option)}
                          >
                            <span>{optionIndex + 1}</span>
                            {option}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="csm-arena-shortcut-hint">
                      Keyboard: press 1-
                      {Math.min(activeBombstyleCard.options?.length || 0, 8)} to
                      answer
                    </div>
                  </div>
                ) : activeBombstyleCard.type === "TRUE_FALSE" ? (
                  <div className="csm-arena-answer-choice-wrap">
                    <div className="csm-arena-choice-grid csm-arena-boolean-grid">
                      {["True", "False"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="csm-arena-choice-btn"
                          onClick={() => handleBombstyleAnswer(option)}
                        >
                          <span>{option === "True" ? "✓" : "×"}</span>
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="csm-arena-shortcut-hint">
                      Keyboard: press 1 for True or 2 for False
                    </div>
                  </div>
                ) : (
                  <form
                    className="csm-arena-identification-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleBombstyleAnswer(bombstyleAnswerDraft);
                    }}
                  >
                    <input
                      ref={bombstyleAnswerInputRef}
                      type="text"
                      value={bombstyleAnswerDraft}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBombstyleAnswerDraft(value);
                        if (value.trim()) setBombstyleAnswerError("");
                      }}
                      placeholder="Type your answer"
                      autoComplete="off"
                      aria-label="Your answer"
                      aria-invalid={!!bombstyleAnswerError}
                      aria-describedby={
                        bombstyleAnswerError
                          ? "bombstyle-answer-error"
                          : undefined
                      }
                    />
                    <button type="submit">Submit Answer</button>
                    {bombstyleAnswerError && (
                      <span
                        id="bombstyle-answer-error"
                        className="csm-arena-answer-error"
                        role="alert"
                      >
                        {bombstyleAnswerError}
                      </span>
                    )}
                  </form>
                )
              ) : (
                <div className="csm-arena-answer-status">
                  Answer submitted — advancing automatically
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: RESULTS SCREEN */}
      {bombstylePhase === "results" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className="csm-arena-results-card">
            <div
              className={`csm-arena-results-icon ${bombstyleTimeRemaining > 0 ? "complete" : "detonated"}`}
            >
              {bombstyleTimeRemaining > 0 ? (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="14" r="7" />
                  <path d="M12 7V4" />
                  <path d="M9 4h6" />
                </svg>
              )}
            </div>

            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#090d14",
                margin: "0",
              }}
            >
              {bombstyleTimeRemaining > 0
                ? "BOMBSTYLE COMPLETE"
                : "SESSION DETONATED"}
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: "8px auto 0",
                maxWidth: "480px",
              }}
            >
              {bombstyleTimeRemaining > 0
                ? "Outstanding recall! You defused the cards and beat the countdown."
                : "The countdown reached zero under pressure. Review your missed cards below to lock in the concepts."}
            </p>

            {/* Stats Grid */}
            <div className="csm-arena-stats-grid">
              <div className="csm-arena-stat-cell">
                <span className="csm-arena-stat-label">DEFUSED</span>
                <span
                  className="csm-arena-stat-val"
                  style={{
                    color: "#10b981",
                  }}
                >
                  {bombstyleCorrectCount} / {bombstyleQueue.length}
                </span>
              </div>
              <div className="csm-arena-stat-cell">
                <span className="csm-arena-stat-label">ACCURACY</span>
                <span
                  className="csm-arena-stat-val"
                  style={{
                    color: "#090d14",
                  }}
                >
                  {Math.round(
                    (bombstyleCorrectCount / (bombstyleQueue.length || 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="csm-arena-stat-cell">
                <span className="csm-arena-stat-label">BEST STREAK</span>
                <span
                  className="csm-arena-stat-val"
                  style={{
                    color: "#f04824",
                  }}
                >
                  {bombstyleMaxStreak}x
                </span>
              </div>
              <div className="csm-arena-stat-cell">
                <span className="csm-arena-stat-label">TIME SPENT</span>
                <span
                  className="csm-arena-stat-val"
                  style={{
                    color: "#334155",
                  }}
                >
                  {Math.floor(bombstyleDurationSeconds / 60)}m{" "}
                  {bombstyleDurationSeconds % 60}s
                </span>
              </div>
              <div className="csm-arena-stat-cell">
                <span className="csm-arena-stat-label">MISSED CARDS</span>
                <span
                  className="csm-arena-stat-val"
                  style={{
                    color: "#f59e0b",
                  }}
                >
                  {bombstyleMissedCards.length}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {bombstyleMissedCards.length > 0 && (
                <button
                  type="button"
                  className="csm-arena-primary-btn"
                  style={{
                    background: "#f59e0b",
                    boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                  }}
                  onClick={() => setBombstylePhase("review_missed")}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  REVIEW MISSED CARDS ({bombstyleMissedCards.length})
                </button>
              )}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="csm-arena-primary-btn"
                  onClick={() => handleStartBombstyle()}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  PLAY AGAIN
                </button>
                <button
                  type="button"
                  className="csm-arena-secondary-btn"
                  onClick={() => setBombstylePhase("select_deck")}
                >
                  BACK TO CHALLENGE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: MISSED CARD REVIEW */}
      {bombstylePhase === "review_missed" && (
        <div>
          <div className="csm-page-head">
            <div>
              <span className="csm-kicker">POST-SESSION LEARNING</span>
              <h1>Missed Bombcards ({bombstyleMissedCards.length})</h1>
              <p>
                These are the cards you missed during the pressure run for{" "}
                {bombstyleActiveDeck?.code || "this deck"}. Review them below,
                then jump to Study to commit them to memory.
              </p>
            </div>
            <div className="csm-page-actions csm-bombstyle-missed-actions">
              <button
                type="button"
                className="csm-primary-button"
                onClick={handleStudyMissedDeck}
              >
                <IconCards /> <span>Library</span>
              </button>
              <button
                type="button"
                className="csm-secondary-button"
                onClick={() => handleStartBombstyle(bombstyleMissedCards)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 7v5h-5" />
                  <path d="M4 17v-5h5" />
                  <path d="M5.6 9A7 7 0 0 1 17.2 6L20 12M4 12l2.8 6A7 7 0 0 0 18.4 15" />
                </svg>
                <span>Retry</span>
              </button>
              <button
                type="button"
                className="csm-secondary-button"
                onClick={() => setBombstylePhase("results")}
              >
                <IconArrowLeft /> <span>Back to Results</span>
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="csm-arena-missed-list">
            {bombstyleMissedCards.map((card, idx) => (
              <div key={card.id || idx} className="csm-arena-missed-item">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    CARD #{idx + 1} {card.hint ? `• ${card.hint}` : ""}
                  </span>
                  <span className="csm-arena-missed-tag">
                    {card.resultReason === "timed_out" ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <svg
                          style={{
                            width: "12px",
                            height: "12px",
                            color: "#f59e0b",
                          }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <circle cx="12" cy="12" r="9" strokeWidth="2" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 7v5l3 2"
                          />
                        </svg>
                        Timed Out
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <svg
                          style={{
                            width: "12px",
                            height: "12px",
                            color: "#ef4444",
                          }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Missed
                      </span>
                    )}
                  </span>
                </div>
                <div className="csm-arena-missed-prompt">{card.prompt}</div>
                <div
                  style={{
                    marginTop: "4px",
                    paddingTop: "10px",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      color: "#64748b",
                      fontWeight: 800,
                      display: "block",
                    }}
                  >
                    Correct Answer
                  </span>
                  <div className="csm-arena-missed-answer">
                    {card.correctAnswer}
                  </div>
                  {card.explanation && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      {card.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
