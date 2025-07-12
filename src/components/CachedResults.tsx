import React from 'react';
import { SearchResult } from '../types/search';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { logger } from '../utils/logger';

interface CachedResultsProps {
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
}

/**
 * Renders a list of quick cached search results.
 * Allows users to select a cached result to explore it further.
 * @param {CachedResultsProps} props - The component props.
 * @param {SearchResult[]} props.results - An array of cached search results to display.
 * @param {(result: SearchResult) => void} props.onSelectResult - Callback function when a cached result is selected.
 */
const CachedResults: React.FC<CachedResultsProps> = ({ results, onSelectResult }) => {
  if (!results || results.length === 0) {
    return null;
  }

  logger.log('Rendering CachedResults with:', results);

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-lg font-semibold text-primary">Quick Results from Cache</h3>
      {results.map((result) => (
        <Card key={result.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-medium text-foreground">
              {result.title || result.query}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {result.content}
            </p>
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logger.log('Selected cached result:', result.id);
                  onSelectResult(result);
                }}
              >
                Explore
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CachedResults;
