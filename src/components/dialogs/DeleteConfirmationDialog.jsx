import { IconReset, IconTrash } from "../icons.jsx";
import { ConfirmationDialog } from "./ConfirmationDialog.jsx";
import React from "react";
export function DeleteConfirmationDialog({
  confirmDeleteAction,
  deleteConfirmation,
  setDeleteConfirmation,
}) {
  return (
    <ConfirmationDialog
      title={deleteConfirmation.title}
      message={deleteConfirmation.message}
      kicker={deleteConfirmation.kicker || "CONFIRM DELETION"}
      icon={
        deleteConfirmation.icon === "reset" ? <IconReset /> : <IconTrash />
      }
      confirmLabel={deleteConfirmation.confirmLabel}
      onConfirm={confirmDeleteAction}
      onCancel={() => setDeleteConfirmation(null)}
    />
  );
}
