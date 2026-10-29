import React from 'react';

export type GlyphName = 'apple' | 'star' | 'circle' | 'square' | 'triangle' | 'dot';

const viewBox = '0 0 40 40';

const SHAPES: Record<GlyphName, React.ReactNode> = {
  apple: (
    <>
      <circle cx="20" cy="24" r="13" fill="var(--apricot)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M20 11 q3 -6 8 -7 q-2 7 -8 9 z" fill="var(--leaf)" stroke="var(--ink)" strokeWidth="2" />
      <path d="M20 12 v4" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  star: (
    <path
      d="M20 5 l4.6 9.8 l10.4 1.4 l-7.6 7.2 l1.9 10.4 l-9.3 -5 l-9.3 5 l1.9 -10.4 l-7.6 -7.2 l10.4 -1.4 z"
      fill="var(--gold)"
      stroke="var(--ink)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  ),
  circle: <circle cx="20" cy="20" r="14" fill="var(--sky)" stroke="var(--ink)" strokeWidth="2.5" />,
  square: (
    <rect x="7" y="7" width="26" height="26" rx="4" fill="var(--sand)" stroke="var(--ink)" strokeWidth="2.5" />
  ),
  triangle: (
    <path
      d="M20 6 L35 33 H5 Z"
      fill="var(--leaf)"
      stroke="var(--ink)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  ),
  dot: <circle cx="20" cy="20" r="9" fill="var(--journey)" stroke="var(--ink)" strokeWidth="2.5" />,
};

export function Glyph({ glyph, size = 40 }: { glyph: GlyphName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      {SHAPES[glyph]}
    </svg>
  );
}

/**
 * مجموعة معدودة — تُعرض كرموز لا كأرقام، ليبقى العدّ فعلاً بصرياً.
 * الصفوف خمسة كحد أقصى كي يُعدّ الطفل بلمسة العين واليد.
 */
export function GlyphGroup({
  glyph,
  count,
  size = 34,
  maxPerRow = 5,
}: {
  glyph: GlyphName;
  count: number;
  size?: number;
  maxPerRow?: number;
}) {
  const gap = 6;
  const width = maxPerRow * size + (maxPerRow - 1) * gap;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap,
        width,
        maxWidth: '100%',
        justifyContent: 'flex-start',
      }}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <Glyph key={i} glyph={glyph} size={size} />
      ))}
    </div>
  );
}
