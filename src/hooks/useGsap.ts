import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { gsap, prefersReducedMotion } from '../lib/motion';

/**
 * Runs GSAP code scoped to a container and reverts everything on unmount.
 * When the visitor prefers reduced motion the callback is skipped, so the
 * content simply stays in its natural, fully visible state.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (self: { reduced: boolean }) => void,
  deps: DependencyList = [],
  { runWhenReduced = false } = {},
) {
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    if (reduced && !runWhenReduced) return;
    const ctx = gsap.context(() => setup({ reduced }), el);
    return () => ctx.revert();
  }, deps);
}
