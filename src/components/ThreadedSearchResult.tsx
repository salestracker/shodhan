import React, { useState } from 'react';
import type { SearchResult } from './SearchEngine';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import SearchBar from './SearchBar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ThreadedSearchResultProps {
  result: SearchResult;
  onFollowUp: (parentId: string, query: string) => Promise<void>;
  depth?: number;
}

const ThreadedSearchResult: React.FC<ThreadedSearchResultProps> = ({ 
  result, 
  onFollowUp,
  depth = 0 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [followUpQuery, setFollowUpQuery] = useState('');

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;
    
    setIsLoading(true);
    try {
      await onFollowUp(result.id, followUpQuery);
      setFollowUpQuery('');
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (content: string) => {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose max-w-none">
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`relative ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-gray-200' : ''}`}>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>
              {result.parentId 
                ? `Follow-up: ${result.title.split('Follow-up question: ').pop() || result.title}`
                : result.title}
            </CardTitle>
            {result.replies?.length && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown /> : <ChevronRight />}
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{result.category}</Badge>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                result.confidence >= 90 ? 'bg-green-500' : 
                result.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-500">{result.confidence}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {formatContent(result.content)}
          <form onSubmit={handleFollowUp} className="mt-4 flex gap-2">
            <Input
              value={followUpQuery}
              onChange={(e) => setFollowUpQuery(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !followUpQuery.trim()}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Ask'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isExpanded && result.replies?.map((reply) => (
        <ThreadedSearchResult
          key={reply.id}
          result={reply}
          onFollowUp={onFollowUp}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

export default ThreadedSearchResult;
