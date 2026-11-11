import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ImageVariant, MediaAsset, MediaRef } from '../content/types';
import { mediaUrl } from '../lib/api';
import { prefersReducedMotion } from '../lib/motion';
import { useContent } from './ContentContext';

export function srcSet(variants: ImageVariant[] | undefined): string | undefined {
  if (!variants?.length) return undefined;
  return variants.map((v) => `${mediaUrl(v.file)} ${v.width}w`).join(', ');
}

export function largest(variants: ImageVariant[] | undefined): ImageVariant | undefined {
  return variants?.reduce<ImageVariant | undefined>(
    (a, b) => (!a || b.width > a.width ? b : a),
    undefined,
  );
}

export function useAsset(ref: MediaRef | undefined): MediaAsset | undefined {
  const content = useContent();
  return ref ? content.media[ref.id] : undefined;
}

interface PictureProps {
  media: MediaRef;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}

/** Image (or a video's poster frame) with responsive sources and fixed aspect ratio. */
export function Picture({ media, sizes = '100vw', className, style, eager }: PictureProps) {
  const asset = useAsset(media);
  const variants = asset?.kind === 'video' ? asset.poster : asset?.variants;
  const big = largest(variants);
  if (!big) return null;
  return (
    <img
      src={mediaUrl(big.file)}
      srcSet={srcSet(variants)}
      sizes={sizes}
      width={big.width}
      height={big.height}
      alt={media.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={className}
      style={{ objectPosition: media.focus, ...style }}
    />
  );
}

interface ClipProps {
  media: MediaRef;
  className?: string;
  style?: CSSProperties;
  /** Plays muted & looping while on screen (never with reduced motion). */
  ambient?: boolean;
  controls?: boolean;
  autoPlay?: boolean;
}

/** Silent video clip. Loads nothing until it is near the viewport. */
export function Clip({
  media,
  className,
  style,
  ambient = true,
  controls = false,
  autoPlay = false,
}: ClipProps) {
  const asset = useAsset(media);
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(autoPlay);
  const poster = largest(asset?.poster);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ambient) return;
    const reduced = prefersReducedMotion();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setNear(true);
          if (!reduced) void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ambient]);

  if (!asset?.file) return null;
  return (
    <video
      ref={ref}
      className={className}
      style={{ objectPosition: media.focus, ...style }}
      src={near || controls ? mediaUrl(asset.file) : undefined}
      poster={poster ? mediaUrl(poster.file) : undefined}
      width={asset.width}
      height={asset.height}
      muted
      playsInline
      loop={ambient}
      controls={controls}
      autoPlay={autoPlay}
      preload={controls ? 'metadata' : 'none'}
      aria-label={media.alt}
      disablePictureInPicture
    />
  );
}

/** Picks <Clip> or <Picture> based on the asset kind. */
export function MediaView(props: {
  media: MediaRef;
  className?: string;
  sizes?: string;
  eager?: boolean;
  style?: CSSProperties;
}) {
  const asset = useAsset(props.media);
  if (asset?.kind === 'video')
    return <Clip media={props.media} className={props.className} style={props.style} />;
  return <Picture {...props} />;
}
