import { useEffect, useState } from 'react';

/* − [editable number] +   The text is local state so typing is never overwritten mid-keystroke;
 * it re-syncs whenever the quantity changes from elsewhere (menu card vs. cart line). */
export function QtyControl({ qty, onChange, small }: { qty: number; onChange: (q: number) => void; small?: boolean }) {
  const [text, setText] = useState(String(qty));
  useEffect(() => {
    setText(String(qty));
  }, [qty]);

  const clamp = (v: string) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(99, n)) : 0;
  };

  return (
    <span className={'qty' + (small ? ' sm' : '')}>
      <button type="button" aria-label="Less" onClick={() => onChange(qty - 1)}>−</button>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={0}
        max={99}
        step={1}
        value={text}
        aria-label="Quantity"
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value !== '') onChange(clamp(e.target.value));
        }}
        onBlur={() => setText(String(qty))}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <button type="button" aria-label="More" onClick={() => onChange(qty + 1)}>+</button>
    </span>
  );
}
