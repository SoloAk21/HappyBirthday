import { useMemo, useRef, useState } from 'react';
import { useContent } from '../components/ContentContext';
import { MediaView } from '../components/Media';
import { useGsap } from '../hooks/useGsap';
import { EASE, ScrollTrigger, gsap } from '../lib/motion';
import { sound } from '../lib/sound';

/**
 * The story sequence (opens Chapter IV). A pinned, full-screen frame crossfades
 * between a few approved photos/videos while the lines of the story rise one by
 * one as she scrolls. Lines are revealed whole (never split into characters), so
 * Ethiopic syllables always render intact.
 */
export function Story() {
  const story = useContent().story;
  const scope = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const lines = useMemo(
    () => story?.beats.flatMap((b, beat) => b.lines.map((text) => ({ text, beat }))) ?? [],
    [story],
  );

  // Line reveals (skipped for reduced motion: lines simply stay visible).
  useGsap(scope, () => {
    gsap.utils.toArray<HTMLElement>('[data-story-line]').forEach((el) => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 28, filter: 'blur(8px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          ease: EASE.out,
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 58%', scrub: 0.6 },
        },
      );
    });
  });

  // Which frame is on screen follows the line being read (also with reduced motion).
  useGsap(
    scope,
    () => {
      gsap.utils.toArray<HTMLElement>('[data-story-line]').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 62%',
          end: 'bottom 38%',
          onToggle: (self) => {
            if (!self.isActive) return;
            const beat = Number(el.dataset.beat);
            setActive((prev) => {
              if (prev !== beat) sound.chime();
              return beat;
            });
          },
        });
      });
    },
    [lines],
    { runWhenReduced: true },
  );

  if (!story || !lines.length) return null;
  const last = lines.length - 1;

  return (
    <div ref={scope} className="relative" aria-labelledby={story.title ? 'story-title' : undefined}>
      {(story.kicker || story.title) && (
        <header className="mx-auto max-w-5xl px-[var(--gutter)] text-center">
          {story.kicker && <p className="kicker">{story.kicker}</p>}
          {story.title && (
            <h2 id="story-title" className="display mt-4 text-[clamp(2.4rem,10vw,4.5rem)]">
              {story.title}
            </h2>
          )}
        </header>
      )}

      <div className="relative mt-10">
        <div className="sticky top-0 h-[100dvh] overflow-hidden" aria-hidden="true">
          {story.beats.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-[1400ms] ease-out motion-reduce:transition-none"
              style={{ opacity: active === i ? 1 : 0 }}
            >
              {Math.abs(active - i) <= 1 && (
                <MediaView
                  media={b.media}
                  sizes="100vw"
                  className="h-full w-full scale-[1.04] object-cover"
                />
              )}
            </div>
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0f1f_0%,rgb(11_15_31/0.62)_22%,rgb(11_15_31/0.62)_78%,#0b0f1f_100%)]" />
        </div>

        <ol className="relative -mt-[100dvh] pb-[28dvh] pt-[38dvh]">
          {lines.map((l, i) => (
            <li
              key={i}
              data-story-line
              data-beat={l.beat}
              className="flex min-h-[52dvh] items-center justify-center px-[var(--gutter)] text-center"
            >
              <p
                className={
                  i === last
                    ? 'display max-w-xl text-[clamp(2rem,8.4vw,3.6rem)] text-champagne [text-shadow:0_2px_24px_rgb(0_0_0/0.6)]'
                    : 'display max-w-xl text-[clamp(1.8rem,7.6vw,3.2rem)] [text-shadow:0_2px_24px_rgb(0_0_0/0.6)]'
                }
              >
                {l.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
