import {
  IconArrowRight,
  IconCards,
  IconPdf,
  IconUser,
} from "../../components/icons.jsx";
import { ProgressBar } from "../../components/ui/ProgressBar.jsx";
import React from "react";
export function LibraryDeckCard({
  deck,
  onOpen,
  actions,
  isGuest = false,
  studyProgress = [],
}) {
  const [isOpening, setIsOpening] = React.useState(false);
  const openTimerRef = React.useRef(null);
  const cardCount = deck.cards?.length || 0;
  const documentCount = deck.documents?.length || 0;
  const deckProgress = studyProgress.filter(
    (progress) => progress.deck_id === deck.id,
  );
  const knownCount = deckProgress.filter(
    (progress) =>
      progress.status === "known" ||
      (Number(progress.times_known) || 0) >
        (Number(progress.times_unknown) || 0),
  ).length;
  const masteryPct = cardCount
    ? Math.min(100, Math.round((knownCount / cardCount) * 100))
    : 0;
  React.useEffect(
    () => () => window.clearTimeout(openTimerRef.current),
    [],
  );
  const openDeck = (event) => {
    if (event.target.closest("button, a, select, input")) return;
    if (isOpening) return;
    setIsOpening(true);
    openTimerRef.current = window.setTimeout(() => onOpen(deck), 160);
  };
  return (
    <article
      className={`csm-library-deck-card${isOpening ? " is-opening" : ""}`}
      onClick={openDeck}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          openDeck(event);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${deck.code || deck.title} deck`}
      aria-disabled={isOpening}
    >
      <div className="csm-library-deck-card-top">
        <span className="csm-library-deck-icon">
          <IconCards />
        </span>
        {!isGuest && actions}
      </div>
      <div className="csm-library-deck-card-copy">
        <h3>{deck.code || deck.title}</h3>
        <p>{deck.subject || "Information Technology"}</p>
        <div
          className="csm-library-deck-material-counts"
          aria-label="Deck contents"
        >
          <span>
            <IconCards />
            {cardCount} Bombcards
          </span>
          <span>
            <IconPdf />
            {documentCount} PDF{documentCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {!isGuest && (
        <div className="csm-library-deck-progress">
          <div className="csm-library-deck-progress-copy">
            <span>
              {knownCount} of {cardCount} cards known
            </span>
            <strong>{masteryPct}%</strong>
          </div>
          <ProgressBar
            className="csm-library-deck-progress-track"
            label={`${deck.code || deck.title} mastery progress`}
            value={masteryPct}
          />
        </div>
      )}
      <div className="csm-library-deck-card-footer">
        <span>
          <IconUser />{" "}
          {isGuest ? `By ${deck.owner || "Shared Reviewer"}` : "By you"}
        </span>
        <strong>
          Open deck <IconArrowRight />
        </strong>
      </div>
    </article>
  );
}
