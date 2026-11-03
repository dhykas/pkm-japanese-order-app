import { useState } from 'react';
import type { MenuItem } from '../../shared/types';
import { resolveOptions } from '../../shared/options';
import { money } from '../format';
import { Modal } from './Modal';
import { QtyControl } from './QtyControl';

/* Opened by "+ Tambah" on an item with Loyverse modifiers (Kuah, Hot / Ice): one choice per modifier, then quantity. */
export function OptionPicker({ item, onAdd, onClose }: { item: MenuItem; onAdd: (optionIds: string[], qty: number) => void; onClose: () => void }) {
  const mods = item.modifiers ?? [];
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const ids = mods.flatMap((m) => picked[m.id] ?? []);
  const chosen = resolveOptions(item, ids);
  const unit = item.price + (chosen ?? []).reduce((t, o) => t + o.price, 0);
  const missing = mods.filter((m) => !picked[m.id]).map((m) => m.name);

  return (
    <Modal
      title={item.name}
      sub={item.description}
      onClose={onClose}
      actions={[
        { label: 'Batal', cls: 'ghost', onClick: onClose },
        {
          label: chosen ? `Tambah · ${money(unit * qty)}` : `Pilih ${missing.join(' dan ')}`,
          cls: 'primary',
          disabled: !chosen,
          onClick: () => chosen && onAdd(ids, qty),
        },
      ]}
    >
      {mods.map((m) => (
        <fieldset key={m.id} className="opt-group">
          <legend>{m.name}</legend>
          <div className="opt-choices">
            {m.options.map((o) => {
              const on = picked[m.id] === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={'chip' + (on ? ' active' : '')}
                  aria-pressed={on}
                  onClick={() => setPicked((p) => ({ ...p, [m.id]: o.id }))}
                >
                  {o.name}
                  {o.price ? <small>+{money(o.price)}</small> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="row opt-qty">
        <span>Jumlah</span>
        <QtyControl qty={qty} onChange={(n) => setQty(Math.max(1, n))} />
      </div>
    </Modal>
  );
}
