export function randomInteger(
  random: () => number,
  minimum: number,
  maximum: number,
): number {
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new Error(
      "Random source must return a number from 0 inclusive to 1 exclusive.",
    );
  }
  return Math.floor(sample * (maximum - minimum + 1)) + minimum;
}

export function shuffleCopy<T>(
  values: readonly T[],
  random: () => number,
): readonly T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(random, 0, index);
    const value = shuffled[index] as T;
    shuffled[index] = shuffled[swapIndex] as T;
    shuffled[swapIndex] = value;
  }

  return Object.freeze(shuffled);
}
