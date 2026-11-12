import { useRef, useState } from 'react';
import { celebrate, centerOf } from '../components/celebrate';
import { useContent } from '../components/ContentContext';
import { MediaView } from '../components/Media';
import { useReveal } from '../hooks/useReveal';
import { DUR, EASE, gsap, prefersReducedMotion } from '../lib/motion';
import { sound } from '../lib/sound';

/** Scene 7 — One More Surprise: a wrapped present that opens on tap. */
export function Gift() {
  const c = useContent();
  const g = c.gift;
  const scope = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'closed' | 'opening' | 'open'>('closed');
  useReveal(scope);

  function openGift() {
    if (state !== 'closed') return;
    sound.reveal();
    if (prefersReducedMotion()) return setState('open');
    setState('opening');
    // safety net: never leave her waiting if the animation is interrupted
    window.setTimeout(() => setState((s) => (s === 'opening' ? 'open' : s)), 4500);
    const el = box.current!;
    const tl = gsap.timeline({ onComplete: () => setState('open') });
    tl.to(el, { rotate: -4, duration: 0.09, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      // the ribbon comes loose first
      .to(el.querySelectorAll('[data-ribbon]'), {
        scaleY: 0,
        transformOrigin: '50% 0%',
        duration: 0.45,
        ease: EASE.inOut,
        stagger: 0.08,
      })
      .to(el.querySelector('[data-bow]'), {
        scale: 0,
        autoAlpha: 0,
        duration: 0.35,
        ease: 'back.in(2)',
      })
      .to(
        el.querySelector('[data-lid]'),
        { yPercent: -160, rotate: -14, autoAlpha: 0, duration: 0.7, ease: EASE.out },
        '-=0.05',
      )
      .add(() => celebrate(centerOf(el), 90), '-=0.5')
      .to(el, { scale: 0.85, autoAlpha: 0, duration: DUR.base, ease: EASE.inOut }, '-=0.2');
  }

  return (
    <section
      id="surprise"
      ref={scope}
      aria-labelledby="surprise-title"
      className="chapter mx-auto max-w-3xl text-center"
    >
      <p className="kicker" data-reveal>
        {g.kicker}
      </p>
      <h2 id="surprise-title" data-reveal className="display mt-4 text-[clamp(2.6rem,11vw,5rem)]">
        {g.title}
      </h2>

      {state !== 'open' ? (
        <div className="mt-12 flex flex-col items-center gap-10" data-reveal>
          <div ref={box} className="relative h-48 w-48" aria-hidden="true">
            {/* box */}
            <div className="absolute inset-x-3 bottom-0 top-12 rounded-sm bg-[linear-gradient(150deg,#2a3263,#1b2244)] shadow-[0_30px_50px_-20px_rgb(0_0_0/0.7)]">
              <div
                data-ribbon
                className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-champagne/90"
              />
            </div>
            {/* lid */}
            <div
              data-lid
              className="absolute inset-x-0 top-6 h-10 rounded-sm bg-[linear-gradient(150deg,#323b72,#222a52)] shadow-md"
            >
              <div
                data-ribbon
                className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-champagne"
              />
            </div>
            {/* bow */}
            <div data-bow className="absolute left-1/2 top-0 h-10 w-24 -translate-x-1/2">
              <span className="absolute left-0 top-1 h-8 w-11 rounded-[50%_10%_50%_50%] border-[5px] border-champagne" />
              <span className="absolute right-0 top-1 h-8 w-11 rounded-[10%_50%_50%_50%] border-[5px] border-champagne" />
              <span className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full bg-champagne" />
            </div>
          </div>
          <button type="button" className="btn" onClick={openGift} disabled={state === 'opening'}>
            {g.button}
          </button>
        </div>
      ) : (
        <GiftReveal />
      )}
    </section>
  );
}

function GiftReveal() {
  const g = useContent().gift;
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <div
      ref={ref}
      className="mt-12 flex flex-col items-center gap-8"
      role="region"
      aria-live="polite"
      aria-label="Your surprise"
    >
      {g.media && (
        <div data-mask className="frame aspect-[9/16] w-[min(62vw,280px)]">
          <MediaView media={g.media} sizes="280px" className="h-full w-full object-cover" />
        </div>
      )}
      <h3 data-reveal className="display text-[clamp(2.2rem,9vw,3.6rem)] italic text-champagne">
        {g.heading}
      </h3>
      <p data-reveal className="prose-serif max-w-md text-ivory/85">
        {g.text}
      </p>
    </div>
  );
}
