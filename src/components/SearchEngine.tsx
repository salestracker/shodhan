import React, { useState, useEffect, useCallback } from 'react';
import SearchResults from './SearchResults';
import { getSearchHistory, getConversationThread } from '@/services/cacheService';
import { useAppContext } from '@/contexts/AppContext';
import { Home, Brain, History, Sparkles } from 'lucide-react';
import SearchBar from './SearchBar';

export type SearchResult = {
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
};

export const SearchResultType = {
  id: '',
  title: '',
  content: '',
  confidence: 0,
  category: '',
  timestamp: '',
  sources: undefined,
  parentId: undefined,
  followUpQuery: undefined,
  replies: undefined
};

export interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

const SearchEngine: React.FC = () => {
  const { toggleHistory } = useAppContext();
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
        console.log("History loaded:", history);
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    };
    
    loadHistory();
  }, []);

  // Handle history item click
  const handleHistoryClick = useCallback(async (historyId: string) => {
    console.log(`History item clicked: ${historyId}`);
    setSelectedHistoryId(historyId);
    setIsLoading(true);
    setCurrentSearchResult(null);
    
    try {
      const fullResult = await getConversationThread(historyId);
      console.log("Retrieved cached result:", fullResult);
      
      if (fullResult) {
        setTimeout(() => {
          setCurrentSearchResult({...fullResult});
          setForceUpdate(prev => prev + 1);
        }, 0);
      } else {
        console.warn(`No cached result found for ID: ${historyId}`);
      }
    } catch (error) {
      console.error(`Error retrieving cached result for ${historyId}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle new searches
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setCurrentSearchResult(null);
    setSelectedHistoryId(null);
    
    // TODO: Implement actual search functionality
    // For now just create a mock result
    const mockResult = {
      id: Date.now().toString(),
      title: `SearchGPT: ${query}`,
      content: `Here are the results for your query "${query}":\n\n1. Example result 1\n2. Example result 2\n3. Example result 3`,
      confidence: 95,
      category: 'SearchGPT',
      timestamp: new Date().toISOString()
    };
    setCurrentSearchResult(mockResult);
    setIsLoading(false);
  };

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
        />
      </div>
    </div>
  );
};

export default SearchEngine;
