/** Numeric-ish semver compare: negative if a < b, positive if a > b, 0 if equal. */
export function compareSemverLike(a: string, b: string): number {
  const pa = a
    .replace(/^[^\d]*/, '')
    .split(/[.\-]/)
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n));
  const pb = b
    .replace(/^[^\d]*/, '')
    .split(/[.\-]/)
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n));
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
