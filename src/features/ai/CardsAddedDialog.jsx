import { IconSparkles } from "../../components/icons.jsx";
import React from "react";
export function CardsAddedDialog({ aiCardsAddedModal, setAiCardsAddedModal }) {
  return (
    <div className="csm-modal-backdrop" role="presentation">
      <section
        className="csm-change-modal csm-ai-added-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-cards-added-title"
        aria-describedby="ai-cards-added-copy"
      >
        <div className="csm-change-icon csm-ai-added-icon" aria-hidden="true">
          <IconSparkles className="w-5 h-5" />
        </div>
        <span className="csm-kicker">AI CARDS ADDED</span>
        <h2 id="ai-cards-added-title">Your new Bombcards are ready</h2>
        <p id="ai-cards-added-copy">
          <strong>{aiCardsAddedModal.count}</strong> AI-generated{" "}
          {aiCardsAddedModal.count === 1 ? "card was" : "cards were"} added to “
          {aiCardsAddedModal.deckTitle}”.
        </p>
        <button
          type="button"
          className="csm-primary-button"
          autoFocus
          onClick={() => setAiCardsAddedModal(null)}
        >
          Okay
        </button>
      </section>
    </div>
  );
}
