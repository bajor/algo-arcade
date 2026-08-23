export const LOWERCASE_ASCII_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export function isLowercaseAsciiLetter(character: string): boolean {
  return /^[a-z]$/.test(character);
}
