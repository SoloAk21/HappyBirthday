import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/motion';

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  speed: number;
  phase: number;
  depth: number;
}

/** A quiet, fixed starfield. Twinkles slowly and leans with the pointer. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(220, (w * h) / 5200));
      stars = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.3 + depth * 1.1,
          base: 0.25 + depth * 0.6,
          speed: 0.4 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
          depth,
        };
      });
      if (reduced) draw(0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      px += (tx - px) * 0.04;
      py += (ty - py) * 0.04;
      for (const s of stars) {
        const tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * 0.001 * s.speed + s.phase);
        const ox = px * s.depth * 14;
        const oy = py * s.depth * 14;
        ctx.globalAlpha = s.base * tw;
        ctx.fillStyle = s.depth > 0.85 ? '#f3e6c9' : '#e8e6ff';
        ctx.beginPath();
        ctx.arc(s.x + ox, s.y + oy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      tx = e.clientX / w - 0.5;
      ty = e.clientY / h - 0.5;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    if (!reduced) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, #1a2147 0%, #0b0f1f 60%)' }}
    />
  );
}
