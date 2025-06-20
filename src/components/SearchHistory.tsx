import React, { useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { SearchHistoryItem } from '@/types/search';
import { Button } from './ui/button';
import { History } from 'lucide-react';
import { logger } from '../utils/logger';

interface SearchHistoryProps {
  onSelect: (id: string, query: string) => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ onSelect }) => {
  const { searchHistory, loadHistory } = useAppContext();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center mb-2 text-gray-600">
        <History className="h-5 w-5 mr-2" />
        <h3 className="font-medium">Recent Searches</h3>
      </div>
      <div className="space-y-2">
        {searchHistory.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className="w-full justify-start text-left text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              logger.log('[DEBUG] History item clicked:', item);
              onSelect(item.id, item.query);
            }}
          >
            {item.query}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
