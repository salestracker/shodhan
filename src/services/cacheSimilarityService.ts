import { logger } from '../utils/logger';
import { sha512 } from '../utils/hashUtils';
import { supabase } from '../lib/supabase'; // Assuming supabase client is exported from here
import type { CacheResult, SearchResult } from '../types/search'; // Import necessary types
// import { useUser } from '../contexts/AppContext'; // Removed as userId is currently hardcoded

/**
 * Represents a cached query result from the database.
 */
interface CachedQueryResult {
  id: number;
  created_at: string;
  user_id: string;
  cache_id: number;
  user_query_hash: string;
}

/**
 * Represents an entry in the cache table.
 */
interface CacheEntry {
  id: number;
  created_at: string;
  cache_user_result: number;
  query_hash: string;
  embeddings: number[]; // Assuming vector type is represented as number array
}

/**
 * Represents a user result from the cacheUserResults table.
 */
interface CacheUserResult {
  id: number;
  created_at: string;
  root_id: string;
  parent_id: string | null;
  followUpQuery: string | null;
  content: string;
  sources: string[] | null;
  user_id: string;
  fingerprint_id: string | null;
  updated_at: string | null;
  query: string | null;
}

/**
 * Checks for similar queries in the cache and retrieves results if found.
 * @param query The user's current query.
 * @param content The context content for the query.
 * @returns A Promise resolving to an object indicating if cached results were found and the results themselves.
 */
export const checkCacheSimilarity = async (
  query: string,
  content: string
): Promise<{ cached: boolean; results?: SearchResult[] }> => {
  const CACHE_SIMILARITY_URL = import.meta.env.VITE_CACHE_SIMILARITY_QUERY_URL;
  const CACHE_SIMILARITY_APIKEY = import.meta.env.VITE_CACHE_SIMILARITY_API_KEY;

  if (!CACHE_SIMILARITY_URL || !CACHE_SIMILARITY_APIKEY) {
    logger.warn('Cache similarity API URL or API Key not configured. Skipping cache similarity check.');
    return { cached: false };
  }

  // Get user ID from context or a global state. For now, using a placeholder.
  // In a real application, you would get this from the authenticated user session.
  const userId = '123e4567-e89b-12d3-a456-426614174000'; // Placeholder user ID

  try {
    const userQueryHash = await sha512(query);
    logger.log('Generated user query hash:', userQueryHash);

    // Step 1: Call the webhook API to generate embedding and store in cache
    logger.log('Calling cache similarity webhook...');
    const webhookResponse = await fetch(CACHE_SIMILARITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-make-apikey': CACHE_SIMILARITY_APIKEY,
      },
      body: JSON.stringify({
        query,
        content,
        user_id: userId,
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      logger.error('Cache similarity webhook failed:', webhookResponse.status, errorText);
      throw new Error(`Webhook API error: ${webhookResponse.statusText}`);
    }

    logger.log('Cache similarity webhook called successfully.');

    // Step 2: Poll Supabase for cached results with retries
    const MAX_RETRIES = 5;
    const RETRY_INTERVAL_MS = 1000; // 1 second

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      logger.log(`Attempt ${attempt + 1} to fetch cached results for hash: ${userQueryHash}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS)); // Wait before polling

      const { data: cachedQueryResults, error: cachedQueryError } = await supabase
        .from('cachedQueryResults')
        .select('*')
        .eq('user_id', userId)
        .eq('user_query_hash', userQueryHash);

      if (cachedQueryError) {
        logger.error('Error querying cachedQueryResults:', cachedQueryError);
        continue; // Try again on error
      }

      if (cachedQueryResults && cachedQueryResults.length > 0) {
        logger.log('Found cached query results:', cachedQueryResults);

        // Step 3: Fetch matching results from 'cache' and 'cacheUserResults'
        const cacheIds = cachedQueryResults.map(res => res.cache_id);
        
        const { data: cacheEntries, error: cacheError } = await supabase
          .from('cache')
          .select('*, cacheUserResults(*)') // Select all from cache and join cacheUserResults
          .in('id', cacheIds);

        if (cacheError) {
          logger.error('Error querying cache table:', cacheError);
          continue; // Try again on error
        }

        if (cacheEntries && cacheEntries.length > 0) {
          logger.log('Found cache entries with user results:', cacheEntries);

          // Map to SearchResult type and return top 5
          const results: SearchResult[] = cacheEntries
            .filter(entry => entry.cacheUserResults) // Ensure cacheUserResults is not null
            .map(entry => {
              const userResult = entry.cacheUserResults as CacheUserResult; // Cast to expected type
              return {
                id: userResult.root_id, // Use root_id as SearchResult ID
                query: userResult.query || query, // Use original query or current query
                content: userResult.content,
                sources: userResult.sources || [],
                parentId: userResult.parent_id || undefined,
                replies: [], // Cached results are typically leaf nodes or initial results
                isReplying: false,
                timestamp: userResult.created_at,
                confidence: 1, // Assuming high confidence for cached results
                category: 'cached', // Indicate it's a cached result
                title: userResult.query || query, // Use query as title for cached results
              };
            })
            .slice(0, 5); // Limit to top 5 results

          if (results.length > 0) {
            logger.log('Returning cached results:', results);
            return { cached: true, results };
          }
        }
      }
    }

    logger.log('No cached results found after retries.');
    return { cached: false };
  } catch (error) {
    logger.error('Error in checkCacheSimilarity:', error);
    return { cached: false };
  }
};
