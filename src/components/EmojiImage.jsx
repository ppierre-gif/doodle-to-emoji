import { useEffect, useMemo, useRef, useState } from 'react';
import { emojiAssetCandidates } from '../lib/twemoji.js';

// Renders a real Twemoji graphic for an emoji character, cascading through the
// candidate URLs on error. If every asset 404s (rare), it falls back to drawing
// the emoji glyph itself so the user always sees *something*.
export default function EmojiImage({ emoji, className = '', onResolved }) {
  const candidates = useMemo(() => emojiAssetCandidates(emoji), [emoji]);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  // Reset when the emoji changes.
  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [emoji]);

  if (failed || candidates.length === 0) {
    return (
      <span className={className} role="img" aria-label={emoji} style={{ lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }

  return (
    <img
      key={emoji}
      src={candidates[index]}
      alt={emoji}
      draggable={false}
      className={className}
      onLoad={() => onResolvedRef.current?.(candidates[index])}
      onError={() => {
        if (index < candidates.length - 1) {
          setIndex((i) => i + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
