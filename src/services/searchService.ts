import { 
  saveSearchResult, 
  getSearchResult,
  getConversationThread 
} from './cacheService';
import { sendSearchResultsToServiceWorker } from '../utils/serviceWorkerMessenger';

// Diagnostic: initial Service Worker controller state on module load
if ('serviceWorker' in navigator) {
  console.log('Diagnostic: initial SW controller on module load:', navigator.serviceWorker.controller);
} else {
  console.log('Diagnostic: serviceWorker unsupported in this environment');
}
import type { SearchResult } from '../components/SearchEngine';

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

export const searchWithDeepSeek = async (
  query: string,
  parentResult?: SearchResult
): Promise<SearchResult[]> => {
  // Generate consistent cache key using query hash
  const generateQueryHash = (q: string) => {
    // Simple hash function for consistent key generation
    let hash = 0;
    for (let i = 0; i < q.length; i++) {
      const char = q.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `root-${hash}`;
  };

  // Check cache for existing results first
  const cacheKey = parentResult ? parentResult.id : generateQueryHash(query);
  const cachedThread = await getConversationThread(cacheKey);
  
  if (cachedThread) {
    // For follow-ups, check if we have this exact query in the thread
    if (parentResult) {
      const matchingReply = cachedThread.replies?.find(
        reply => reply.followUpQuery === query
      );
      if (matchingReply) return [matchingReply];
    } else {
      // For root queries, return the thread's root result
      return [cachedThread];
    }
  }

  console.log('Cache miss for query:', query); // Debug logging

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const currentSystemPrompt = parentResult ? FOLLOWUP_SYSTEM_PROMPT : SEARCHGPT_SYSTEM_PROMPT;
    const finalQuery = parentResult
      ? `Previous answer: "${parentResult.content.substring(0, 200)}...". Follow-up question: ${query}`
      : query;

    console.log('[DEBUG] Calling Supabase edge function with query:', finalQuery);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL;
    const response = await fetch(
      supabaseUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: finalQuery,
          systemPrompt: currentSystemPrompt
        }),
        signal: controller.signal
      }
    );
    console.log('[DEBUG] Supabase response status:', response.status);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP ${response.status}:`, errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    const data: SearchResponse = await response.json();
    
    const processedResults = data.results?.map(result => {
      const parts = result.content.split('Sources:');
      const mainContent = parts[0].trim();
      const sourcesSection = parts[1] ? parts[1].trim() : result.sources || '';
      
      const finalResult = {
        ...result,
        id: parentResult ? `${parentResult.id}-${Date.now()}` : generateQueryHash(query),
        parentId: parentResult?.id,
        followUpQuery: parentResult ? query : undefined,
        content: mainContent,
        sources: sourcesSection,
        title: result.title.includes('SearchGPT') ? result.title : `SearchGPT: ${result.title}`
      };

      return finalResult;
    }) || [];

    // Save the search result to local storage cache
    await saveSearchResult(processedResults[0]);
    
    // Notify Service Worker for immediate sync
    await sendSearchResultsToServiceWorker(processedResults)
      .then(() => {
        console.log('[DEBUG] Successfully notified Service Worker of new search results for synchronization');
      })
      .catch(error => {
        console.warn('[DEBUG] Failed to notify Service Worker of new search results:', error);
      });
    return processedResults;
  } catch (error) {
    console.error('Search service error:', error);
    return [
      {
        id: 'fallback-1',
        title: `SearchGPT Results for: ${query}`,
        content: error instanceof Error && error.name === 'AbortError' 
          ? 'Request timed out. The search is taking longer than expected. Please try again.'
          : 'I\'m unable to find reliable information at this time. Please try again later or refine your search query.',
        confidence: 0,
        category: 'Error',
        timestamp: Date.now(),
        sources: ''
      }
    ];
  }
};
