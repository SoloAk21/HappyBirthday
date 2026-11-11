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
import { Gallery } from '../../src/chapters/Gallery';
import type { SiteContent } from '../../src/content/types';
import { readMutedPreference, writeMutedPreference } from '../../src/lib/sound';

const content = example as unknown as SiteContent;
const withContent = (ui: React.ReactNode) =>
  render(<ContentContext.Provider value={content}>{ui}</ContentContext.Provider>);

afterEach(() => vi.unstubAllGlobals());

describe('Countdown', () => {
  const cfg = content.birthday;
  it('shows remaining time before the birthday', () => {
    render(<Countdown cfg={cfg} now={() => Date.parse('2026-11-12T21:00:00Z')} />);
    expect(screen.getByTestId('countdown')).toHaveTextContent('01');
    expect(screen.getByText('day')).toBeInTheDocument();
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
    await userEvent.type(screen.getByLabelText('Secret words'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText(/Not quite/)).toBeInTheDocument();
  });

  it('calls onUnlocked for the right words', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"authenticated":true}', { status: 200 })),
    );
    const done = vi.fn();
    render(<Unlock onUnlocked={done} />);
    await userEvent.type(screen.getByLabelText('Secret words'), 'right words');
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
  });
});

describe('App', () => {
  it('shows the gate when locked and nothing personal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"authenticated":false}')),
    );
    render(<App />);
    expect(await screen.findByLabelText('Secret words')).toBeInTheDocument();
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
