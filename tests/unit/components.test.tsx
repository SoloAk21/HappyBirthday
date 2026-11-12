import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import example from '../../docs/content.example.json';
import App from '../../src/App';
import { Gift } from '../../src/chapters/Gift';
import { Letter } from '../../src/chapters/Letter';
import { Notes } from '../../src/chapters/Notes';
import { Unlock } from '../../src/chapters/Unlock';
import { ContentContext } from '../../src/components/ContentContext';
import { Countdown } from '../../src/components/Countdown';
import { Gallery, rails } from '../../src/chapters/Gallery';
import type { SiteContent } from '../../src/content/types';
import { Story } from '../../src/chapters/Story';
import { Words } from '../../src/components/Words';
import { ChapterNav } from '../../src/components/ChapterNav';
import { DEFAULT_UI } from '../../src/content/ui';
import { PUBLIC_TEXT } from '../../src/i18n/public';
import {
  readMutedPreference,
  readVolumePreference,
  writeMutedPreference,
} from '../../src/lib/sound';

const content = example as unknown as SiteContent;
const withContent = (ui: React.ReactNode) =>
  render(<ContentContext.Provider value={content}>{ui}</ContentContext.Provider>);

afterEach(() => vi.unstubAllGlobals());

describe('Countdown', () => {
  const cfg = content.birthday;
  it('shows remaining time before the birthday', () => {
    render(<Countdown cfg={cfg} now={() => Date.parse('2026-11-12T21:00:00Z')} />);
    expect(screen.getByTestId('countdown')).toHaveTextContent('01');
    expect(screen.getByText('days')).toBeInTheDocument();
  });
  it('uses the labels from the content', () => {
    render(
      <Countdown
        cfg={cfg}
        now={() => Date.parse('2026-11-12T21:00:00Z')}
        text={{ ...DEFAULT_UI, countdownTitle: 'Soon', countdownUnits: ['d', 'h', 'm', 's'] }}
      />,
    );
    expect(screen.getByText('Soon')).toBeInTheDocument();
    expect(screen.getByText('d')).toBeInTheDocument();
  });
  it('celebrates on the day', () => {
    render(<Countdown cfg={cfg} now={() => Date.parse('2026-11-14T08:00:00Z')} />);
    expect(screen.getByTestId('today')).toBeInTheDocument();
  });
  it('disappears afterwards', () => {
    const { container } = render(
      <Countdown cfg={cfg} now={() => Date.parse('2026-12-01T00:00:00Z')} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Notes', () => {
  it('opens sealed notes on tap and tracks progress', async () => {
    withContent(<Notes />);
    const buttons = screen.getAllByRole('button', { expanded: false });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]!);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('1 of 2 opened')).toBeInTheDocument();
    await userEvent.click(buttons[1]!);
    expect(screen.getByText(/All of them/)).toBeInTheDocument();
  });
});

describe('Letter', () => {
  it('opens the envelope into the letter', async () => {
    withContent(<Letter />);
    expect(screen.queryByText(content.letter.paragraphs[0]!)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: content.letter.button }));
    expect(await screen.findByText(content.letter.paragraphs[0]!)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'The letter' })).toHaveFocus();
  });
});

describe('Gift', () => {
  it('reveals the surprise with a plain button (no gesture needed)', async () => {
    withContent(<Gift />);
    await userEvent.click(screen.getByRole('button', { name: content.gift.button }));
    expect(await screen.findByText(content.gift.heading)).toBeInTheDocument();
    expect(screen.getByText(content.gift.text)).toBeInTheDocument();
  });
});

describe('Gallery', () => {
  it('opens the fullscreen viewer and navigates', async () => {
    withContent(<Gallery />);
    await userEvent.click(screen.getByRole('button', { name: 'Watch: Our little film' }));
    const dialog = screen.getByRole('dialog', { name: 'Memory viewer', hidden: true });
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveTextContent('1 / 2');
    await userEvent.click(screen.getByRole('button', { name: 'Next memory', hidden: true }));
    expect(dialog).toHaveTextContent('2 / 2');
    await userEvent.keyboard('{ArrowRight}');
    expect(dialog).toHaveTextContent('1 / 2');
    await userEvent.click(screen.getByRole('button', { name: 'Close viewer', hidden: true }));
    expect(dialog).not.toHaveAttribute('open');
  });
});

describe('Unlock', () => {
  it('shows a gentle message for wrong words', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    render(<Unlock onUnlocked={() => {}} />);
    await userEvent.type(screen.getByLabelText(PUBLIC_TEXT.label), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: PUBLIC_TEXT.open }));
    expect(await screen.findByText(PUBLIC_TEXT.wrong)).toBeInTheDocument();
  });

  it('calls onUnlocked for the right words', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"authenticated":true}', { status: 200 })),
    );
    const done = vi.fn();
    render(<Unlock onUnlocked={done} />);
    await userEvent.type(screen.getByLabelText(PUBLIC_TEXT.label), 'right words');
    await userEvent.click(screen.getByRole('button', { name: PUBLIC_TEXT.open }));
    await waitFor(() => expect(done).toHaveBeenCalled());
  });
});

describe('App', () => {
  it('shows the gate when locked and nothing personal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"unauthorized"}', { status: 401 })),
    );
    render(<App />);
    expect(await screen.findByLabelText(PUBLIC_TEXT.label)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(content.reveal.title);
  });

  it('loads the experience when a session exists, and opens all chapters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('/api/content')
          ? new Response(JSON.stringify(content))
          : new Response('{"authenticated":true}'),
      ),
    );
    render(<App />);
    const open = await screen.findByRole('button', { name: /Open the Surprise/ });
    await userEvent.click(open);
    for (const name of [
      /Happy Birthday, Star/,
      /Our Little Moments/,
      /Little Things I Adore/,
      /A Letter for You/,
      /One More Surprise/,
    ]) {
      expect(screen.getAllByRole('heading', { name }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('button', { name: /Replay from the beginning/ })).toBeInTheDocument();
  });
});

describe('mute preference', () => {
  it('is remembered for the visit', () => {
    const store = new Map<string, string>();
    const s = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    expect(readMutedPreference(s)).toBe(false);
    writeMutedPreference(true, s);
    expect(readMutedPreference(s)).toBe(true);
  });
});

describe('Amharic-ready text', () => {
  // Built from code points so this public test file holds no Ethiopic literals.
  const syllables = (...cps: number[]) => String.fromCodePoint(...cps);
  const word1 = syllables(0x1230, 0x120b, 0x121d); // three Ethiopic syllables
  const word2 = syllables(0x12e8, 0x1294, 0x1328, 0x1228, 0x1243, 0x1362);
  const phrase = `${word1} ${word2}`;

  it('splits only at spaces, never inside an Ethiopic syllable', () => {
    const { container } = render(<Words text={phrase} />);
    const words = [...container.querySelectorAll('[data-word]')].map((w) => w.textContent);
    expect(words).toEqual([word1, word2]);
    expect(container.querySelector('.sr-only')?.textContent).toBe(phrase);
  });

  it('renders the story lines in order with their frames', () => {
    const { container } = withContent(<Story />);
    const lines = [...container.querySelectorAll('[data-story-line]')].map((l) => l.textContent);
    expect(lines).toEqual(content.story!.beats.flatMap((b) => b.lines));
    expect(screen.getByRole('heading', { name: content.story!.title! })).toBeInTheDocument();
  });

  it('labels the chapter list from the content', () => {
    const ui = { ...content, ui: { chaptersTitle: 'Moments', chapters: ['One'] } };
    render(
      <ContentContext.Provider value={ui as SiteContent}>
        <ChapterNav open={false} onClose={() => {}} />
      </ContentContext.Provider>,
    );
    expect(screen.getByText('Moments', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('One')).toBeInTheDocument();
    // missing labels fall back to the defaults
    expect(screen.getByText(DEFAULT_UI.chapters[8]!)).toBeInTheDocument();
  });
});

describe('volume preference', () => {
  it('defaults to 0.8 and ignores invalid values', () => {
    expect(readVolumePreference({ getItem: () => null })).toBe(0.8);
    expect(readVolumePreference({ getItem: () => '0.3' })).toBe(0.3);
    expect(readVolumePreference({ getItem: () => '7' })).toBe(0.8);
  });
});

describe('gallery rails', () => {
  it('groups consecutive items by rail and keeps their position for the viewer', () => {
    const items = [
      { id: 'a', alt: 'a', rail: 'Us' },
      { id: 'b', alt: 'b', rail: 'Us' },
      { id: 'c', alt: 'c', rail: 'You' },
    ];
    const r = rails(items);
    expect(r.map((x) => x.title)).toEqual(['Us', 'You']);
    expect(r[1]!.items[0]!.index).toBe(2);
  });
  it('keeps a single untitled row when no rails are set', () => {
    expect(rails([{ id: 'a', alt: 'a' }])).toEqual([
      { title: undefined, items: [{ item: { id: 'a', alt: 'a' }, index: 0 }] },
    ]);
  });
});
