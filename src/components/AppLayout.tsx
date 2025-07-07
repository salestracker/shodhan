import React, { useCallback } from 'react';
import SearchEngine from './SearchEngine';
import SearchHistory from './SearchHistory';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { logger } from '../utils/logger';
import { useAppContext } from '@/contexts/AppContext';

const AppLayout: React.FC = () => {
  const { isHistoryOpen, toggleHistory, user, handleAnonymousSignIn } = useAppContext();
  
  // This function will be passed from SearchEngine
  let handleHistoryClick: (historyId: string, query: string) => void = () => {
    logger.log("handleHistoryClick not yet initialized");
  };

  // Function to set the handleHistoryClick from SearchEngine
  const setHandleHistoryClick = (func: (historyId: string, query: string) => void) => {
    handleHistoryClick = func;
  };

  return (
    <div className="flex flex-col min-h-screen">
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
        <div className="relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {user ? (
              user.is_anonymous && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="bg-background text-foreground">
                      Anonymous
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>You are signed in anonymously for this session.</TooltipContent>
                </Tooltip>
              )
            ) : (
              <button
                onClick={handleAnonymousSignIn}
                className="text-sm px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In Anonymously
              </button>
            )}
          </div>
          <SearchEngine setHandleHistoryClick={setHandleHistoryClick} />
        </div>
      </Sheet>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        Made in India
      </footer>
    </div>
  );
};

export default AppLayout;
