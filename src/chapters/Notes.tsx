import { useRef, useState } from 'react';
import { useContent } from '../components/ContentContext';
import { useReveal } from '../hooks/useReveal';
import { sound } from '../lib/sound';

/** Scene 5 — Little Things I Adore: sealed notes she taps open. */
export function Notes() {
  const c = useContent();
  const scope = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  useReveal(scope);
  const total = c.notes.items.length;

  return (
    <section
      id="adore"
      ref={scope}
      aria-labelledby="adore-title"
      className="chapter mx-auto max-w-5xl"
    >
      <p className="kicker" data-reveal>
        {c.notes.kicker}
      </p>
      <h2 id="adore-title" data-reveal className="display mt-4 text-[clamp(2.6rem,11vw,5rem)]">
        {c.notes.title}
      </h2>
      <p data-reveal className="mt-3 text-sm text-ivory/60" aria-live="polite">
        {opened.size === 0
          ? 'Tap a note to break its seal.'
          : opened.size < total
            ? `${opened.size} of ${total} opened`
            : 'All of them — and still not everything.'}
      </p>

      <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {c.notes.items.map((note, i) => {
          const isOpen = opened.has(i);
          return (
            <li key={i} data-reveal className="[perspective:1200px]">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`note-${i}`}
                onClick={() => {
                  if (!isOpen) sound.chime();
                  setOpened((s) => {
                    const n = new Set(s);
                    if (n.has(i)) n.delete(i);
                    else n.add(i);
                    return n;
                  });
                }}
                className="relative block aspect-[4/5] w-full sm:aspect-[4/3] text-left transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
                style={{ transform: isOpen ? 'rotateY(180deg)' : 'none' }}
              >
                {/* sealed side */}
                <span
                  aria-hidden={isOpen}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-sm border border-champagne/25 bg-night-2 [backface-visibility:hidden]"
                  style={{
                    backgroundImage:
                      'linear-gradient(160deg, rgb(255 255 255 / 0.04), transparent 50%)',
                  }}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-champagne-deep text-night shadow-[inset_0_-3px_6px_rgb(0_0_0/0.25)]">
                    ☾
                  </span>
                  <span className="kicker text-ivory/70">{note.label}</span>
                </span>
                {/* opened side */}
                <span
                  id={`note-${i}`}
                  aria-hidden={!isOpen}
                  className="absolute inset-0 flex items-center justify-center rounded-sm bg-paper p-4 text-center sm:p-6 text-ink [backface-visibility:hidden] [transform:rotateY(180deg)]"
                >
                  <span className="display text-[clamp(1.2rem,5.2vw,1.7rem)] italic leading-tight">
                    {note.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
