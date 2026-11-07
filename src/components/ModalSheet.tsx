import { useEffect, useId, useRef, type ReactNode } from "react";

export default function ModalSheet({
  title,
  description,
  closeLabel,
  close,
  busy = false,
  children,
}: {
  title: string;
  description?: string;
  closeLabel: string;
  close: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current!;
    const focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      focus?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="swap-sheet"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
          ),
        ].filter((control) => control.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="swap-sheet-content">
        <div className="section-heading">
          <h2 id={`${id}-title`}>{title}</h2>
          <button
            type="button"
            disabled={busy}
            onClick={close}
            aria-label={closeLabel}
          >
            Close
          </button>
        </div>
        {description && <p id={`${id}-description`}>{description}</p>}
        {children}
      </div>
    </dialog>
  );
}
