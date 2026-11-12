import { useRef } from 'react';
import { celebrate, centerOf } from '../components/celebrate';
import { useContent } from '../components/ContentContext';
import { Picture } from '../components/Media';
import { Words } from '../components/Words';
import { useGsap } from '../hooks/useGsap';
import { DUR, EASE, STAGGER, ScrollTrigger, gsap } from '../lib/motion';
import { sound } from '../lib/sound';

/** Scene 2 — A Birthday Worth Celebrating. */
export function BirthdayReveal() {
  const c = useContent();
  const scope = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useGsap(scope, () => {
    gsap.from('[data-date] [data-word]', {
      yPercent: 110,
      duration: DUR.cinematic,
      ease: EASE.settle,
      stagger: STAGGER.words,
      scrollTrigger: { trigger: '[data-date]', start: 'top 80%', once: true },
    });
    gsap.from('[data-line]', {
      autoAlpha: 0,
      y: 20,
      duration: DUR.slow,
      ease: EASE.out,
      scrollTrigger: { trigger: '[data-line]', start: 'top 85%', once: true },
    });
    gsap.fromTo(
      '[data-portrait]',
      { clipPath: 'inset(30% 20% 30% 20% round 200px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 2px)',
        duration: DUR.cinematic,
        ease: EASE.settle,
        scrollTrigger: { trigger: '[data-portrait]', start: 'top 78%', once: true },
      },
    );
    gsap.fromTo(
      '[data-portrait] img',
      { scale: 1.18 },
      {
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-portrait]',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
    gsap.from('[data-title] [data-word]', {
      yPercent: 110,
      duration: DUR.slow,
      ease: EASE.settle,
      stagger: STAGGER.words,
      scrollTrigger: { trigger: '[data-title]', start: 'top 82%', once: true },
    });
  });

  // The one celebration of this scene — fires once, also without motion-animations
  // (celebrate() itself is skipped for reduced motion; the sound still plays).
  useGsap(
    scope,
    () => {
      ScrollTrigger.create({
        trigger: title.current,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          sound.reveal();
          celebrate(centerOf(title.current));
        },
      });
    },
    [],
    { runWhenReduced: true },
  );

  return (
    <section
      id="birthday"
      ref={scope}
      aria-labelledby="birthday-title"
      className="chapter mx-auto max-w-5xl"
    >
      <p className="kicker text-center">{c.reveal.kicker ?? 'Chapter II'}</p>
      <h2
        data-date
        className="display date-display mt-6 whitespace-nowrap text-center text-[clamp(2.6rem,14.5vw,9rem)] text-champagne"
      >
        <Words text={c.reveal.date} />
      </h2>
      <p data-line className="prose-serif mx-auto mt-6 max-w-md text-center italic text-ivory/85">
        {c.reveal.line}
      </p>

      <div className="mt-16 grid items-end gap-10 md:grid-cols-[1.1fr_1fr]">
        <div data-portrait className="frame mx-auto aspect-[4/5] w-full max-w-md">
          <Picture media={c.reveal.portrait} sizes="(min-width: 768px) 28rem, 90vw" />
        </div>
        <h2
          ref={title}
          id="birthday-title"
          data-title
          className="display text-center text-[clamp(2.8rem,12vw,5.5rem)] md:text-left"
        >
          <Words text={c.reveal.title} />
        </h2>
      </div>
    </section>
  );
}
