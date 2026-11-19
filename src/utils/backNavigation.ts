/**
 * Global LIFO stack for transient child overlays/modals (e.g., Avatar lightbox,
 * MemberDetailsModal, StatementPrintModal, OverdueReminderPopupModal) so hardware
 * or browser Back closes the topmost overlay first before stepping back through tab history.
 */

type BackCloseHandler = () => void;

const overlayBackStack: Array<{ id: symbol; close: BackCloseHandler }> = [];

export function registerBackHandler(close: BackCloseHandler): () => void {
  const entry = { id: Symbol('back-overlay'), close };
  overlayBackStack.push(entry);

  return () => {
    const idx = overlayBackStack.findIndex((item) => item.id === entry.id);
    if (idx !== -1) {
      overlayBackStack.splice(idx, 1);
    }
  };
}

export function popTopBackHandler(): boolean {
  if (overlayBackStack.length === 0) return false;
  const top = overlayBackStack.pop();
  if (top) {
    top.close();
    return true;
  }
  return false;
}
