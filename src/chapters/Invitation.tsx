import { useRef } from 'react';
import { Countdown } from '../components/Countdown';
import { useContent } from '../components/ContentContext';
import { Moon } from '../components/Moon';
import { Words } from '../components/Words';
import { useUi } from '../content/ui';
import { useGsap } from '../hooks/useGsap';
import { DUR, EASE, STAGGER, gsap } from '../lib/motion';

/** Scene 1 — Hey, My Moon. */
export function Invitation({ opened, onOpen }: { opened: boolean; onOpen: () => void }) {
  const c = useContent();
  const ui = useUi();
  const scope = useRef<HTMLElement>(null);

  useGsap(scope, () => {
    // Overlapping entrances: everything has begun to appear within ~1 s, so
    // the first screen is readable quickly while the motion still settles slowly.
    const tl = gsap.timeline({ defaults: { ease: EASE.out } });
    tl.from('[data-moon]', {
      autoAlpha: 0,
      y: 40,
      scale: 0.85,
      duration: DUR.cinematic,
      ease: EASE.settle,
    })
      .from(
        '[data-greeting] [data-word]',
        { yPercent: 110, duration: DUR.slow, stagger: STAGGER.words, ease: EASE.settle },
        0.25,
      )
      .from(
        '[data-line] [data-word]',
        { yPercent: 110, duration: DUR.slow, stagger: STAGGER.words / 2, ease: EASE.settle },
        0.55,
      )
      .from('[data-cta]', { autoAlpha: 0, y: 12, duration: DUR.slow }, 0.45);
    // the moon breathes, very slowly
    gsap.to('[data-moon]', {
      y: -8,
      duration: 5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: DUR.cinematic,
    });
  });

  return (
    <section
      ref={scope}
      id="invitation"
      aria-labelledby="invitation-title"
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        paddingTop: 'calc(var(--safe-top) + 4rem)',
        paddingBottom: 'calc(var(--safe-bottom) + 3rem)',
      }}
    >
      <div data-moon className="mb-8 w-[min(62vw,280px)]">
        <Moon />
      </div>
      <h1 id="invitation-title" data-greeting className="display text-[clamp(3rem,13vw,6rem)]">
        <Words text={c.invitation.greeting} />
      </h1>
      <p data-line className="prose-serif mt-4 min-h-[2lh] italic text-ivory/80">
        <Words text={c.invitation.line} />
      </p>
      <div data-cta className="mt-10 flex flex-col items-center gap-10">
        {!opened ? (
          <button type="button" className="btn" onClick={onOpen}>
            <span aria-hidden="true">☾</span> {c.invitation.button}
          </button>
        ) : (
          <a href="#birthday" className="btn btn-ghost">
            {ui.continue} <span aria-hidden="true">↓</span>
          </a>
        )}
        <Countdown cfg={c.birthday} text={ui} />
      </div>
    </section>
  );
}
