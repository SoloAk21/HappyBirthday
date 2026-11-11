import { forwardRef } from 'react';

/** The moon — drawn, not photographed. Soft light, a few quiet maria. */
export const Moon = forwardRef<SVGSVGElement, { className?: string; size?: number | string }>(
  function Moon({ className, size = '100%' }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#f6f0e4" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#b9b3dc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moon-body" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="55%" stopColor="#efe5d2" />
            <stop offset="100%" stopColor="#c9bfae" />
          </radialGradient>
          <radialGradient id="moon-shade" cx="78%" cy="74%" r="70%">
            <stop offset="0%" stopColor="#3b3860" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#3b3860" stopOpacity="0" />
          </radialGradient>
          <filter id="moon-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        <circle cx="100" cy="100" r="99" fill="url(#moon-halo)" />
        <circle cx="100" cy="100" r="58" fill="url(#moon-body)" />
        <g fill="#a99f8f" opacity="0.28" filter="url(#moon-soft)">
          <ellipse cx="82" cy="84" rx="15" ry="11" />
          <ellipse cx="114" cy="78" rx="9" ry="7" />
          <ellipse cx="108" cy="112" rx="17" ry="12" />
          <ellipse cx="78" cy="118" rx="7" ry="6" />
          <circle cx="128" cy="98" r="4" />
          <circle cx="94" cy="134" r="3.5" />
        </g>
        <circle cx="100" cy="100" r="58" fill="url(#moon-shade)" />
      </svg>
    );
  },
);
