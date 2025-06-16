import React from 'react';
import SearchEngine from './SearchEngine';
import SearchHistory from './SearchHistory';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { useAppContext } from '@/contexts/AppContext';

const AppLayout: React.FC = () => {
  const { isHistoryOpen, toggleHistory } = useAppContext();

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
            <SearchHistory onSelect={(query, resultId) => {
              toggleHistory(); // Close the sheet
              // The actual search will be handled by the SearchEngine component
            }} />
          </div>
        </SheetContent>
        <SearchEngine />
      </Sheet>
    </div>
  );
};

export default AppLayout;
