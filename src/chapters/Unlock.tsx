import { useRef, useState, type FormEvent } from 'react';
import { Moon } from '../components/Moon';
import { unlock } from '../lib/api';
import { DUR, EASE, gsap } from '../lib/motion';
import { useGsap } from '../hooks/useGsap';
import { PUBLIC_TEXT as T } from '../i18n/public';

/** Public gate. Shows nothing personal; the server decides who gets in. */
export function Unlock({ onUnlocked }: { onUnlocked: () => void }) {
  const scope = useRef<HTMLElement>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useGsap(scope, () => {
    gsap.from('[data-moon]', {
      autoAlpha: 0,
      scale: 0.92,
      duration: DUR.cinematic,
      ease: EASE.settle,
    });
    gsap.from('[data-reveal]', {
      autoAlpha: 0,
      y: 16,
      duration: DUR.slow,
      ease: EASE.out,
      stagger: 0.14,
      delay: 0.4,
    });
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setMessage('');
    const result = await unlock(value);
    setBusy(false);
    if (result.ok) return onUnlocked();
    if (result.reason === 'wrong') setMessage(T.wrong);
    else if (result.reason === 'rate_limited')
      setMessage(T.rateLimited.replace('{min}', String(Math.ceil((result.retryAfter ?? 60) / 60))));
    else setMessage(T.unavailable);
  }

  return (
    <main
      ref={scope}
      lang={T.lang}
      className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 2rem)' }}
    >
      <div data-moon className="mb-10 w-40 sm:w-48">
        <Moon />
      </div>
      <h1 data-reveal className="display text-4xl sm:text-5xl">
        {T.title[0]}
        <br />
        <span className="text-champagne">{T.title[1]}</span>
      </h1>
      <p data-reveal className="mt-5 text-sm text-ivory/70">
        {T.subtitle}
      </p>
      <form data-reveal onSubmit={submit} className="mt-9 flex w-full flex-col gap-4" noValidate>
        <label htmlFor="passphrase" className="sr-only">
          {T.label}
        </label>
        <input
          id="passphrase"
          name="passphrase"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder={T.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={message ? true : undefined}
          aria-describedby="unlock-status"
          className="h-14 w-full rounded-full border border-white/15 bg-night-2/70 px-6 text-center text-base tracking-wide text-ivory placeholder:text-ivory/40 focus:border-champagne/70 focus:outline-none"
        />
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? T.opening : T.open}
        </button>
        <p
          id="unlock-status"
          role="status"
          aria-live="polite"
          className="min-h-6 text-sm text-lavender"
        >
          {message}
        </p>
      </form>
    </main>
  );
}
