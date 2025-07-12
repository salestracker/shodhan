import { 
  saveSearchResult, 
  getSearchResult,
  getConversationThread,
  fetchCachedResultsWithRetry // This function is not used in cacheService, will remove later if not needed
} from './cacheService';
import { checkCacheSimilarity } from './cacheSimilarityService'; // Corrected import
import { logger } from '../utils/logger';
import { eventBus } from '../lib/eventBus';
import type { SearchResult } from '../types/search';

interface SearchResponse {
  results: SearchResult[];
}

// System prompt for initial queries
const SEARCHGPT_SYSTEM_PROMPT = `You are "SearchGPT," a web-aware search assistant. When given a query:
1. Perform a web search to identify the top authoritative sources.
2. Synthesize concise bullet-point answers (3–5 items). Include FAQ sections for commonly asked questions in the context of the user query.
3. After each bullet, include numbered citations for the sources used.
4. Provide a "Sources" list at the end with full URLs.
5. If unsure, indicate "I'm unable to find reliable information."

Format your response with numbered bullet points, each followed by citations in brackets [1], [2], etc. End with a "Sources:" section listing the URLs.`;

// System prompt specifically for follow-up questions
const FOLLOWUP_SYSTEM_PROMPT = `You are SearchGPT, a web-aware search assistant. You are continuing a previous conversation.
Your task is to provide a concise, cited answer to a follow-up question, building directly on the provided context.
1. **Context Preservation:** Refer to the previous answer's content as the primary context.
2. **Chain-of-Thought:** Think step-by-step to explain your reasoning process if the question requires deeper analysis.
3. **Scoped Questioning:** Focus precisely on the follow-up question, avoiding unnecessary elaboration.
4. **Format:** Return answers in bullet points or numbered lists, consistent with previous responses.
5. **Citations:** Include numbered citations [1], [2], etc., after each point, and provide a "Sources:" list with full URLs at the end.
6. If unsure, state "I'm unable to find reliable information on this specific follow-up."`;

// Helper function to generate a consistent hash for a query
const generateQueryHash = (q: string) => {
  let hash = 0;
  for (let i = 0; i < q.length; i++) {
    const char = q.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `root-${hash}`;
};

// Fetches results from the cache similarity service
const getSimilarCachedResults = async (query: string, parentResult?: SearchResult, userId?: string): Promise<SearchResult[]> => {
  if (!userId) {
    logger.warn('No user ID provided, skipping cache similarity query.');
    return [];
  }

  const content = parentResult ? `Follow-up to: ${parentResult.content.substring(0, 100)}...` : 'New query';
  
  // First call the webhook to generate embedding and store in cache
  const CACHE_SIMILARITY_URL = import.meta.env.VITE_CACHE_SIMILARITY_QUERY_URL;
  const CACHE_SIMILARITY_APIKEY = import.meta.env.VITE_CACHE_SIMILARITY_API_KEY;

  if (!CACHE_SIMILARITY_URL || !CACHE_SIMILARITY_APIKEY) {
    logger.warn('Cache similarity API URL or API Key not configured. Skipping cache similarity check.');
    return [];
  }

  try {
    // Call webhook to generate embedding
    await fetch(CACHE_SIMILARITY_URL, {
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

    // Poll for cached results with retries
    const MAX_RETRIES = 5;
    const RETRY_INTERVAL_MS = 1000;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      const cacheResponse = await checkCacheSimilarity(query, content);
      
      if (cacheResponse.cached && cacheResponse.results) {
        logger.log(`Found ${cacheResponse.results.length} cached results for query:`, query);
        return cacheResponse.results;
      }

      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
      retries++;
    }

    return []; // No cached results found after retries
  } catch (error) {
    logger.error('Error in getSimilarCachedResults:', error);
    return [];
  }
};

// Fetches results from the DeepSeek API via Supabase
const fetchFromDeepSeek = async (query: string, parentResult?: SearchResult, userId?: string): Promise<SearchResult[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const currentSystemPrompt = parentResult ? FOLLOWUP_SYSTEM_PROMPT : SEARCHGPT_SYSTEM_PROMPT;
    const finalQuery = parentResult
      ? `Previous answer: "${parentResult.content.substring(0, 200)}...". Follow-up question: ${query}`
      : query;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL;
    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: finalQuery, systemPrompt: currentSystemPrompt }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`HTTP ${response.status}:`, errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    const data: SearchResponse = await response.json();
    const processedResults = data.results?.map(result => {
      const parts = result.content.split('Sources:');
      const mainContent = parts[0].trim();
      // Ensure sourcesSection is an array of strings
      const sourcesSection = parts[1] ? parts[1].trim().split('\n').filter(s => s.length > 0) : result.sources || [];
      
      return {
        ...result,
        id: parentResult ? `${parentResult.id}-${Date.now()}` : generateQueryHash(query),
        parentId: parentResult?.id,
        followUpQuery: parentResult ? query : undefined,
        content: mainContent,
        sources: sourcesSection, // Now correctly typed as string[]
        title: result.title.includes('SearchGPT') ? result.title : `SearchGPT: ${result.title}`
      };
    }) || [];

    if (processedResults.length > 0) {
      await saveSearchResult(processedResults[0]);
      const webhookUrl = import.meta.env.VITE_CACHE_WEBHOOK_URL;
      if (webhookUrl) {
        const finalUserId = userId || 'unknown';
        const fingerprintId = localStorage.getItem('searchGptFingerprintId') || 'unknown';
        eventBus.dispatchEvent(
          new CustomEvent('sync-request', {
            detail: {
              webhookUrl,
              payload: { results: processedResults, userId: finalUserId, fingerprintId },
            },
          })
        );
      }
    }

    return processedResults;
  } catch (error) {
    logger.error('DeepSeek search error:', error);
    return []; // Return empty array on error to not block Promise.allSettled
  }
};

export const searchWithDeepSeek = async (
  query: string,
  parentResult?: SearchResult,
  userId?: string
): Promise<{ cachedResults: SearchResult[], apiResults: SearchResult[] }> => {
  const cacheKey = parentResult ? parentResult.id : generateQueryHash(query);
  
  // Run both operations in parallel
  const [cachedThread, similarCachedResults, deepSeekResults] = await Promise.all([
    getConversationThread(cacheKey),
    getSimilarCachedResults(query, parentResult, userId),
    fetchFromDeepSeek(query, parentResult, userId).catch(e => {
      logger.error('DeepSeek fetch error:', e);
      return [];
    })
  ]);

  // Handle cached thread results
  if (cachedThread) {
    if (parentResult) {
      const matchingReply = cachedThread.replies?.find(reply => reply.followUpQuery === query);
      if (matchingReply) {
        return {
          cachedResults: [matchingReply],
          apiResults: [] // No API results needed
        };
      }
    } else {
      return {
        cachedResults: [cachedThread],
        apiResults: [] // No API results needed
      };
    }
  }

  // Return both cached and API results
  return {
    cachedResults: similarCachedResults,
    apiResults: deepSeekResults.length > 0 ? deepSeekResults : [
      {
        id: 'fallback-1',
        title: `SearchGPT Results for: ${query}`,
        content: 'I\'m unable to find reliable information at this time. Please try again later or refine your search query.',
        confidence: 0,
        category: 'Error',
        timestamp: Date.now(),
        sources: []
      }
    ]
  };
};
