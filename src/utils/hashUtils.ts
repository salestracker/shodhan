import { logger } from './logger';

/**
 * Computes the SHA-512 hash of a given string.
 * @param message The string to hash.
 * @returns A Promise that resolves with the SHA-512 hash as a hexadecimal string.
 */
export async function sha512(message: string): Promise<string> {
  try {
    // Encode the string as UTF-8
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(message);

    // Compute the SHA-512 hash
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);

    // Convert the ArrayBuffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    logger.log('SHA-512 hash generated:', hexHash);
    return hexHash;
  } catch (error) {
    logger.error('Error generating SHA-512 hash:', error);
    throw new Error('Failed to generate SHA-512 hash.');
  }
}
