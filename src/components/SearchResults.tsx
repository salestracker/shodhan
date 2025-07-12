import React, { useEffect, useState, useMemo } from 'react';
import type { SearchResult } from '../types/search';
import './SearchResults.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { logger } from '../utils/logger';
import ThreadedSearchResult from './ThreadedSearchResult';
import CachedResults from './CachedResults';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface SearchResultsProps {
  result: SearchResult | null;
  isLoading: boolean;
  onFollowUp?: (parentId: string, query: string) => Promise<void>;
}

const SearchResults: React.FC<SearchResultsProps> = ({ result, isLoading, onFollowUp }) => {
  const [followUpQuery, setFollowUpQuery] = useState<string>('');
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null);
  
  useEffect(() => {
    logger.log("SearchResults rendered with result:", result);
    if (result) {
      setActiveResult(result);
    }
  }, [result]);

  // Parse sources to create a map of citation numbers to URLs
  const citationMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    if (activeResult && activeResult.sources) {
      // Handle both string[] and string cases for sources
      const sourcesArray = Array.isArray(activeResult.sources) 
        ? activeResult.sources 
        : [activeResult.sources];
      
      sourcesArray.forEach(source => {
        const lines = source.split('\n');
        lines.forEach(line => {
          const match = line.match(/^\[(\d+)\]\s*(?:\[.*?\]\((.*?)\)|.*)/);
          if (match) {
            const citationNumber = match[1];
            const url = match[2] || '#'; // Default to '#' if no URL is found
            map[citationNumber] = url;
          }
        });
      });
    }
    return map;
  }, [activeResult]);

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpQuery.trim() && onFollowUp && activeResult) {
      logger.log("Submitting follow-up query for result ID:", activeResult.id, "Query:", followUpQuery);
      await onFollowUp(activeResult.id, followUpQuery);
      setFollowUpQuery('');
    } else {
      logger.log("Follow-up submission blocked. onFollowUp:", !!onFollowUp, "result:", !!activeResult, "query:", followUpQuery);
    }
  };

  const handleResultSelect = (selectedResult: SearchResult) => {
    setActiveResult(selectedResult);
  };

  if (isLoading) {
    return (
      <div className="text-center mt-12">
        <div className="inline-flex items-center space-x-2 text-purple-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className="text-lg font-medium">Loading results...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mt-12 max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <p className="text-2xl font-medium text-center mb-6 italic text-purple-600">
          "New wine in an old bottle"
        </p>
        <ul className="space-y-4 text-gray-700">
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 text-purple-600 mr-3">•</div>
            <span><strong>Conversational Search:</strong> Ask questions in plain English</span>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 text-purple-600 mr-3">•</div>
            <span><strong>Source Transparency:</strong> Answers with citations</span>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 text-purple-600 mr-3">•</div>
            <span><strong>Real-Time Updates:</strong> Powered by GenAI</span>
          </li>
        </ul>
      </div>
    );
  }

  // Check if there are multiple cached results to display
  const cachedResults = result.isCached ? [result, ...(result.replies || [])] : [];

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      {cachedResults.length > 1 && (
        <div className="mb-4">
          <CachedResults 
            results={cachedResults}
            onSelectResult={handleResultSelect}
          />
        </div>
      )}
      {activeResult && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {activeResult.title}
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {activeResult.timestamp}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                {activeResult.category}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                activeResult.confidence >= 90 ? 'bg-green-100 text-green-800' :
                activeResult.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {activeResult.confidence}% confidence
              </span>
            </div>
          </div>
          <div className="prose max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
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
              {activeResult.content}
            </ReactMarkdown>
          </div>
          <div className="mt-4">
            <form onSubmit={handleFollowUpSubmit} className="flex gap-2">
              <Input
                type="text"
                value={followUpQuery}
                onChange={(e) => setFollowUpQuery(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-1"
              />
              <Button type="submit" disabled={!followUpQuery.trim()}>
                Ask
              </Button>
            </form>
          </div>
          {activeResult.replies && activeResult.replies.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Follow-up Responses</h3>
              {activeResult.replies.map((reply, index) => (
                <ThreadedSearchResult 
                  key={index} 
                  result={reply} 
                  onFollowUp={onFollowUp}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(
  SearchResults,
  (prevProps, nextProps) => {
    return (
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.result?.id === nextProps.result?.id &&
      prevProps.result?.content === nextProps.result?.content
    );
  }
);
