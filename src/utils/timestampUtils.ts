/**
 * Converts a timestamp input (string, number, or undefined) to milliseconds since epoch.
 * Returns 0 for invalid or undefined inputs.
 * @param input The timestamp input to convert.
 * @returns The timestamp in milliseconds since epoch, or 0 if invalid.
 */
export function toMillis(input: string | number | undefined): number {
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    const parsed = Date.parse(input);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Converts a timestamp to an ISO string format.
 * @param input The timestamp input to convert.
 * @returns The timestamp as an ISO string, or an empty string if invalid.
 */
export function toISOString(input: string | number | undefined): string {
  if (typeof input === 'number') return new Date(input).toISOString();
  if (typeof input === 'string') {
    const parsed = Date.parse(input);
    return isNaN(parsed) ? '' : new Date(parsed).toISOString();
  }
  return '';
}
