import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useContent } from '../components/ContentContext';
import { useReveal } from '../hooks/useReveal';
import { DUR, EASE, STAGGER, gsap, prefersReducedMotion } from '../lib/motion';
import { sound } from '../lib/sound';

type State = 'sealed' | 'opening' | 'open';

/** Scene 6 — A Letter for My Moon. An envelope that opens into the letter. */
export function Letter() {
  const l = useContent().letter;
  const scope = useRef<HTMLElement>(null);
  const envelope = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLElement>(null);
  const [state, setState] = useState<State>('sealed');
  useReveal(scope);

  function openLetter() {
    if (state !== 'sealed') return;
    sound.paper();
    if (prefersReducedMotion() || !envelope.current) return setState('open');
    setState('opening');
    const env = envelope.current;
    gsap
      .timeline({ onComplete: () => setState('open') })
      .to(env.querySelector('[data-seal]'), {
        scale: 0,
        autoAlpha: 0,
        duration: 0.3,
        ease: 'back.in(2)',
      })
      // the flap turns back, catching less light as it goes
      .to(env.querySelector('[data-flap]'), {
        rotateX: 180,
        filter: 'brightness(0.78)',
        duration: DUR.base,
        ease: EASE.inOut,
      })
      // the letter slides up and out of the envelope
      .to(
        env.querySelector('[data-peek]'),
        { yPercent: -88, scale: 1.04, duration: DUR.slow, ease: EASE.settle },
        '-=0.2',
      )
      .to(env, { autoAlpha: 0, y: 36, duration: DUR.base, ease: EASE.inOut }, '-=0.35');
  }

  // While she reads, the music steps back a little.
  useEffect(() => {
    const el = paper.current;
    if (state !== 'open' || !el) return;
    const io = new IntersectionObserver(([e]) => sound.duck(!!e?.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      sound.duck(false);
    };
  }, [state]);

  // Paper entrance once it exists in the DOM.
  useLayoutEffect(() => {
    if (state !== 'open' || !paper.current) return;
    paper.current.focus({ preventScroll: true });
    paper.current.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        paper.current,
        { autoAlpha: 0, y: 50, rotate: -1.2 },
        { autoAlpha: 1, y: 0, rotate: 0, duration: DUR.slow, ease: EASE.settle },
      );
      gsap.from('[data-para]', {
        autoAlpha: 0,
        y: 14,
        duration: DUR.base,
        ease: EASE.out,
        stagger: STAGGER.lines,
        delay: 0.4,
      });
    }, paper);
    return () => ctx.revert();
  }, [state]);

  return (
    <section
      id="letter"
      ref={scope}
      aria-labelledby="letter-title"
      className="chapter mx-auto max-w-3xl"
    >
      <p className="kicker text-center" data-reveal>
        {l.kicker}
      </p>
      <h2
        id="letter-title"
        data-reveal
        className="display mt-4 text-center text-[clamp(2.6rem,11vw,5rem)]"
      >
        {l.title}
      </h2>

      {state !== 'open' ? (
        <div ref={envelope} className="mx-auto mt-12 w-full max-w-sm" data-reveal>
          <div className="relative aspect-[3/2] [perspective:900px]" aria-hidden="true">
            <div
              data-peek
              className="absolute inset-x-5 bottom-3 top-3 rounded-sm bg-paper shadow-md"
            >
              <div className="mx-6 mt-6 space-y-2 opacity-40">
                <div className="h-1 w-2/3 rounded bg-ink/30" />
                <div className="h-1 w-1/2 rounded bg-ink/30" />
              </div>
            </div>
            <div
              className="absolute inset-0 rounded-sm shadow-[0_30px_50px_-25px_rgb(0_0_0/0.8)]"
              style={{
                background: 'linear-gradient(160deg, #e9dfcb, #d9cbb0)',
                clipPath: 'polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%)',
              }}
            />
            <div
              data-flap
              className="absolute inset-x-0 top-0 h-[56%] origin-top"
              style={{
                background: 'linear-gradient(180deg, #e2d5bc, #cfbf9f)',
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              }}
            />
            <span
              data-seal
              className="absolute left-1/2 top-[50%] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#8e3b4a] text-paper shadow-[inset_0_-3px_6px_rgb(0_0_0/0.3)]"
            >
              ☾
            </span>
          </div>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              className="btn"
              onClick={openLetter}
              disabled={state === 'opening'}
              aria-controls="letter-paper"
              aria-expanded={false}
            >
              {l.button}
            </button>
          </div>
        </div>
      ) : (
        <article
          ref={paper}
          id="letter-paper"
          tabIndex={-1}
          aria-label="The letter"
          className="relative mx-auto mt-12 max-w-xl scroll-mt-6 rounded-sm px-7 py-12 text-ink shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)] focus:outline-none sm:px-14 sm:py-16"
          style={{ background: 'radial-gradient(120% 80% at 20% 0%, #fbf6ec, #f2e8d6 70%)' }}
        >
          <p data-para className="display text-3xl italic">
            {l.salutation}
          </p>
          <div className="mt-6 space-y-5 font-serif text-[1.22rem] leading-[1.75] sm:text-[1.3rem]">
            {l.paragraphs.map((p, i) => (
              <p data-para key={i} className="text-pretty">
                {p}
              </p>
            ))}
          </div>
          {l.highlight && (
            <p
              data-para
              className="mt-8 border-l-2 border-[#8e3b4a]/50 pl-5 font-serif text-[1.3rem] leading-[1.75] text-[#5b2232] sm:text-[1.4rem]"
            >
              {l.highlight}
            </p>
          )}
          <p data-para className="mt-10 font-serif text-xl italic">
            {l.closing}
          </p>
          <p data-para className="display mt-1 text-4xl italic text-[#8e3b4a]">
            {l.signature}
          </p>
        </article>
      )}
    </section>
  );
}
