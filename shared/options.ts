/* Modifier choices, checked the same way in the browser (cart) and the Worker (receipt). */
import type { ChosenOption, MenuItem } from './types.js';

/** Exactly one option per modifier of the item and nothing else. Returns the options in modifier order,
 *  or null when the choice is incomplete or names an option the item does not have. */
export function resolveOptions(item: MenuItem, optionIds: readonly string[] = []): ChosenOption[] | null {
  const mods = item.modifiers ?? [];
  const ids = new Set(optionIds);
  if (ids.size !== optionIds.length || ids.size !== mods.length) return null;
  const chosen: ChosenOption[] = [];
  for (const m of mods) {
    const hits = m.options.filter((o) => ids.has(o.id));
    if (hits.length !== 1) return null;
    chosen.push({ id: hits[0].id, modifier: m.name, name: hits[0].name, price: hits[0].price });
  }
  return chosen;
}

/** One cart line per item and option choice: "variantId", or "variantId|optionA,optionB". */
export const lineKey = (id: string, options: readonly { id: string }[] = []) => (options.length ? `${id}|${options.map((o) => o.id).join(',')}` : id);

export function parseLineKey(key: string): { id: string; options: string[] } {
  const [id, opts = ''] = key.split('|');
  return { id, options: opts ? opts.split(',') : [] };
}

/** "Miso" or "Ice", shown under the item name. */
export const optionsLabel = (options?: readonly ChosenOption[]) => (options ?? []).map((o) => o.name).join(' · ');
