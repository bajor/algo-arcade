import { isLowercaseAsciiLetter } from "./lowercase-ascii";

export type LowercaseWordListResult =
  | { readonly ok: true; readonly words: readonly string[] }
  | { readonly ok: false; readonly error: string };

export type LowercaseWordValidationResult =
  { readonly ok: true } | { readonly ok: false; readonly error: string };

export function validateLowercaseWord(
  word: string,
): LowercaseWordValidationResult {
  if (!word) {
    return failure("Enter at least one lowercase word.");
  }

  const characters = Array.from(word);
  const invalidIndex = characters.findIndex(
    (character) => !isLowercaseAsciiLetter(character),
  );
  if (invalidIndex !== -1) {
    return failure(
      `Character ${JSON.stringify(characters[invalidIndex])} at position ${String(invalidIndex + 1)} in token ${JSON.stringify(word)} is invalid. Use only lowercase ASCII letters (a-z).`,
    );
  }

  return { ok: true };
}

export function parseLowercaseWordList(input: string): LowercaseWordListResult {
  if (!input.trim()) {
    return failure("Enter at least one lowercase word.");
  }

  const tokens = input.split(",").map((token) => token.trim());
  const emptyIndex = tokens.findIndex((token) => token.length === 0);
  if (emptyIndex !== -1) {
    return failure(
      `Entry ${String(emptyIndex + 1)} is empty. Enter a lowercase word between every pair of commas.`,
    );
  }

  for (const token of tokens) {
    const validation = validateLowercaseWord(token);
    if (!validation.ok) return validation;
  }

  return { ok: true, words: Object.freeze(tokens) };
}

function failure(error: string): {
  readonly ok: false;
  readonly error: string;
} {
  return { ok: false, error };
}
