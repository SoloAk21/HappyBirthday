import { useRef, useState } from 'react';
import { useContent } from '../components/ContentContext';
import { Lightbox } from '../components/Lightbox';
import { MediaView, useAsset } from '../components/Media';
import type { GalleryItem } from '../content/types';
import { useReveal } from '../hooks/useReveal';
import { sound } from '../lib/sound';
import { useUi } from '../content/ui';
import { Story } from './Story';

/** Scene 4 — Our Little Moments: a swipeable exhibition + fullscreen viewer. */
export function Gallery() {
  const c = useContent();
  const ui = useUi();
  const scope = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  useReveal(scope);

  return (
    <section id="moments" ref={scope} aria-labelledby="moments-title" className="chapter !px-0">
      {c.story && <Story />}
      <div className={`mx-auto max-w-5xl px-[var(--gutter)]${c.story ? ' mt-8' : ''}`}>
        {!c.story?.kicker && (
          <p className="kicker" data-reveal>
            {c.gallery.kicker}
          </p>
        )}
        <h2 id="moments-title" data-reveal className="display mt-4 text-[clamp(2.6rem,11vw,5rem)]">
          {c.gallery.title}
        </h2>
        {c.gallery.intro && (
          <p data-reveal className="prose-serif mt-4 max-w-md italic text-ivory/75">
            {c.gallery.intro}
          </p>
        )}
        <p data-reveal className="mt-3 text-xs uppercase tracking-[0.25em] text-ivory/65">
          {ui.swipeHint}
        </p>
      </div>

      {rails(c.gallery.items).map((rail, r) => (
        <div key={r} className={r === 0 ? 'mt-10' : 'mt-12'}>
          {rail.title && (
            <h3
              data-reveal
              className="display mx-auto mb-4 max-w-5xl px-[var(--gutter)] text-3xl text-champagne"
            >
              {rail.title}
            </h3>
          )}
          <ul
            className="flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-4 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={rail.title ?? 'Memories'}
            tabIndex={0}
          >
            {rail.items.map(({ item, index }, k) => (
              <li key={item.id} className="shrink-0 snap-center first:snap-start" data-reveal>
                <Card
                  item={item}
                  featured={k === 0}
                  watch={ui.watch}
                  onOpen={() => (sound.chime(), setOpen(index))}
                />
              </li>
            ))}
            <li aria-hidden="true" className="w-1 shrink-0" />
          </ul>
        </div>
      ))}

      <Lightbox items={c.gallery.items} index={open} onIndex={setOpen} />
    </section>
  );
}

/** Groups consecutive items that share a rail title, keeping their global index. */
export function rails(items: GalleryItem[]) {
  const out: { title?: string; items: { item: GalleryItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = out[out.length - 1];
    if (last && last.title === item.rail) last.items.push({ item, index });
    else out.push({ title: item.rail, items: [{ item, index }] });
  });
  return out;
}

function Card({
  item,
  featured,
  watch,
  onOpen,
}: {
  item: GalleryItem;
  featured: boolean;
  watch: string;
  onOpen: () => void;
}) {
  const asset = useAsset(item);
  const isVideo = asset?.kind === 'video';
  return (
    <figure className={featured ? 'w-[min(78vw,340px)]' : 'w-[min(64vw,280px)]'}>
      <button
        type="button"
        onClick={onOpen}
        className="frame group block aspect-[9/16] w-full cursor-zoom-in"
        aria-label={`${isVideo ? watch : 'Open'}: ${item.caption ?? item.alt}`}
      >
        <MediaView
          media={item}
          sizes="(min-width: 640px) 340px, 78vw"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        {isVideo && featured && (
          <span
            aria-hidden="true"
            className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-night/60 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.2em] backdrop-blur"
          >
            ▶ {watch}
          </span>
        )}
      </button>
      {item.caption && (
        <figcaption className="display mt-3 text-xl italic text-ivory/80">
          {item.caption}
        </figcaption>
      )}
    </figure>
  );
}
