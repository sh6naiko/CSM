import React, { useId } from "react";
import { Button } from "../ui/Button.jsx";
import { Modal } from "../ui/Modal.jsx";

export function ConfirmationDialog({
  title,
  message,
  kicker,
  icon,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger",
  busy = false,
  error,
}) {
  const id = useId();
  return (
    <Modal
      className="csm-delete-modal"
      titleId={`${id}-title`}
      descriptionId={`${id}-description`}
      onClose={onCancel}
      busy={busy}
    >
      {icon && (
        <div className="csm-delete-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      {kicker && <span className="csm-kicker">{kicker}</span>}
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{message}</p>
      {error && <p role="alert">{error}</p>}
      <div className="csm-delete-actions">
        <Button disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant} disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
