import { useRef } from 'react';
import { useContent } from '../components/ContentContext';
import { Clip, Picture } from '../components/Media';
import { useGsap } from '../hooks/useGsap';
import { DUR, EASE, gsap } from '../lib/motion';

/**
 * Scene 3 — The Smile That Changes Everything.
 * The original words open the scene; her smile fills the frame; the English
 * lines arrive one by one, the last one held in champagne.
 */
export function Smile() {
  const c = useContent();
  const scope = useRef<HTMLElement>(null);
  const lines = c.smile.lines;

  useGsap(scope, () => {
    gsap.from('[data-original]', {
      autoAlpha: 0,
      y: 18,
      duration: DUR.slow,
      ease: EASE.out,
      scrollTrigger: { trigger: '[data-original]', start: 'top 85%', once: true },
    });
    // photo: slow cinematic push + light warming as it passes
    gsap.fromTo(
      '[data-photo] img',
      { scale: 1.22, filter: 'saturate(0.75) brightness(0.8)' },
      {
        scale: 1,
        filter: 'saturate(1) brightness(1)',
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-photo]',
          start: 'top bottom',
          end: 'center center',
          scrub: 0.6,
        },
      },
    );
    gsap.fromTo(
      '[data-photo]',
      { clipPath: 'inset(8% 10% 8% 10% round 999px 999px 4px 4px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 999px 999px 4px 4px)',
        ease: 'none',
        scrollTrigger: { trigger: '[data-photo]', start: 'top 90%', end: 'top 30%', scrub: 0.6 },
      },
    );
    gsap.from('[data-inset]', {
      autoAlpha: 0,
      y: 60,
      rotate: 4,
      duration: DUR.cinematic,
      ease: EASE.settle,
      scrollTrigger: { trigger: '[data-inset]', start: 'top 92%', once: true },
    });
    gsap.utils.toArray<HTMLElement>('[data-smile-line]').forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 30,
        filter: 'blur(6px)',
        duration: DUR.slow,
        ease: EASE.out,
        scrollTrigger: { trigger: el, start: 'top 82%', once: true },
      });
    });
    // warm glow behind the final line
    gsap.from('[data-glow]', {
      autoAlpha: 0,
      scale: 0.6,
      duration: DUR.cinematic,
      ease: EASE.soft,
      scrollTrigger: { trigger: '[data-final]', start: 'top 80%', once: true },
    });
  });

  return (
    <section
      id="smile"
      ref={scope}
      aria-labelledby="smile-title"
      className="chapter mx-auto max-w-5xl overflow-hidden"
    >
      <p className="kicker text-center">{c.smile.kicker ?? 'Chapter III'}</p>
      {c.smile.title ? (
        <h2
          id="smile-title"
          data-original
          className="display mt-5 text-center text-[clamp(2.6rem,11vw,4.5rem)]"
        >
          {c.smile.title}
        </h2>
      ) : (
        <h2 id="smile-title" className="sr-only">
          The smile that changes everything
        </h2>
      )}
      {c.smile.original && (
        <blockquote
          data-original
          lang="am"
          className="ethiopic mx-auto mt-8 max-w-md text-center text-lg text-lavender sm:text-xl"
        >
          {c.smile.original}
        </blockquote>
      )}

      <div className="relative mx-auto mt-14 max-w-md">
        <div
          data-photo
          className="frame aspect-[3/4] w-full"
          style={{ borderRadius: '999px 999px 4px 4px' }}
        >
          <Picture media={c.smile.photo} sizes="(min-width: 640px) 28rem, 88vw" />
        </div>
        {c.smile.motion && (
          <div
            data-inset
            className="frame absolute -bottom-10 -right-2 aspect-[9/16] w-[34%] rotate-[3deg] border-4 border-paper sm:-right-16"
          >
            <Clip media={c.smile.motion} />
          </div>
        )}
      </div>

      <div className="relative mx-auto mt-24 max-w-xl space-y-8 text-center">
        {lines.map((line, i) => {
          const final = i === lines.length - 1;
          return (
            <p
              key={i}
              data-smile-line
              data-final={final || undefined}
              className={
                final
                  ? 'display relative text-[clamp(2.6rem,11vw,4.5rem)] italic text-champagne'
                  : 'prose-serif text-ivory/90'
              }
            >
              {final && (
                <span
                  data-glow
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgb(216 191 148 / 0.16), transparent 70%)',
                  }}
                />
              )}
              {line}
            </p>
          );
        })}
      </div>
    </section>
  );
}
