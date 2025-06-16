import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SearchBar from './SearchBar';
import ThreadedSearchResult from './ThreadedSearchResult';
import SearchHistory from './SearchHistory';
import { useAppContext } from '@/contexts/AppContext';
import type { SearchHistoryItem } from '@/types/search';
import { searchWithDeepSeek } from '@/services/searchService';
import { Sparkles, Brain, Home, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getConversationThread, saveSearchResult } from '@/services/cacheService';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  confidence: number;
  category: string;
  timestamp: string;
  sources?: string;
  parentId?: string;
  followUpQuery?: string;
  replies?: SearchResult[];
}

const SearchEngine: React.FC = () => {
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const { addToHistory, resetSearch, loadHistory, searchHistory, toggleHistory } = useAppContext();

  // Separate state for displayed results to ensure proper re-rendering
  const [displayedResults, setDisplayedResults] = useState<SearchResult[]>([]);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]); // Keep for internal tracking
  useEffect(() => {
    console.log('[DEBUG] results state changed:', results);
    if (results.length > 0) {
      console.log('[DEBUG] First result content:', results[0].content);
    }
  }, [results]);

  const resetSearchState = () => {
    setHasSearched(false);
    setResults([]);
    setCurrentQuery('');
    resetSearch();
  };

  const findResultById = (results: SearchResult[], id: string): SearchResult | null => {
    for (const result of results) {
      if (result.id === id) return result;
      if (result.replies) {
        const found = findResultById(result.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFollowUpSearch = async (parentId: string, followUpQuery: string) => {
    const parentResult = findResultById(results, parentId);
    if (!parentResult) return;

    // Perform the DeepSeek search for the follow-up query
    const newResults = await searchWithDeepSeek(followUpQuery, parentResult);
    if (newResults.length > 0) {
      const newResult = {
        ...newResults[0],
        id: uuidv4(), // Assign a new UUID for the follow-up result
        parentId,
        followUpQuery
      };

      // Save the new follow-up result to cache
      await saveSearchResult(newResult);

      // Update the local state to include the new reply
      setResults(prevResults => {
        const updatedResults = [...prevResults];
        const parent = findResultById(updatedResults, parentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(newResult);
        }
        return updatedResults;
      });
    }
  };

  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const queryClient = useQueryClient();
  const { isLoading, error } = useQuery({
    queryKey: ['search', currentQuery],
    queryFn: async () => {
      console.log('[DEBUG] useQuery queryFn executing');
      if (!currentQuery) return [];
      
      if (isCacheLoaded) {
        console.log('[DEBUG] Skipping API call - results already loaded from cache');
        return [];
      }

      console.log('[DEBUG] Performing new search');
      const newResults = await searchWithDeepSeek(currentQuery);
      const rootResult = newResults.length > 0 ? { ...newResults[0], id: uuidv4() } : null;

      if (rootResult) {
        await saveSearchResult(rootResult);
        const historyEntry: SearchHistoryItem = {
          id: rootResult.id,
          query: currentQuery,
          timestamp: Date.now(),
          resultId: rootResult.id
        };
        addToHistory(historyEntry);
        setResults([rootResult]);
        setDisplayedResults([rootResult]); // Update displayed results
      } else {
        setResults([]);
        setDisplayedResults([]); // Clear displayed results
      }
      return newResults;
    },
    enabled: !!currentQuery,
    staleTime: 10000,
    retry: false
  });

  useEffect(() => {
    if (error) {
      console.error('Search failed:', error);
    }
  }, [error]);

  // Load search history when component mounts
  useEffect(() => {
    const loadInitialHistory = async () => {
      await loadHistory();
    };
    loadInitialHistory();
  }, [loadHistory]);

  // Modified handleSearch to accept an optional resultId for history clicks
  const handleSearch = async (query: string, resultId?: string) => {
    console.log('[DEBUG] handleSearch called', { query, resultId });
    if (!query.trim()) return;
    
    setHasSearched(true);
    setDisplayedResults([]); // Clear displayed results immediately
    setResults([]); // Clear internal results state

    if (resultId) {
      console.log('[DEBUG] Loading from cache with resultId:', resultId);
      setIsLoadingFromCache(true);
      try {
        const cachedThread = await getConversationThread(resultId);
        if (cachedThread) {
          console.log('[DEBUG] Setting results from cache:', cachedThread);
          setDisplayedResults([{ ...cachedThread }]);
          setResults([{ ...cachedThread }]);
          setIsLoadingFromCache(false);
          return; // Skip API call for cached results
        }
      } catch (error) {
        console.error('[DEBUG] Error loading cached thread:', error);
        setIsLoadingFromCache(false);
        // Fall through to fresh search if cache fails
      }
    }
    
    // Only proceed with fresh search if no cached result was found
    console.log('[DEBUG] Performing fresh search');
    queryClient.invalidateQueries({ queryKey: ['search', query] });
    setCurrentQuery(query);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-6 px-4">
            <button 
              onClick={resetSearchState}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Return to home"
            >
              <Home className="h-6 w-6 text-purple-600" />
            </button>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-full shadow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <button 
              onClick={() => toggleHistory()}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Toggle search history"
            >
              <History className="h-6 w-6 text-purple-600" />
            </button>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Shodhan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered search assistant with web-aware intelligence
          </p>
          <div className="flex items-center justify-center space-x-6 mt-6">
            <div className="flex items-center space-x-2 text-purple-600">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">AI search</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        
        {/* Search History - Moved to sidebar */}

        {/* Landing Page Content - Only shown when no search has been performed */}
        {!hasSearched && (
          <div className="mt-12 max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
          <p className="text-2xl font-medium text-center mb-6 italic text-purple-600">
            "New wine in an old bottle"
          </p>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-purple-600 mr-3">•</div>
              <span><strong>Conversational Search:</strong> Ask questions in plain English—no more keyword gymnastics.</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-purple-600 mr-3">•</div>
              <span><strong>Source Transparency:</strong> Every answer is footnoted with numbered citations for instant fact-checking.</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-purple-600 mr-3">•</div>
              <span><strong>Real-Time Updates:</strong> Powered by GenAI, ensuring continually refreshed knowledge.</span>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 text-purple-600 mr-3">•</div>
              <span><strong>Privacy-First:</strong> No tracking. Save your search. Come back later — just clean, focused search.</span>
            </li>
          </ul>
        </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center mt-12">
            <div className="inline-flex items-center space-x-2 text-purple-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-lg font-medium">SearchGPT is analyzing...</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {displayedResults.length > 0 && (
          <div className="w-full max-w-4xl mx-auto mt-8">
            {(() => {
              console.log('[DEBUG] Rendering displayedResults:', displayedResults);
              return null;
            })()}
            {error ? (
              <ThreadedSearchResult
                result={{
                  id: 'error-1',
                  title: 'SearchGPT Error',
                  content: 'I\'m unable to find reliable information at this time. Please try again later.',
                  confidence: 0,
                  category: 'Error',
                  timestamp: 'just now'
                }}
                onFollowUp={handleFollowUpSearch}
              />
            ) : (
              displayedResults.map(result => (
                <ThreadedSearchResult
                  key={result.id}
                  result={result}
                  onFollowUp={handleFollowUpSearch}
                />
              ))
            )}
          </div>
        )}
        {(isLoadingFromCache && displayedResults.length === 0) && (
          <div className="text-center mt-12">
            <div className="inline-flex items-center space-x-2 text-purple-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-lg font-medium">Loading from history...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchEngine;
