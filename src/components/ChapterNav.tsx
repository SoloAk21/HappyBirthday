import { useEffect, useRef } from 'react';

export const CHAPTERS = [
  { id: 'invitation', label: 'Hey, My Moon' },
  { id: 'birthday', label: 'A birthday worth celebrating' },
  { id: 'smile', label: 'The smile that changes everything' },
  { id: 'moments', label: 'Our little moments' },
  { id: 'adore', label: 'Little things I adore' },
  { id: 'letter', label: 'A letter for my Moon' },
  { id: 'surprise', label: 'One more surprise' },
  { id: 'wish', label: 'My birthday wish' },
  { id: 'finale', label: 'The final moonlight' },
] as const;

export function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}

/** "Revisit a moment" — a calm list of chapters in a modal dialog. */
export function ChapterNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="chapters-title"
      className="m-auto w-[min(92vw,420px)] rounded-sm border border-white/10 bg-night-2 p-0 text-ivory backdrop:bg-black/70"
    >
      <div className="p-7">
        <div className="flex items-center justify-between">
          <h2 id="chapters-title" className="kicker">
            Revisit a moment
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <ol className="mt-6 space-y-1">
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.setTimeout(() => goTo(c.id), 50);
                }}
                className="flex w-full items-baseline gap-4 rounded-sm px-2 py-3 text-left transition hover:bg-white/5"
              >
                <span className="w-6 text-xs tabular-nums text-champagne">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="display text-xl">{c.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  );
}
