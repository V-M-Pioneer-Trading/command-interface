/**
 * The string if it has any characters, else `undefined`, so `nonEmpty(a) ?? b`
 * keeps the old `a || b` rule that an empty string is as good as absent
 * (`??` alone would let `""` through).
 */
export function nonEmpty(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  return text;
}
