import type { RefObject } from 'react';
import { DUR, EASE, STAGGER, gsap } from '../lib/motion';
import { useGsap } from './useGsap';

/**
 * Default chapter choreography: every [data-reveal] block rises softly and
 * every group of [data-word] spans (inside a [data-words] parent) reveals
 * word by word when it enters the viewport.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGsap(
    scope,
    () => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 28,
          duration: DUR.base,
          ease: EASE.out,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-words]').forEach((group) => {
        gsap.from(group.querySelectorAll('[data-word]'), {
          yPercent: 110,
          duration: DUR.slow,
          ease: EASE.settle,
          stagger: STAGGER.words,
          scrollTrigger: { trigger: group, start: 'top 85%', once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-mask]').forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: 'inset(18% 12% 18% 12%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: DUR.cinematic,
            ease: EASE.settle,
            scrollTrigger: { trigger: el, start: 'top 80%', once: true },
          },
        );
      });
    },
    deps,
  );
}
