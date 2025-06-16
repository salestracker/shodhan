import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  confidence: number;
  category: string;
  timestamp: string;
  sources?: string;
  parentId?: string;
  followUpQuery?: string;
  replies?: SearchResult[];
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, query }) => {
  console.log('[DEBUG] SearchResults render - query:', query);
  console.log('[DEBUG] SearchResults render - results count:', results.length);
  console.log('[DEBUG] SearchResults render - first result:', results[0]?.title);
  
  if (results.length === 0) {
    console.log('[DEBUG] No results to render - returning null');
    return null;
  }

  // Add a unique key to force re-render when results change
  const resultsKey = results.map(r => r.id).join('-');
  console.log('[DEBUG] Results key:', resultsKey);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500';
    if (confidence >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'trending': return <TrendingUp className="h-4 w-4" />;
      case 'recent': return <Clock className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const formatContent = (content: string, sources?: string) => {
    // Parse sources into a map if they exist
    const sourceMap = new Map<string, string>();
    if (sources) {
      sources.split('\n').forEach(line => {
        const match = line.match(/^\[(\d+)\](.*)/);
        if (match) {
          sourceMap.set(match[1], match[2].trim());
        }
      });
    }

    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        className="markdown-preview"
        components={{
          text: ({node, children}) => {
            // Match citation patterns like [1] or [2][3]
            const citationMatches = String(children).match(/\[(\d+)\]/g);
            if (!citationMatches || !sourceMap.size) {
              return <>{children}</>;
            }

            let result = String(children);
            citationMatches.forEach(match => {
              const num = match.replace(/[[\]]/g, '');
              const source = sourceMap.get(num);
              if (source) {
                result = result.replace(
                  match,
                  `[${num}]`
                );
              }
            });

            return (
              <>
                {result.split(/(\[\d+\])/).map((part, i) => {
                  const citationMatch = part.match(/\[(\d+)\]/);
                  if (citationMatch && sourceMap.has(citationMatch[1])) {
                    const num = citationMatch[1];
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center px-1 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer text-xs font-medium">
                            [{num}]
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{sourceMap.get(num)}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const formatSources = (sources: string) => {
    if (!sources) return null;
    
    const sourceLines = sources.split('\n').filter(line => line.trim());
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
          <ExternalLink className="h-4 w-4 mr-1" />
          Sources:
        </h4>
        <div className="space-y-1">
          {sourceLines.map((source, index) => {
            const urlMatch = source.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              return (
                <div key={index} className="text-sm">
                  <a 
                    href={urlMatch[0]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {source}
                  </a>
                </div>
              );
            }
            return <div key={index} className="text-sm text-gray-600">{source}</div>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          SearchGPT Results for "{query}"
        </h2>
        <p className="text-gray-600 mt-2">{results.length} intelligent answers found</p>
      </div>
      
      <div key={resultsKey} className="grid gap-6">
        {results.map((result) => (
          <Card 
            key={`${result.id}-${resultsKey}`}
            className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500 hover:border-l-blue-500"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
                  {result.title}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    {getCategoryIcon(result.category)}
                    <span>{result.category}</span>
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${getConfidenceColor(result.confidence)}`}></div>
                    <span className="text-xs text-gray-500">{result.confidence}%</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formatContent(result.content, result.sources)}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                Generated {result.timestamp}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
