import React from "react";
import { Button } from "../ui/Button.jsx";
import { Modal } from "../ui/Modal.jsx";
export function ChangeConfirmationDialog({
  changeConfirmation,
  setChangeConfirmation,
}) {
  return (
    <Modal
      className="csm-change-modal"
      titleId="change-confirmation-title"
      onClose={() => setChangeConfirmation(null)}
    >
      <div className="csm-change-icon" aria-hidden="true">
        ✓
      </div>
      <span className="csm-kicker">CHANGE CONFIRMED</span>
      <h2 id="change-confirmation-title">{changeConfirmation.title}</h2>
      <p>{changeConfirmation.message}</p>
      <Button variant="primary" onClick={() => setChangeConfirmation(null)}>
        Done
      </Button>
    </Modal>
  );
}
