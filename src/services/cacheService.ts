import type { SearchResult, SearchHistoryItem } from '../types/search';
import { logger } from '../utils/logger';
import { sha512 as computeSha512 } from '../utils/hashUtils';

interface CacheEntry {
  value: SearchResult;
  expires: number;
  timestamp: string | number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CONVERSATION_PREFIX = 'conv_';
const HISTORY_KEY = 'search-history';

// Store individual results by their ID and maintain thread structure
export const saveSearchResult = async (result: SearchResult): Promise<void> => {
  try {
    logger.log('CacheService: Saving search result to cache:', result.id);
    const entry: CacheEntry = {
      value: result,
      expires: Date.now() + CACHE_TTL,
      timestamp: Date.now()
    };
// Removed unused fingerprintId variable
    logger.log('CacheService: Created cache entry with timestamp:', new Date(entry.timestamp).toISOString());
    // Save the main result
    localStorage.setItem(`${CONVERSATION_PREFIX}${result.id}`, JSON.stringify(entry));

    // If this is a reply, update parent's replies list
    if (result.parentId) {
      const parentEntry = localStorage.getItem(`${CONVERSATION_PREFIX}${result.parentId}`);
      if (parentEntry) {
        const parent: CacheEntry = JSON.parse(parentEntry);
        const updatedParent = {
          ...parent.value,
          replies: [
            ...(parent.value.replies || []),
            { 
              id: result.id,
              followUpQuery: result.followUpQuery 
            }
          ]
        };
        localStorage.setItem(
          `${CONVERSATION_PREFIX}${result.parentId}`,
          JSON.stringify({
            ...parent,
            value: updatedParent
          })
        );
      }
    }
  } catch (error) {
    logger.error('Cache write error:', error);
  }
};

// Get individual result by ID
export const getSearchResult = async (id: string): Promise<SearchResult | null> => {
  try {
    logger.log('CacheService: Getting search result from cache:', id);
    const cached = localStorage.getItem(`${CONVERSATION_PREFIX}${id}`);
    if (!cached) {
      logger.log('CacheService: No cached entry found for ID:', id);
      return null;
    }

    const entry: CacheEntry = JSON.parse(cached);
    logger.log('CacheService: Found cached entry with timestamp:', new Date(entry.timestamp).toISOString());
    
    if (Date.now() > entry.expires) {
      logger.log('CacheService: Cached entry expired, removing from cache');
      localStorage.removeItem(`${CONVERSATION_PREFIX}${id}`);
      return null;
    }
    logger.log('CacheService: Returning cached result');
    return entry.value;
  } catch (error) {
    logger.error('Cache read error:', error);
    return null;
  }
};

// Get all results in a conversation thread
/**
 * Retrieves all search results from the cache.
 * @returns Promise that resolves to an array of all cached search results.
 */
export const getAllSearchResults = async (): Promise<SearchResult[]> => {
  try {
    const results: SearchResult[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('conv_')) {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry = JSON.parse(cached);
          if (entry.value && Date.now() <= entry.expires) {
            results.push(entry.value);
          }
        }
      }
    }
    logger.log('CacheService: Retrieved all search results from cache:', results.length, 'entries');
    return results;
  } catch (error) {
    logger.error('CacheService: Error retrieving all search results from cache:', error);
    return [];
  }
};

export const getConversationThread = async (rootId: string): Promise<SearchResult | null> => {
  try {
    const rootResult = await getSearchResult(rootId);
    if (!rootResult) return null;

    // Recursively find all replies
    const buildThread = async (result: SearchResult): Promise<SearchResult> => {
      if (!result.replies || result.replies.length === 0) return result;

      const populatedReplies = await Promise.all(
        result.replies.map(async reply => {
          const fullReply = await getSearchResult(reply.id);
          return fullReply ? await buildThread(fullReply) : reply;
        })
      );

      return {
        ...result,
        replies: populatedReplies
      };
    };

    return await buildThread(rootResult);
  } catch (error) {
    logger.error('Thread build error:', error);
    return null;
  }
};

// Get all cached root conversations
export const getAllRootConversations = async (): Promise<SearchResult[]> => {
  try {
    const results: SearchResult[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CONVERSATION_PREFIX)) {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (Date.now() <= entry.expires && !entry.value.parentId) {
            results.push(entry.value);
          }
        }
      }
    }

    return results.sort((a, b) => {
      const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
      const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
      return timestampB - timestampA;
    });
  } catch (error) {
    logger.error('Cache read error:', error);
    return [];
  }
};

export const saveSearchHistoryItem = async (item: SearchHistoryItem): Promise<void> => {
  try {
    const history = await getSearchHistory();
    const updatedHistory = [
      item,
      ...history.filter(h => h.id !== item.id) // Prevent duplicates
    ].slice(0, 50); // Keep only last 50 items
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    logger.error('History save error:', error);
  }
};

export const getSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    logger.error('History read error:', error);
    return [];
  }
};

export const clearSearchHistory = async (): Promise<void> => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    logger.error('History clear error:', error);
  }
};

interface CacheEntryForSync {
  value: SearchResult;
  expires: number;
  timestamp: string | number;
}

export const getAllCacheEntries = async (): Promise<CacheEntryForSync[]> => {
  try {
    logger.log('CacheService: Getting all cache entries for sync');
    const entries: CacheEntryForSync[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('conv_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}') as CacheEntryForSync;
          if (item.value && item.timestamp) {
            logger.log('CacheService: Found valid cache entry:', key, 'with timestamp:', new Date(item.timestamp).toISOString());
            entries.push(item);
          }
        } catch (e) {
          logger.error('Error parsing cache entry from localStorage:', e);
        }
      }
    }
    logger.log('CacheService: Total valid cache entries found:', entries.length);
    return entries;
  } catch (error) {
    logger.error('Cache read error:', error);
    return [];
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CONVERSATION_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    logger.error('Cache clear error:', error);
  }
};

/**
 * Computes SHA-512 hash of a string.
 * @param input The input string to hash.
 * @returns Promise resolving to the hexadecimal representation of the hash.
 */
// Removed duplicate SHA512 implementation - using hashUtils.ts

/**
 * Normalizes a query string for comparison.
 * @param query The query string to normalize.
 * @returns Normalized query string.
 */
const normalizeQuery = (query: string): string => {
  return query.toLowerCase().trim().replace(/[^\w\s]/g, '');
};

/**
 * Computes Levenshtein Distance between two strings.
 * @param a First string.
 * @param b Second string.
 * @returns The Levenshtein Distance.
 */
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[a.length][b.length];
};

/**
 * Checks if a query is similar to any in local history using fuzzy matching.
 * @param query The new query to check.
 * @param history The search history items to compare against.
 * @param threshold The similarity threshold for Levenshtein Distance (as a percentage of longer string length).
 * @returns The matching history item if similar, otherwise null.
 */
const findSimilarQueryInHistory = (query: string, history: SearchHistoryItem[], threshold: number = 0.1): SearchHistoryItem | null => {
  const normalizedQuery = normalizeQuery(query);
  for (const item of history) {
    const normalizedItemQuery = normalizeQuery(item.query);
    const longerLength = Math.max(normalizedQuery.length, normalizedItemQuery.length);
    if (longerLength === 0) continue;
    const distance = levenshteinDistance(normalizedQuery, normalizedItemQuery);
    const similarityRatio = distance / longerLength;
    if (similarityRatio < threshold) {
      logger.log(`Found similar query in history: "${item.query}" for new query: "${query}" with similarity ratio: ${similarityRatio}`);
      return item;
    }
  }
  logger.log(`No similar query found in history for: "${query}"`);
  return null;
};

/**
 * Fetches cached results from Supabase with a retry mechanism.
 * @param userId The ID of the user.
 * @param query The query string to hash and check.
 * @param maxRetries Maximum number of retry attempts.
 * @param initialDelay Initial delay between retries in milliseconds.
 * @returns Promise resolving to an array of cached search results.
 */
export const fetchCachedResultsWithRetry = async (
  userId: string,
  query: string,
  maxRetries: number = 5,
  initialDelay: number = 1000
): Promise<SearchResult[]> => {
  try {
    logger.log('Fetching cached results from Supabase for user:', userId);
    const userQueryHash = await computeSha512(query);
    logger.log('Computed user query hash:', userQueryHash);

    // Check local history for similar queries to avoid unnecessary webhook calls
    const history = await getSearchHistory();
    const similarQueryItem = findSimilarQueryInHistory(query, history);
    let targetHash = userQueryHash;
    if (similarQueryItem) {
      targetHash = await computeSha512(similarQueryItem.query);
      logger.log('Using hash from similar history item:', targetHash);
    }

    // Import Supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');

    let attempt = 0;
    let results: SearchResult[] = [];
    while (attempt < maxRetries && results.length === 0) {
      attempt++;
      logger.log(`Attempt ${attempt} to fetch cached results for hash:`, targetHash);
      try {
        const { data: cachedQueryResults, error } = await supabase
          .from('cachedQueryResults')
          .select('cache_id')
          .eq('user_id', userId)
          .eq('user_query_hash', targetHash);

        if (error) {
          logger.error(`Error fetching cachedQueryResults (attempt ${attempt}):`, error.message);
        } else if (cachedQueryResults && cachedQueryResults.length > 0) {
          logger.log(`Found ${cachedQueryResults.length} cached query results on attempt ${attempt}.`);
          const cacheIds = cachedQueryResults.map(r => r.cache_id);
          const { data: cacheData, error: cacheError } = await supabase
            .from('cache')
            .select('id, cache_user_result')
            .in('id', cacheIds);

          if (cacheError) {
            logger.error('Error fetching cache data:', cacheError.message);
          } else if (cacheData && cacheData.length > 0) {
            const userResultIds = cacheData.map(c => c.cache_user_result);
            const { data: userResults, error: userResultsError } = await supabase
              .from('cacheUserResults')
              .select('*')
              .in('id', userResultIds)
              .limit(5); // Limit to top 5 results

            if (userResultsError) {
              logger.error('Error fetching cacheUserResults:', userResultsError.message);
            } else if (userResults && userResults.length > 0) {
              results = userResults.map((ur, index) => ({
                id: `cached-${ur.id}-${index}`,
                query: ur.query || query,
                content: ur.content,
                title: ur.query || 'Cached Result',
                sources: ur.sources || [],
                timestamp: ur.updated_at ? new Date(ur.updated_at).getTime() : Date.now(),
                isLoading: false,
                isCached: true,
                replies: [],
                parentId: ur.parent_id || '',
                rootId: ur.root_id || '',
                followUpQuery: ur.followUpQuery || '',
                confidence: 0.9, // Default confidence for cached results
                category: 'cached'
              }));
              logger.log(`Retrieved ${results.length} cached results from Supabase.`);
              return results;
            }
          }
        }
      } catch (error) {
        logger.error(`Unexpected error fetching cached results (attempt ${attempt}):`, error);
      }

      if (results.length === 0 && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.log(`No results found. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (results.length === 0) {
      logger.log('No cached results found after all retry attempts.');
    }
    return results;
  } catch (error) {
    logger.error('Error in fetchCachedResultsWithRetry:', error);
    return [];
  }
};
