import { useCallback, useEffect, useRef } from 'react';
import type { GalleryItem } from '../content/types';
import { Clip, Picture, useAsset } from './Media';

interface Props {
  items: GalleryItem[];
  index: number | null;
  onIndex: (i: number | null) => void;
}

/** Fullscreen viewer built on <dialog>: focus trap, Esc, arrows, swipe. */
export function Lightbox({ items, index, onIndex }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const open = index !== null;
  const item = open ? items[index] : undefined;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close();
  }, [open]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (index === null) return;
      onIndex((index + dir + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  return (
    <dialog
      ref={ref}
      aria-label="Memory viewer"
      onClose={() => onIndex(null)}
      onCancel={() => onIndex(null)}
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-night/95 p-0 text-ivory backdrop:bg-black/80"
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const s = touch.current;
        const t = e.changedTouches[0];
        touch.current = null;
        if (!s || !t) return;
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
        else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) onIndex(null);
      }}
    >
      {item && (
        <Slide key={item.id} item={item} position={`${(index ?? 0) + 1} / ${items.length}`} />
      )}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 flex items-center justify-between px-4"
        style={{ paddingTop: 'calc(var(--safe-top) + 0.75rem)' }}
      >
        <span className="kicker text-ivory/70">
          {open ? `${(index ?? 0) + 1} / ${items.length}` : ''}
        </span>
        <button
          type="button"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-night/70"
          onClick={() => onIndex(null)}
          aria-label="Close viewer"
          autoFocus
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {items.length > 1 && (
        <div
          className="fixed inset-x-0 flex justify-between px-3"
          style={{ bottom: 'calc(var(--safe-bottom) + 1rem)' }}
        >
          <button
            type="button"
            className="btn btn-ghost h-12 w-12 !p-0"
            onClick={() => step(-1)}
            aria-label="Previous memory"
          >
            ‹
          </button>
          <button
            type="button"
            className="btn btn-ghost h-12 w-12 !p-0"
            onClick={() => step(1)}
            aria-label="Next memory"
          >
            ›
          </button>
        </div>
      )}
    </dialog>
  );
}

function Slide({ item, position }: { item: GalleryItem; position: string }) {
  const asset = useAsset(item);
  return (
    <figure
      className="flex h-full flex-col items-center justify-center gap-4 px-4 py-20"
      aria-roledescription="slide"
      aria-label={position}
    >
      <div className="relative flex max-h-[76dvh] w-full max-w-[min(92vw,calc(76dvh*0.5625))] items-center justify-center">
        {asset?.kind === 'video' ? (
          <Clip
            media={item}
            controls
            autoPlay
            ambient={false}
            className="max-h-[76dvh] w-full rounded-sm object-contain"
          />
        ) : (
          <Picture
            media={item}
            sizes="92vw"
            eager
            className="max-h-[76dvh] w-auto rounded-sm object-contain"
          />
        )}
      </div>
      {item.caption && (
        <figcaption className="display text-center text-2xl italic text-ivory/90">
          {item.caption}
        </figcaption>
      )}
    </figure>
  );
}
