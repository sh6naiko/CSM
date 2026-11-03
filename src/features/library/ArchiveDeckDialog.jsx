import { IconTrash } from "../../components/icons.jsx";
import React from "react";
import { ConfirmationDialog } from "../../components/dialogs/ConfirmationDialog.jsx";
export function ArchiveDeckDialog({
  confirmDeleteFolder,
  deleteDeckTarget,
  setDeleteDeckTarget,
}) {
  return (
    <ConfirmationDialog
      title={`Move “${deleteDeckTarget.code || deleteDeckTarget.title}” to Archive?`}
      message="The deck, Bombcards, and PDFs will be kept safely in your archive. You can restore the deck later."
      kicker="DECK ARCHIVE"
      icon={<IconTrash />}
      variant="primary"
      confirmLabel="Move to archive"
      onConfirm={confirmDeleteFolder}
      onCancel={() => setDeleteDeckTarget(null)}
    />
  );
}
