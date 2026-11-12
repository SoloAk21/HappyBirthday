import { useRef } from 'react';
import { useContent } from '../components/ContentContext';
import { MediaView } from '../components/Media';
import { useGsap } from '../hooks/useGsap';
import { DUR, EASE, gsap } from '../lib/motion';

/** Scene 8 — My Birthday Wish. Quiet, intimate, a single butterfly. */
export function Wish() {
  const c = useContent();
  const scope = useRef<HTMLElement>(null);

  useGsap(scope, () => {
    gsap.from('[data-bg]', {
      autoAlpha: 0,
      duration: DUR.cinematic,
      ease: EASE.soft,
      scrollTrigger: { trigger: scope.current, start: 'top 70%', once: true },
    });
    gsap.from('[data-wish]', {
      autoAlpha: 0,
      y: 24,
      duration: DUR.slow,
      ease: EASE.out,
      stagger: 0.5,
      scrollTrigger: { trigger: '[data-wish]', start: 'top 80%', once: true },
    });
    gsap.to('[data-butterfly]', {
      y: -14,
      x: 8,
      rotate: 6,
      duration: 3.2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    gsap.to('[data-wing]', {
      scaleX: 0.55,
      duration: 0.45,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      transformOrigin: '50% 50%',
    });
  });

  return (
    <section
      id="wish"
      ref={scope}
      aria-labelledby="wish-title"
      className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-[var(--gutter)] py-24 text-center"
    >
      <div data-bg className="absolute inset-0 -z-10" aria-hidden="true">
        <MediaView
          media={c.wish.media}
          className="h-full w-full object-cover opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_50%,rgb(11_15_31/0.35),#0b0f1f_85%)]" />
      </div>

      <svg
        data-butterfly
        viewBox="0 0 60 40"
        className="mb-8 w-14 text-lavender"
        aria-hidden="true"
      >
        <g data-wing fill="currentColor" opacity="0.85">
          <path d="M30 20C24 6 8 2 6 10s8 12 24 10z" />
          <path d="M30 20C36 6 52 2 54 10s-8 12-24 10z" />
          <path d="M30 21c-6 2-16 6-14 12s10 0 14-11z" opacity="0.7" />
          <path d="M30 21c6 2 16 6 14 12s-10 0-14-11z" opacity="0.7" />
        </g>
        <rect x="29.2" y="12" width="1.6" height="18" rx="0.8" fill="#f6f0e4" />
      </svg>

      <p className="kicker" data-wish>
        {c.wish.kicker ?? 'Chapter VIII'}
      </p>
      <h2
        id="wish-title"
        data-wish
        lang="am"
        className="ethiopic mt-6 max-w-lg text-[clamp(1.7rem,7.5vw,2.8rem)] text-ivory"
      >
        {c.wish.original}
      </h2>
      {c.wish.english && (
        <>
          <div data-wish className="hairline my-8" />
          <p data-wish className="prose-serif max-w-md italic text-ivory/85">
            {c.wish.english}
          </p>
        </>
      )}
    </section>
  );
}
