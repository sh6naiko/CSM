import { canonicalDeckTitle } from "../../utils/decks.js";
import React from "react";
export function DeckFormDialog({
  folderDescInput,
  folderNameDuplicate,
  folderNameInput,
  handleSaveFolderInfo,
  setFolderDescInput,
  setFolderInfoModalOpen,
  setFolderNameInput,
  targetFolderForEdit,
}) {
  return (
    <div
      className="csm-modal-backdrop"
      role="presentation"
      onClick={() => setFolderInfoModalOpen(false)}
    >
      <form
        className="csm-deck-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-form-title"
        onSubmit={handleSaveFolderInfo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csm-form-modal-header">
          <div>
            <span className="csm-kicker">
              {targetFolderForEdit ? "EDIT DECK" : "NEW DECK"}
            </span>
            <h2 id="deck-form-title">
              {targetFolderForEdit ? "Edit deck details" : "Add a deck"}
            </h2>
          </div>
          <button
            type="button"
            className="csm-form-modal-close"
            onClick={() => setFolderInfoModalOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="csm-form-modal-help">
          Keep your study materials organized by title and subject.
        </p>
        <label className="csm-modal-field">
          Deck title
          <input
            autoFocus
            type="text"
            value={folderNameInput}
            onChange={(e) => setFolderNameInput(e.target.value)}
            placeholder="e.g. ITE 292 B1"
            maxLength="160"
            aria-invalid={folderNameDuplicate}
            aria-describedby={
              folderNameDuplicate ? "deck-title-error" : undefined
            }
            required
          />
          {folderNameDuplicate && (
            <span
              id="deck-title-error"
              className="text-[11px] font-semibold text-red-600"
            >
              You already have a deck with this title.
            </span>
          )}
        </label>
        <label className="csm-modal-field">
          Subject
          <input
            type="text"
            value={folderDescInput}
            onChange={(e) => setFolderDescInput(e.target.value)}
            placeholder="e.g. Information Technology"
          />
        </label>
        <div className="csm-delete-actions">
          <button
            type="button"
            className="csm-secondary-button"
            onClick={() => setFolderInfoModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="csm-primary-button"
            disabled={
              !canonicalDeckTitle(folderNameInput) || folderNameDuplicate
            }
          >
            {targetFolderForEdit ? "Save changes" : "Add deck"}
          </button>
        </div>
      </form>
    </div>
  );
}
