import React from 'react';
import type { SearchResult } from '../types/search';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface CachedResultsProps {
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
}

const CachedResults: React.FC<CachedResultsProps> = ({ results, onSelectResult }) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Similar Previously Seen Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{result.query}</h4>
                <p className="text-sm text-muted-foreground truncate max-w-md">{result.content}</p>
              </div>
              <Button onClick={() => onSelectResult(result)}>View</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CachedResults;
