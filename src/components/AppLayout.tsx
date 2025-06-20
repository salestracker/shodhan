import React, { useCallback } from 'react';
import SearchEngine from './SearchEngine';
import SearchHistory from './SearchHistory';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { logger } from '../utils/logger';
import { useAppContext } from '@/contexts/AppContext';

const AppLayout: React.FC = () => {
  const { isHistoryOpen, toggleHistory } = useAppContext();
  
  // This function will be passed from SearchEngine
  let handleHistoryClick: (historyId: string, query: string) => void = () => {
    logger.log("handleHistoryClick not yet initialized");
  };

  // Function to set the handleHistoryClick from SearchEngine
  const setHandleHistoryClick = (func: (historyId: string, query: string) => void) => {
    handleHistoryClick = func;
  };

  return (
    <div className="min-h-screen">
      <Sheet open={isHistoryOpen} onOpenChange={toggleHistory}>
        <SheetContent 
          side="left" 
          className="w-[350px] p-0"
          aria-describedby="history-description history-title"
        >
          <div className="h-full overflow-y-auto p-4">
            <SheetTitle className="text-lg font-semibold mb-4 p-4 border-b">
              Search History
              <span id="history-description" className="sr-only">List of previously searched queries that can be selected</span>
            </SheetTitle>
            <SearchHistory onSelect={(historyId, query) => {
              toggleHistory(); // Close the sheet
              handleHistoryClick(historyId, query); // Trigger the search
            }} />
          </div>
        </SheetContent>
        <SearchEngine setHandleHistoryClick={setHandleHistoryClick} />
      </Sheet>
    </div>
  );
};

export default AppLayout;
