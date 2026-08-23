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
