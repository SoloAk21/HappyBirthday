import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Motion tokens — one consistent language for the whole experience. */
export const DUR = { quick: 0.35, base: 0.8, slow: 1.4, cinematic: 2.2 } as const;
export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  soft: 'sine.inOut',
  settle: 'expo.out',
} as const;
export const STAGGER = { words: 0.06, lines: 0.16, items: 0.1 } as const;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export { gsap, ScrollTrigger };
