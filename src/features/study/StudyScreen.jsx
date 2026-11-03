import {
  IconArrowLeft,
  IconArrowRight,
  IconCards,
  IconLock,
  IconPlus,
} from "../../components/icons.jsx";
import React from "react";
export function StudyScreen({
  activeDeckAccuracy,
  activeDeckMissedCount,
  activeFlashcard,
  activeFlashcardDeck,
  decks,
  flashcardDragX,
  flashcardFlipped,
  flashcardIndex,
  flashcardIsDragging,
  flashcardMotionLockRef,
  flashcardMotionTimerRef,
  flashcardSwipePhase,
  flashcards,
  flipFlashcard,
  handleFlashcardPointerCancel,
  handleFlashcardPointerDown,
  handleFlashcardPointerMove,
  handleFlashcardPointerUp,
  handleOpenGameMode,
  ignoreFlashcardClickRef,
  isGuest,
  navigateFlashcard,
  prepareNewBombcard,
  setActiveTab,
  setCreatorTargetDeckId,
  setFlashcardDragX,
  setFlashcardFlipped,
  setFlashcardIndex,
  setFlashcardSwipePhase,
  setGuestLockedSection,
  setSelectedDeckIds,
}) {
  return (
    <div className="csm-screen csm-flashcards-screen custom-scroll">
      <div className="csm-page-head">
        <div>
          <span className="csm-kicker">ACTIVE REVIEW</span>
          <h1>Study Bombcards</h1>
          <p>
            Recall first, reveal the answer when you&apos;re ready. Focus on
            understanding before moving forward.
          </p>
        </div>
        <button
          type="button"
          className="csm-secondary-button csm-study-back-button"
          onClick={() => setActiveTab("library")}
        >
          <IconArrowLeft /> Back to original deck
        </button>
      </div>
      <div className="csm-viewer-toolbar">
        <label>
          Reviewing deck
          <select
            value={activeFlashcardDeck?.id || ""}
            onChange={(e) => {
              setSelectedDeckIds([e.target.value]);
              setFlashcardIndex(0);
              setFlashcardFlipped(false);
              setFlashcardDragX(0);
              setFlashcardSwipePhase("");
              window.clearTimeout(flashcardMotionTimerRef.current);
              flashcardMotionLockRef.current = false;
            }}
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.title || deck.subject || deck.code} (
                {deck.cards?.length || 0} cards)
              </option>
            ))}
          </select>
        </label>
        <div className="csm-viewer-toolbar-actions">
          <button
            type="button"
            className="csm-secondary-button"
            onClick={() => {
              if (isGuest) {
                setGuestLockedSection("creator");
                return;
              }
              prepareNewBombcard();
              setCreatorTargetDeckId(activeFlashcardDeck?.id || decks[0]?.id);
              setActiveTab("creator");
            }}
          >
            {isGuest ? (
              <IconLock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            ) : (
              <IconPlus className="w-3.5 h-3.5 mr-1.5 text-[#f04824]" />
            )}{" "}
            Create Bombcards
          </button>
          <button
            type="button"
            className="csm-primary-button"
            onClick={() => {
              if (isGuest) {
                setGuestLockedSection("arena");
                return;
              }
              handleOpenGameMode(activeFlashcardDeck?.id);
            }}
          >
            {isGuest && (
              <IconLock className="w-3.5 h-3.5 mr-1.5 text-white/90" />
            )}
            Play Bombstyle <IconArrowRight />
          </button>
        </div>
        <span className="csm-viewer-progress">
          Card{" "}
          {flashcards.length
            ? Math.min(flashcardIndex + 1, flashcards.length)
            : 0}{" "}
          of {flashcards.length}
        </span>
      </div>
      <div className="csm-viewer-layout">
        <section className="csm-flashcard-panel">
          <div className="csm-flashcard-progress">
            <span
              style={{
                width: `${flashcards.length ? ((flashcardIndex + 1) / flashcards.length) * 100 : 0}%`,
              }}
            />
          </div>
          {flashcards.length > 0 ? (
            <div className="csm-flashcard-stage">
              <button
                type="button"
                className={`csm-flashcard csm-study-flip-card ${flashcardFlipped ? "is-flipped" : ""} ${flashcardIsDragging ? "is-dragging" : ""} ${flashcardSwipePhase ? `is-swipe-${flashcardSwipePhase}` : ""}`}
                style={
                  flashcardIsDragging
                    ? {
                        "--flashcard-drag-x": `${flashcardDragX}px`,
                        "--flashcard-drag-rotation": `${flashcardDragX * 0.025}deg`,
                      }
                    : undefined
                }
                onPointerDown={handleFlashcardPointerDown}
                onPointerMove={handleFlashcardPointerMove}
                onPointerUp={handleFlashcardPointerUp}
                onPointerCancel={handleFlashcardPointerCancel}
                onClick={() => {
                  if (ignoreFlashcardClickRef.current) {
                    ignoreFlashcardClickRef.current = false;
                    return;
                  }
                  flipFlashcard();
                }}
                aria-label={
                  flashcardFlipped ? "Show question" : "Reveal answer"
                }
              >
                <span className="csm-study-flip-inner">
                  <span
                    className="csm-study-flip-face csm-study-flip-front"
                    aria-hidden={flashcardFlipped}
                  >
                    <span className="csm-flashcard-side-label">QUESTION</span>
                    <strong>
                      {activeFlashcard?.prompt || "No cards in this deck yet."}
                    </strong>
                    <small>
                      Click or press Space to reveal answer &bull; Swipe or use
                      &larr; &rarr; to navigate
                    </small>
                  </span>
                  <span
                    className="csm-study-flip-face csm-study-flip-back"
                    aria-hidden={!flashcardFlipped}
                  >
                    <span className="csm-flashcard-side-label">ANSWER</span>
                    <strong>
                      {activeFlashcard?.correctAnswer || "No answer saved yet"}
                    </strong>
                    {activeFlashcard?.explanation && (
                      <p>{activeFlashcard.explanation}</p>
                    )}
                    <small>
                      Click or press Space to see question &bull; Swipe or use
                      &larr; &rarr; to navigate
                    </small>
                  </span>
                </span>
              </button>
            </div>
          ) : (
            <div className="csm-flashcard flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#f04824] flex items-center justify-center mb-3">
                <IconCards className="w-6 h-6" />
              </div>
              <strong className="text-lg text-slate-800">
                No Bombcards in this deck yet
              </strong>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Add your first question to start studying this reviewer.
              </p>
              <button
                type="button"
                className="csm-primary-button"
                onClick={() => {
                  prepareNewBombcard();
                  setCreatorTargetDeckId(
                    activeFlashcardDeck?.id || decks[0]?.id,
                  );
                  setActiveTab("creator");
                }}
              >
                <IconPlus className="w-3.5 h-3.5 mr-1" /> Create Bombcards
              </button>
            </div>
          )}
          <div className="csm-viewer-controls">
            <button
              type="button"
              className="csm-secondary-button"
              onClick={() => navigateFlashcard(-1)}
              disabled={flashcardIndex === 0 || !!flashcardSwipePhase}
            >
              &larr; Previous
            </button>
            <button
              type="button"
              className="csm-primary-button"
              onClick={() => navigateFlashcard(1)}
              disabled={
                !flashcards.length ||
                flashcardIndex >= flashcards.length - 1 ||
                !!flashcardSwipePhase
              }
            >
              Next card <IconArrowRight />
            </button>
          </div>
        </section>
        <aside className="csm-review-summary">
          <span className="csm-kicker">SESSION SUMMARY</span>
          <h2>{activeFlashcardDeck?.code || "Your deck"}</h2>
          <div className="csm-summary-stat">
            <strong>{flashcards.length}</strong>
            <span>cards in deck</span>
          </div>
          <div className="csm-summary-stat">
            <strong>{activeDeckAccuracy}%</strong>
            <span>average accuracy</span>
          </div>
          <div className="csm-summary-stat">
            <strong>{activeDeckMissedCount}</strong>
            <span>missed to revisit</span>
          </div>
          <button
            type="button"
            className="csm-secondary-button csm-missed-practice-button"
            onClick={() => {
              if (isGuest) {
                setGuestLockedSection("arena");
                return;
              }
              setActiveTab("game");
            }}
          >
            {isGuest && (
              <IconLock className="w-3 h-3 mr-1 inline-block text-slate-400" />
            )}
            <span>Practice missed cards</span>
            <IconArrowRight />
          </button>
        </aside>
      </div>
    </div>
  );
}
