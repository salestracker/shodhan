import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getSearchHistory, saveSearchHistoryItem } from '../services/cacheService';
import { SearchHistoryItem } from '../types/search';
import { signInAnonymously, supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface User {
  id: string;
  is_anonymous: boolean;
}

interface AppContextType {
  searchHistory: SearchHistoryItem[];
  addToHistory: (item: SearchHistoryItem) => void;
  loadHistory: () => Promise<void>;
  resetSearch: () => void;
  isHistoryOpen: boolean;
  toggleHistory: () => void;
  user: User | null;
  setUser: (user: User | null) => void;
  fingerprintId: string | null;
  resetFingerprintId: () => void;
  handleAnonymousSignIn: () => Promise<void>;
}

const defaultAppContext: AppContextType = {
  searchHistory: [],
  addToHistory: () => {},
  loadHistory: async () => {},
  resetSearch: () => {},
  isHistoryOpen: false,
  toggleHistory: () => {},
  user: null,
  setUser: () => {},
  fingerprintId: null,
  resetFingerprintId: () => {},
  handleAnonymousSignIn: async () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [fingerprintId, setFingerprintId] = useState<string | null>(null);
  const toggleHistory = useCallback(() => setIsHistoryOpen(prev => !prev), []);

  const resetFingerprintId = useCallback(() => {
    localStorage.removeItem('searchGptFingerprintId');
    const newFingerprintId = uuid.v4();
    localStorage.setItem('searchGptFingerprintId', newFingerprintId);
    setFingerprintId(newFingerprintId);
    logger.log('Fingerprint ID reset to:', newFingerprintId);
  }, []);

  useEffect(() => {
    // Check for existing session before prompting for sign-in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        logger.log('Existing session found for user ID:', session.user.id);
        setUser({
          id: session.user.id,
          is_anonymous: session.user.is_anonymous !== undefined ? session.user.is_anonymous : false
        });
      } else {
        // No existing session, do not automatically sign in anonymously
        logger.log('No existing session found, waiting for user to choose anonymous sign-in');
        // User state remains null until user chooses to sign in
      }
    };
    checkSession();

    // Check for existing fingerprint ID or generate a new one
    let storedFingerprintId = localStorage.getItem('searchGptFingerprintId');
    if (!storedFingerprintId) {
      storedFingerprintId = uuid.v4();
      localStorage.setItem('searchGptFingerprintId', storedFingerprintId);
      logger.log('New fingerprint ID generated:', storedFingerprintId);
    } else {
      logger.log('Existing fingerprint ID found:', storedFingerprintId);
    }
    setFingerprintId(storedFingerprintId);
  }, []);

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

  const handleAnonymousSignIn = useCallback(async () => {
    try {
      const anonymousUser = await signInAnonymously();
      if (anonymousUser) {
        logger.log('Signed in anonymously with user ID:', anonymousUser.id);
        setUser({
          id: anonymousUser.id,
          is_anonymous: true // Explicitly set to true since this is anonymous sign-in path
        });
      } else {
        logger.error('Failed to sign in anonymously');
      }
    } catch (error) {
      logger.error('Error during anonymous sign-in:', error);
    }
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
        user,
        setUser,
        fingerprintId,
        resetFingerprintId,
        handleAnonymousSignIn
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
