import { logger } from '../utils/logger';
import { sha512 } from '../utils/hashUtils';
import { supabase } from '../lib/supabase';
import type { SearchResult } from '../types/search';

// Define interfaces for data structures
interface CacheSimilarityParams {
  query: string;
  userId: string;
}

interface CachedQueryResult {
  id: number;
  cache_id: number;
  user_query_hash: string;
}

interface CacheEntry {
  id: number;
  cache_user_result: number;
}

// Custom Error for the service
class CacheSimilarityError extends Error {
  constructor(public code: string, message: string, public context?: object) {
    super(message);
    this.name = 'CacheSimilarityError';
  }
}

// Constants for polling
const SIMILARITY_POLL_INTERVAL = 1000; // 1 second
const MAX_POLL_ATTEMPTS = 5;

/**
 * Fetches cached query results from Supabase.
 * @param userId - The user's unique identifier.
 * @param queryHash - The SHA512 hash of the user's query.
 * @returns A promise that resolves to the query results.
 */
async function fetchCachedQueryResults(userId: string, queryHash: string) {
  return supabase
    .from('cachedQueryResults')
    .select('id, cache_id, user_query_hash')
    .eq('user_id', userId)
    .eq('user_query_hash', queryHash);
}

/**
 * Fetches full cache entries from Supabase.
 * @param cacheIds - An array of cache IDs to fetch.
 * @returns A promise that resolves to the cache entries.
 */
async function fetchCacheEntries(cacheIds: number[]) {
  return supabase
    .from('cache')
    .select('id, cache_user_result')
    .in('id', cacheIds);
}

/**
 * Fetches the final user-facing search results.
 * @param userResultIds - An array of user result IDs to fetch.
 * @returns A promise that resolves to the search results.
 */
async function fetchUserResults(userResultIds: number[]) {
  return supabase
    .from('cacheUserResults')
    .select('id, content, sources, query, created_at')
    .in('id', userResultIds);
}

/**
 * Polls for cached results with exponential backoff.
 * @param userId - The user's unique identifier.
 * @param queryHash - The SHA512 hash of the user's query.
 * @returns A promise that resolves to the cached results or an error.
 */
async function pollForCachedResults(userId: string, queryHash: string): Promise<{ data: CachedQueryResult[] | null; error: Error | null }> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await fetchCachedQueryResults(userId, queryHash);
      if (error) throw new CacheSimilarityError('CACHE-500', 'Failed to poll for results', { originalError: error });
      if (data && data.length > 0) return { data, error: null };
      await new Promise(resolve => setTimeout(resolve, SIMILARITY_POLL_INTERVAL * Math.pow(2, attempt)));
    } catch (error) {
      logger.error('Polling attempt failed:', { attempt, error });
    }
  }
  return { data: null, error: new CacheSimilarityError('CACHE-404', 'Polling timed out') };
}

/**
 * Main service function to find similar cached results.
 * @param params - The query and user ID.
 * @returns A promise that resolves to an array of search results.
 */
export const findSimilarCachedResults = async ({ query, userId }: CacheSimilarityParams): Promise<SearchResult[]> => {
  const queryHash = await sha512(query);
  const webhookUrl = import.meta.env.VITE_CACHE_SIMILARITY_QUERY;
  const apiKey = import.meta.env.VITE_CACHE_SIMILARITY_API_KEY;

  if (!webhookUrl || !apiKey) {
    logger.warn('Cache similarity service is not configured.');
    return [];
  }

  try {
    // 1. Trigger the webhook to start the similarity search process
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-make-apikey': apiKey },
      body: JSON.stringify({ query, content: `Search query: ${query}`, user_id: userId, query_hash: queryHash }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      const errorMessage = `Webhook failed: ${response.status} - ${errorBody}`;
      logger.error(errorMessage);
      throw new CacheSimilarityError('WEBHOOK-500', errorMessage);
    }

    // 2. Poll for the results
    const { data: cachedResults, error: pollError } = await pollForCachedResults(userId, queryHash);
    if (pollError) throw pollError;
    if (!cachedResults || cachedResults.length === 0) return [];

    // 3. Fetch the corresponding cache entries
    const cacheIds = cachedResults.map(r => r.cache_id);
    const { data: cacheEntries, error: entriesError } = await fetchCacheEntries(cacheIds);
    if (entriesError) throw new CacheSimilarityError('CACHE-500', 'Failed to fetch cache entries', { originalError: entriesError });
    if (!cacheEntries) return [];

    // 4. Fetch the final user results
    const userResultIds = cacheEntries.map(e => e.cache_user_result);
    const { data: userResults, error: resultsError } = await fetchUserResults(userResultIds);
    if (resultsError) throw new CacheSimilarityError('CACHE-500', 'Failed to fetch user results', { originalError: resultsError });
    if (!userResults) return [];

    // 5. Format and return the top 5 results
    return userResults.slice(0, 5).map(result => ({
      id: `cached-${result.id}`,
      query: result.query || query,
      title: `Cached Result for: ${result.query || query}`,
      content: result.content,
      sources: result.sources || [],
      timestamp: new Date(result.created_at).getTime(),
      isCached: true,
      confidence: 0.9, // High confidence for cached results
      category: 'Cached',
    }));

  } catch (error) {
    if (error instanceof CacheSimilarityError) {
      logger.error(`Cache Similarity Error: ${error.code}`, { message: error.message, context: error.context });
    } else {
      logger.error('An unexpected error occurred in the cache similarity service:', error);
    }
    return []; // Return empty array on error to prevent blocking the UI
  }
};
