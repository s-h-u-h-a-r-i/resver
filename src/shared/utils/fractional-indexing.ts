/** Base-62 digit alphabet used to encode fractional-index keys, ordered by sort value. */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** Radix of the {@link DIGITS} alphabet (62). */
const BASE = DIGITS.length;

/**
 * Generates a string key that sorts lexicographically between `a` and `b`, for use as a
 * fractional index (e.g. ordering list items without renumbering siblings on insert).
 *
 * @param a The key immediately before the desired position, or
 *   `undefined` if inserting at the start of the list.
 * @param b The key immediately after the desired position, or
 *   `undefined` if inserting at the end of the list.
 * @returns A new key such that `a < result < b` (treating `undefined` bounds as
 *   open-ended).
 * @throws {Error} If both bounds are given and `a >= b`.
 */
export function generateKeyBetween(
  a: string | undefined,
  b: string | undefined,
): string {
  if (a !== undefined && b !== undefined && a >= b) {
    throw new Error(`a (${a}) must be < b (${b})`);
  }

  if (a === undefined) {
    if (b === undefined) return 'V';
    return generateKeyBefore(b);
  }

  if (b === undefined) {
    return generateKeyAfter(a);
  }

  return midpoint(a, b);
}

/**
 * Generates a key that sorts strictly before `b`, with no lower bound.
 *
 * @param b The key to generate a predecessor for.
 * @returns A new key less than `b`.
 */
function generateKeyBefore(b: string): string {
  for (let i = 0; i < b.length; i++) {
    const v = digitToValue(b[i]);
    if (v > 0) {
      return b.slice(0, i) + valueToDigit(Math.floor(v / 2));
    }
  }
  return '0' + generateKeyBefore(b.slice(1) || DIGITS[BASE - 1]);
}

/**
 * Generates a key that sorts strictly after `a`, with no upper bound.
 *
 * @param a The key to generate a successor for.
 * @returns A new key greater than `a`.
 */
function generateKeyAfter(a: string): string {
  for (let i = 0; i < a.length; i++) {
    const v = digitToValue(a[i]);
    if (v < BASE - 1) {
      return (
        a.slice(0, i) + valueToDigit(v + 1 + Math.floor((BASE - 1 - v) / 2))
      );
    }
  }
  return a + valueToDigit(Math.floor(BASE / 2));
}

/**
 * Generates a key strictly between two already-ordered keys (`a < b`).
 *
 * @param a The lower bound key.
 * @param b The upper bound key.
 * @returns A new key such that `a < result < b`.
 * @throws {Error} If no valid midpoint could be found (should not happen in practice).
 */
function midpoint(a: string, b: string): string {
  let result = '';
  let i = 0;

  const maxLen = Math.max(a.length, b.length) + 2;
  for (; i < maxLen;) {
    const digitA = i < a.length ? digitToValue(a[i]) : 0;
    const digitB = i < b.length ? digitToValue(b[i]) : BASE;

    if (digitA === digitB) {
      result += valueToDigit(digitA);
      i++;
      continue;
    }

    if (digitB - digitA > 1) {
      const mid = digitA + Math.floor((digitB - digitA) / 2);
      return result + valueToDigit(mid);
    }

    result += valueToDigit(digitA);
    i++;
    const restA = i < a.length ? a.slice(i) : '';
    return result + generateKeyAfter(restA || DIGITS[0]);
  }

  // fallback in the highly unlikely event that something goes wrong
  throw new Error('midpoint could not find a valid key between a and b');
}

/**
 * Looks up the numeric value of a single {@link DIGITS} character.
 *
 * @param d A single character from the {@link DIGITS} alphabet.
 * @returns The digit's value, in `[0, BASE)`.
 * @throws {Error} If `d` is not a valid digit character.
 */
function digitToValue(d: string): number {
  const v = DIGITS.indexOf(d);
  if (v === -1) throw new Error(`Invalid digit: ${d}`);
  return v;
}

/**
 * Converts a numeric value back into its {@link DIGITS} character.
 *
 * @param v A digit value in `[0, BASE)`.
 * @returns The corresponding character from {@link DIGITS}.
 */
function valueToDigit(v: number): string {
  return DIGITS[v];
}
