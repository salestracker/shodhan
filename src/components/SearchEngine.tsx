import React, { useState, useEffect, useCallback } from 'react';
import SearchResults from './SearchResults';
import { getSearchHistory, getConversationThread } from '@/services/cacheService';
import { useAppContext } from '@/contexts/AppContext';
import { Home, Brain, History, Sparkles } from 'lucide-react';
import SearchBar from './SearchBar';
import { searchWithDeepSeek } from '@/services/searchService';
import type { SearchResult } from '../types/search';
import { logger } from '../utils/logger';

export interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

interface SearchEngineProps {
  setHandleHistoryClick?: (func: (historyId: string, query: string) => void) => void;
}

const SearchEngine: React.FC<SearchEngineProps> = ({ setHandleHistoryClick }) => {
  const { toggleHistory, addToHistory, user } = useAppContext();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [currentSearchResult, setCurrentSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Load history items on component mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getSearchHistory();
        setHistoryItems(history);
        logger.log("History loaded:", history);
      } catch (error) {
        logger.error("Failed to load history:", error);
      }
    };
    
    loadHistory();
  }, []);

  // Handle new searches
  const handleSearch = async (query: string, parentResult?: SearchResult) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setCurrentSearchResult(null);
    setSelectedHistoryId(null);
    
    try {
      const { cachedResults, apiResults } = await searchWithDeepSeek(query, parentResult, user?.id);
      
      // Prioritize cached results if available, otherwise use API results
      const results = cachedResults.length > 0 ? cachedResults : apiResults;
      
      if (results.length > 0) {
        const [firstResult, ...remainingResults] = results;
        setCurrentSearchResult({
          ...firstResult,
          replies: [...(firstResult.replies || []), ...remainingResults],
          isCached: cachedResults.length > 0 // Mark if result came from cache
        });
        // Add to search history
        addToHistory({
          id: firstResult.id,
          query: query,
          timestamp: Date.now(),
          resultId: firstResult.id
        });
      }
    } catch (error) {
      logger.error('Search failed:', error);
      setCurrentSearchResult({
        id: `error-${Date.now()}`,
        title: `SearchGPT: ${query}`,
        content: 'Failed to get search results. Please try again.',
        confidence: 0,
        category: 'Error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle follow-up searches
  const handleFollowUpSearch = async (parentId: string, query: string) => {
    if (!query.trim() || !currentSearchResult) return;
    
    // Set isReplying on the current result to show localized loading
    const updatedResultWithLoading = {
      ...currentSearchResult,
      isReplying: true
    };
    setCurrentSearchResult(updatedResultWithLoading);
    
    try {
      const { cachedResults, apiResults } = await searchWithDeepSeek(query, currentSearchResult, user?.id);
      
      // Prioritize cached results if available, otherwise use API results
      const results = cachedResults.length > 0 ? cachedResults : apiResults;
      
      if (results.length > 0) {
        // Add the follow-up results as replies to the current result
        const updatedResult = {
          ...currentSearchResult,
          replies: [...(currentSearchResult.replies || []), ...results.map(r => ({
            ...r,
            isCached: cachedResults.length > 0 // Mark if reply came from cache
          }))],
          isReplying: false
        };
        setCurrentSearchResult(updatedResult);
        setForceUpdate(prev => prev + 1); // Force re-render
      }
    } catch (error) {
      logger.error('Follow-up search failed:', error);
      // Reset isReplying on error
      setCurrentSearchResult({
        ...currentSearchResult,
        isReplying: false
      });
      setForceUpdate(prev => prev + 1); // Force re-render on error
    }
  };

  // Handle history item click
  const handleHistoryClick = useCallback((historyId: string, query: string) => {
    logger.log(`History item clicked: ${historyId}`);
    // Use the same search logic as a new query to leverage built-in caching
    handleSearch(query);
  }, [handleSearch]);

  // Set the handleHistoryClick function for AppLayout to use
  useEffect(() => {
    if (setHandleHistoryClick) {
      setHandleHistoryClick(handleHistoryClick);
    }
  }, [handleHistoryClick, setHandleHistoryClick]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-6 px-4">
            <button 
              onClick={() => setCurrentSearchResult(null)}
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
        </div>

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {isLoading && (
          <div className="text-center mt-12">
            <div className="inline-flex items-center space-x-2 text-purple-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-lg font-medium">SearchGPT is analyzing...</span>
            </div>
          </div>
        )}

        <SearchResults 
          result={currentSearchResult} 
          isLoading={isLoading}
          key={`${currentSearchResult?.id || 'empty'}-${forceUpdate}`}
          onFollowUp={handleFollowUpSearch}
        />
      </div>
    </div>
  );
};

export default SearchEngine;
