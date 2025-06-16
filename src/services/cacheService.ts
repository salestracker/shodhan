import { sha256 } from 'crypto-hash';
import type { SearchResult } from '../components/SearchResults';
import type { SearchHistoryItem } from '../types/search';

interface CacheEntry {
  value: SearchResult;
  expires: number;
  timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CONVERSATION_PREFIX = 'conv_';
const HISTORY_KEY = 'search-history';

// Store individual results by their ID and maintain thread structure
export const saveSearchResult = async (result: SearchResult): Promise<void> => {
  try {
    const entry: CacheEntry = {
      value: result,
      expires: Date.now() + CACHE_TTL,
      timestamp: Date.now()
    };
    
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
    console.error('Cache write error:', error);
  }
};

// Get individual result by ID
export const getSearchResult = async (id: string): Promise<SearchResult | null> => {
  try {
    const cached = localStorage.getItem(`${CONVERSATION_PREFIX}${id}`);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    if (Date.now() > entry.expires) {
      localStorage.removeItem(`${CONVERSATION_PREFIX}${id}`);
      return null;
    }
    return entry.value;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

// Get all results in a conversation thread
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
    console.error('Thread build error:', error);
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
    console.error('Cache read error:', error);
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
    console.error('History save error:', error);
  }
};

export const getSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('History read error:', error);
    return [];
  }
};

export const clearSearchHistory = async (): Promise<void> => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('History clear error:', error);
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
    console.error('Cache clear error:', error);
  }
};
