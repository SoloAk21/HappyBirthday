import { useRef } from 'react';
import { celebrate, centerOf } from '../components/celebrate';
import { useContent } from '../components/ContentContext';
import { Moon } from '../components/Moon';
import { Picture } from '../components/Media';
import { Words } from '../components/Words';
import { useUi } from '../content/ui';
import { useGsap } from '../hooks/useGsap';
import { DUR, EASE, STAGGER, ScrollTrigger, gsap } from '../lib/motion';
import { sound } from '../lib/sound';

/** Scene 9 — The Final Moonlight. */
export function Finale({ onReplay, onMoments }: { onReplay: () => void; onMoments: () => void }) {
  const c = useContent();
  const f = c.finale;
  const ui = useUi();
  const scope = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useGsap(scope, () => {
    gsap.from('[data-rise]', {
      yPercent: 40,
      autoAlpha: 0,
      duration: DUR.cinematic * 1.5,
      ease: EASE.settle,
      scrollTrigger: { trigger: scope.current, start: 'top 75%', once: true },
    });
    gsap.fromTo(
      '[data-final-photo]',
      { clipPath: 'circle(12% at 50% 50%)' },
      {
        clipPath: 'circle(75% at 50% 50%)',
        duration: DUR.cinematic,
        ease: EASE.settle,
        scrollTrigger: { trigger: '[data-final-photo]', start: 'top 75%', once: true },
      },
    );
    gsap.from('[data-final-line]', {
      autoAlpha: 0,
      y: 16,
      duration: DUR.slow,
      ease: EASE.out,
      stagger: 0.5,
      scrollTrigger: { trigger: '[data-final-line]', start: 'top 88%', once: true },
    });
    gsap.from('[data-final-title] [data-word]', {
      yPercent: 110,
      duration: DUR.slow,
      ease: EASE.settle,
      stagger: STAGGER.words,
      scrollTrigger: { trigger: '[data-final-title]', start: 'top 85%', once: true },
    });
    gsap.from('[data-sign], [data-actions]', {
      autoAlpha: 0,
      y: 14,
      duration: DUR.slow,
      ease: EASE.out,
      stagger: 0.6,
      delay: 0.8,
      scrollTrigger: { trigger: '[data-final-title]', start: 'top 85%', once: true },
    });
  });

  useGsap(
    scope,
    () => {
      ScrollTrigger.create({
        trigger: title.current,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          sound.reveal();
          window.setTimeout(() => celebrate(centerOf(title.current), 110), 500);
        },
      });
    },
    [],
    { runWhenReduced: true },
  );

  return (
    <section
      id="finale"
      ref={scope}
      aria-labelledby="finale-title"
      className="chapter relative mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center overflow-hidden text-center"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 6rem)' }}
    >
      <div
        data-rise
        className="pointer-events-none absolute left-1/2 top-10 -z-10 w-[min(120vw,640px)] -translate-x-1/2 opacity-60"
        aria-hidden="true"
      >
        <Moon />
      </div>
      <p className="kicker">{f.kicker ?? 'Chapter IX'}</p>

      <div data-final-photo className="frame mt-10 aspect-[4/5] w-[min(84vw,400px)]">
        <Picture media={f.photo} sizes="(min-width: 640px) 400px, 84vw" />
      </div>

      {f.lines?.map((line, i) => (
        <p key={i} data-final-line className="prose-serif mt-8 max-w-md italic text-ivory/85">
          {line}
        </p>
      ))}

      <h2
        ref={title}
        id="finale-title"
        data-final-title
        className="display mt-12 text-[clamp(3rem,13vw,6rem)]"
      >
        <Words text={f.title} />
      </h2>
      <p data-sign className="display mt-6 text-2xl italic text-champagne">
        {f.signature}
      </p>

      <div data-actions className="mt-14 flex flex-col items-center gap-4 sm:flex-row">
        <button type="button" className="btn" onClick={onReplay}>
          <span aria-hidden="true">↺</span> {ui.replay}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onMoments}>
          {ui.revisit}
        </button>
      </div>
    </section>
  );
}
