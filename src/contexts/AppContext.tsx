import React, { createContext, useContext, useState, useCallback } from 'react';
import { getSearchHistory, saveSearchHistoryItem } from '../services/cacheService';
import { SearchHistoryItem } from '../types/search';

interface AppContextType {
  searchHistory: SearchHistoryItem[];
  addToHistory: (item: SearchHistoryItem) => void;
  loadHistory: () => Promise<void>;
  resetSearch: () => void;
  isHistoryOpen: boolean;
  toggleHistory: () => void;
}

const defaultAppContext: AppContextType = {
  searchHistory: [],
  addToHistory: () => {},
  loadHistory: async () => {},
  resetSearch: () => {},
  isHistoryOpen: false,
  toggleHistory: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const toggleHistory = useCallback(() => setIsHistoryOpen(prev => !prev), []);

  const addToHistory = useCallback(async (item: SearchHistoryItem) => {
    setSearchHistory(prev => {
      // Find if an item with the same query already exists
      const existingIndex = prev.findIndex(h => h.query === item.query);
      let updatedHistory: SearchHistoryItem[];

      if (existingIndex > -1) {
        // If exists, update its timestamp and resultId, and move it to the top
        const existingItem = prev[existingIndex];
        const updatedItem = {
          ...existingItem,
          timestamp: Date.now(), // Update timestamp to bring it to the top
          resultId: item.resultId, // Update resultId in case it changed
          id: item.id // Update id (which is resultId) in case it changed
        };
        updatedHistory = [
          updatedItem,
          ...prev.filter((_, index) => index !== existingIndex)
        ];
      } else {
        // If not exists, add the new item
        updatedHistory = [item, ...prev];
      }
      // Keep only the last 50 items
      return updatedHistory.slice(0, 50);
    });
    await saveSearchHistoryItem(item); // Persist to localStorage immediately
  }, []);

  const loadHistory = useCallback(async () => {
    const history = await getSearchHistory();
    setSearchHistory(history);
  }, []);

  const resetSearch = useCallback(() => {
    setSearchHistory([]);
    // Optionally clear history from localStorage as well
    // clearSearchHistory(); 
  }, []);

  return (
    <AppContext.Provider
      value={{
        searchHistory,
        addToHistory,
        loadHistory,
        resetSearch,
        isHistoryOpen,
        toggleHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
