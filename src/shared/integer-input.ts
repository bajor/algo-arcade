export type IntegerListResult =
  | { readonly ok: true; readonly values: readonly number[] }
  | { readonly ok: false; readonly error: string };

export function parseIntegerList(
  raw: string,
  example: string,
): IntegerListResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return failure(`Enter at least one integer, such as ${example}.`);
  }

  const startsWithBracket = trimmed.startsWith("[");
  const endsWithBracket = trimmed.endsWith("]");
  if (startsWithBracket !== endsWithBracket) {
    return failure(
      `Use both square brackets or neither: [${example}] or ${example}.`,
    );
  }

  const body = startsWithBracket ? trimmed.slice(1, -1).trim() : trimmed;
  if (!body) {
    return failure("Enter at least one integer inside the brackets.");
  }

  if (
    body.includes(",") &&
    body.split(",").some((segment) => segment.trim() === "")
  ) {
    return failure("Enter an integer between every pair of commas.");
  }

  const tokens = body.split(/[\s,]+/).filter(Boolean);
  const invalidToken = tokens.find((token) => !/^-?\d+$/.test(token));
  if (invalidToken) {
    return failure(
      `"${invalidToken}" is not an integer. Separate values with commas or spaces.`,
    );
  }

  return { ok: true, values: Object.freeze(tokens.map(Number)) };
}

function failure(error: string): IntegerListResult {
  return { ok: false, error };
}
