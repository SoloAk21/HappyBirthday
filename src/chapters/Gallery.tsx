import { useRef, useState } from 'react';
import { useContent } from '../components/ContentContext';
import { Lightbox } from '../components/Lightbox';
import { MediaView, useAsset } from '../components/Media';
import type { GalleryItem } from '../content/types';
import { useReveal } from '../hooks/useReveal';
import { sound } from '../lib/sound';

/** Scene 4 — Our Little Moments: a swipeable exhibition + fullscreen viewer. */
export function Gallery() {
  const c = useContent();
  const scope = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  useReveal(scope);

  return (
    <section id="moments" ref={scope} aria-labelledby="moments-title" className="chapter !px-0">
      <div className="mx-auto max-w-5xl px-[var(--gutter)]">
        <p className="kicker" data-reveal>
          {c.gallery.kicker}
        </p>
        <h2 id="moments-title" data-reveal className="display mt-4 text-[clamp(2.6rem,11vw,5rem)]">
          {c.gallery.title}
        </h2>
        {c.gallery.intro && (
          <p data-reveal className="prose-serif mt-4 max-w-md italic text-ivory/75">
            {c.gallery.intro}
          </p>
        )}
        <p data-reveal className="mt-3 text-xs uppercase tracking-[0.25em] text-ivory/65">
          Swipe · tap to open
        </p>
      </div>

      <ul
        className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Memories"
        tabIndex={0}
      >
        {c.gallery.items.map((item, i) => (
          <li key={item.id} className="shrink-0 snap-center first:snap-start" data-reveal>
            <Card item={item} featured={i === 0} onOpen={() => (sound.chime(), setOpen(i))} />
          </li>
        ))}
        <li aria-hidden="true" className="w-1 shrink-0" />
      </ul>

      <Lightbox items={c.gallery.items} index={open} onIndex={setOpen} />
    </section>
  );
}

function Card({
  item,
  featured,
  onOpen,
}: {
  item: GalleryItem;
  featured: boolean;
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
        aria-label={`${isVideo ? 'Watch' : 'Open'}: ${item.caption ?? item.alt}`}
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
            ▶ Watch
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
