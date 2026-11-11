import { prefersReducedMotion } from '../lib/motion';

/**
 * One restrained celebration: a soft burst of moon-dust (tiny stars in
 * champagne / ivory / lavender) from a point, fading in ~2.4s.
 * Uses a temporary fixed canvas and removes itself afterwards.
 */
export function celebrate(origin?: { x: number; y: number }, count = 70) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '60',
  });
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const ox = origin?.x ?? w / 2;
  const oy = origin?.y ?? h * 0.45;
  const colors = ['#d8bf94', '#f6f0e4', '#b9b3dc', '#e9d6ae'];
  const parts = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 1.5 + Math.random() * 4.5;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 1.6,
      r: 0.8 + Math.random() * 2.2,
      c: colors[Math.floor(Math.random() * colors.length)]!,
      spin: Math.random() * Math.PI,
      star: Math.random() < 0.35,
    };
  });

  const start = performance.now();
  const life = 2400;
  const drawStar = (x: number, y: number, r: number, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.35, r * 0.35, 0, r * 2.6);
    }
    ctx.fill();
    ctx.restore();
  };

  const tick = (t: number) => {
    const p = (t - start) / life;
    ctx.clearRect(0, 0, w, h);
    if (p >= 1) {
      canvas.remove();
      return;
    }
    for (const s of parts) {
      s.vx *= 0.985;
      s.vy = s.vy * 0.985 + 0.045;
      s.x += s.vx;
      s.y += s.vy;
      ctx.globalAlpha = Math.max(0, 1 - p) * (0.6 + 0.4 * Math.sin(t / 90 + s.spin));
      ctx.fillStyle = s.c;
      if (s.star) drawStar(s.x, s.y, s.r, s.spin + p * 2);
      else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function centerOf(el: Element | null): { x: number; y: number } | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
