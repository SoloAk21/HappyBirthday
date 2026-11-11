import type { ElementType, ReactNode } from 'react';

/**
 * Splits text into word spans for staggered reveals while keeping the
 * sentence readable as one phrase for assistive technology.
 */
export function Words({
  text,
  as: Tag = 'span',
  className,
}: {
  text: string;
  as?: ElementType;
  className?: string;
}) {
  const words = text.split(/(\s+)/);
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) =>
        /\s+/.test(w) ? (
          <span key={i} aria-hidden="true">
            {' '}
          </span>
        ) : (
          <span
            key={i}
            aria-hidden="true"
            className="inline-block overflow-hidden pb-[0.12em] align-bottom"
          >
            <span data-word className="inline-block will-change-transform">
              {w}
            </span>
          </span>
        ),
      )}
    </Tag>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="kicker" data-reveal>
      {children}
    </p>
  );
}
