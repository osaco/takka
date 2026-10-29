import { resolveAsset } from '@content/registry';
import { Glyph, GlyphGroup, type GlyphName } from '@runtime/design';
import type { ContentItem } from './types';

/**
 * عرض عنصر محتوى: صورة أصلية، أو مجموعة رموز معدودة، أو رقم.
 * أي نص عربي هنا يبقى في DOM — لا يُرسم على Canvas أبداً.
 */
export function ItemVisual({
  item,
  size = 56,
  showLabel = false,
}: {
  item: ContentItem;
  size?: number;
  showLabel?: boolean;
}) {
  const url = item.image ? resolveAsset(item.image) : null;

  return (
    <span className="takka-item">
      {url ? (
        <img
          src={url}
          alt={item.alt ?? item.label}
          width={size}
          height={size}
          style={{ display: 'block' }}
        />
      ) : null}

      {!url && item.count !== undefined && item.glyph ? (
        <GlyphGroup glyph={item.glyph as GlyphName} count={item.count} size={Math.round(size * 0.6)} />
      ) : null}

      {!url && item.count === undefined && item.glyph ? (
        <Glyph glyph={item.glyph as GlyphName} size={size} />
      ) : null}

      {!url && item.count === undefined && !item.glyph && item.char ? (
        <span className="takka-numeral" aria-hidden="true">
          {item.char}
        </span>
      ) : null}

      {showLabel ? <span className="takka-item-label">{item.label}</span> : null}
    </span>
  );
}
