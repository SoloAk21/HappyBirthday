import { useCallback, useEffect, useState } from 'react';
import { BirthdayReveal } from './chapters/BirthdayReveal';
import { Finale } from './chapters/Finale';
import { Gallery } from './chapters/Gallery';
import { Gift } from './chapters/Gift';
import { Invitation } from './chapters/Invitation';
import { Letter } from './chapters/Letter';
import { Notes } from './chapters/Notes';
import { Smile } from './chapters/Smile';
import { Unlock } from './chapters/Unlock';
import { Wish } from './chapters/Wish';
import { CHAPTERS, ChapterNav } from './components/ChapterNav';
import { ContentContext } from './components/ContentContext';
import { MuteToggle } from './components/MuteToggle';
import { Starfield } from './components/Starfield';
import type { SiteContent } from './content/types';
import { resolveUi } from './content/ui';
import { PUBLIC_TEXT as T } from './i18n/public';
import { loadContent } from './lib/api';
import { ScrollTrigger } from './lib/motion';
import { sound } from './lib/sound';

type Status = 'checking' | 'locked' | 'loading' | 'ready' | 'error';

const deepLink = () => {
  const id = window.location.hash.slice(1);
  return CHAPTERS.some((c) => c.id === id) && id !== 'invitation' ? id : null;
};

export default function App() {
  const [status, setStatus] = useState<Status>('checking');
  const [content, setContent] = useState<SiteContent | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const c = await loadContent();
      if (!c) return setStatus('locked');
      setContent(c);
      if (c.music) sound.setTrack(c.music.file);
      const ui = resolveUi(c.ui);
      document.title = ui.documentTitle;
      document.documentElement.lang = ui.lang;
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // One request decides it: 200 → the experience, 401 → the unlock screen.
    void load();
  }, [load]);

  return (
    <>
      <Starfield />
      {status === 'checking' || status === 'loading' ? (
        <div
          className="grid min-h-[100dvh] place-items-center"
          role="status"
          aria-label={T.loading}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-ivory/70" />
        </div>
      ) : status === 'locked' ? (
        <Unlock onUnlocked={load} />
      ) : status === 'error' || !content ? (
        <div className="grid min-h-[100dvh] place-items-center px-6 text-center" lang={T.lang}>
          <div>
            <p className="display text-3xl">{T.error}</p>
            <button type="button" className="btn mt-8" onClick={load}>
              {T.retry}
            </button>
          </div>
        </div>
      ) : (
        <ContentContext.Provider value={content}>
          <Experience />
        </ContentContext.Provider>
      )}
    </>
  );
}

function Experience() {
  const [opened, setOpened] = useState(() => deepLink() !== null);
  const [run, setRun] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<string | null>(() => deepLink());

  useEffect(() => {
    const onHash = () => {
      const id = deepLink();
      if (!id) return;
      setOpened(true);
      setPendingScroll(id);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!pendingScroll) return;
    // let chapters mount and measure before scrolling
    const id = window.setTimeout(() => {
      ScrollTrigger.refresh();
      document
        .getElementById(pendingScroll)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScroll(null);
    }, 120);
    return () => window.clearTimeout(id);
  }, [pendingScroll]);

  const open = () => {
    sound.start();
    sound.chime();
    setOpened(true);
    setPendingScroll('birthday');
  };

  const replay = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    history.replaceState(null, '', window.location.pathname);
    setOpened(false);
    setRun((r) => r + 1);
  };

  return (
    <>
      <MuteToggle />
      {opened && (
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="fixed z-50 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night/60 backdrop-blur-sm"
          style={{
            top: 'calc(var(--safe-top) + 0.9rem)',
            left: 'max(1rem, env(safe-area-inset-left))',
          }}
          aria-label="Chapters"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M5 7h14M5 12h10M5 17h6" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <main key={run}>
        <Invitation opened={opened} onOpen={open} />
        {opened && (
          <>
            <BirthdayReveal />
            <Smile />
            <Gallery />
            <Notes />
            <Letter />
            <Gift />
            <Wish />
            <Finale onReplay={replay} onMoments={() => setNavOpen(true)} />
          </>
        )}
      </main>
      <ChapterNav open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  );
}
