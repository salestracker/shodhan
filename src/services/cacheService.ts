import type { SearchResult, SearchHistoryItem } from '../types/search';
import { logger } from '../utils/logger';

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
