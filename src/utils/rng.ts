export interface SeededRng {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

export const createSeededRng = (seed: number): SeededRng => {
  let value = seed >>> 0;

  const next = (): number => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (minInclusive: number, maxInclusive: number): number => {
      const min = Math.ceil(minInclusive);
      const max = Math.floor(maxInclusive);
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) {
        throw new Error('Cannot pick from empty list');
      }
      return items[Math.floor(next() * items.length)] as T;
    },
  };
};
