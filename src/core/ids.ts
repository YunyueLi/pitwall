import { randomBytes } from 'node:crypto';

const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';

/**
 * Time-sortable opaque id: 8 chars of base32 timestamp + 8 random chars.
 * Prefixed so ids are self-describing in logs (e.g. "turn_...", "dir_...").
 */
export function newId(prefix: string): string {
  let t = Date.now();
  let time = '';
  for (let i = 0; i < 8; i++) {
    time = alphabet[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const rand = Array.from(randomBytes(8), (b) => alphabet[b % 32]).join('');
  return `${prefix}_${time}${rand}`;
}
