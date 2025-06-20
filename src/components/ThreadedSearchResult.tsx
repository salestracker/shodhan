import React, { useState } from 'react';
import type { SearchResult } from '@/types/search';
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

  const formatContent = (content: string, sources?: string) => {
    // Parse sources to create a map of citation numbers to URLs
    const citationMap: { [key: string]: string } = {};
    if (sources) {
      const lines = sources.split('\n');
      lines.forEach(line => {
        const match = line.match(/^\[(\d+)\]\s*(?:\[.*?\]\((.*?)\)|.*)/);
        if (match) {
          const citationNumber = match[1];
          const url = match[2] || '#'; // Default to '#' if no URL is found
          citationMap[citationNumber] = url;
        }
      });
    }
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }: { href: string; children: React.ReactNode }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {children}
            </a>
          ),
          ul: ({ children }: { children: React.ReactNode }) => (
            <ul className="list-disc pl-5 space-y-1">{children}</ul>
          ),
          ol: ({ children }: { children: React.ReactNode }) => (
            <ol className="list-decimal pl-5 space-y-1">{children}</ol>
          ),
          li: ({ children }: { children: React.ReactNode }) => (
            <li className="ml-2">{children}</li>
          ),
          text: ({ value }: { value: string }) => {
            // Replace citation numbers with superscript hyperlinks
            return value.replace(/\[(\d+)\]/g, (match, number) => {
              const url = citationMap[number] || '#';
              return `<sup><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">[${number}]</a></sup>`;
            });
          }
        }}
      >
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
          {formatContent(result.content, result.sources)}
          <form onSubmit={handleFollowUp} className="mt-4 flex gap-2">
            <Input
              value={followUpQuery}
              onChange={(e) => setFollowUpQuery(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={isLoading || result.isReplying}
            />
            <Button type="submit" disabled={isLoading || result.isReplying || !followUpQuery.trim()}>
              {isLoading || result.isReplying ? <Loader2 className="animate-spin mr-2" /> : 'Ask'}
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
