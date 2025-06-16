import React, { useEffect } from 'react';
import { SearchResult } from './SearchEngine';
import './SearchResults.css';

interface SearchResultsProps {
  result: SearchResult | null;
  isLoading: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({ result, isLoading }) => {
  useEffect(() => {
    console.log("SearchResults rendered with result:", result);
  }, [result]);

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

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {result.title}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {result.timestamp}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
              {result.category}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              result.confidence >= 90 ? 'bg-green-100 text-green-800' :
              result.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            }`}>
              {result.confidence}% confidence
            </span>
          </div>
        </div>
        <div className="prose max-w-none">
          {result.content}
        </div>
      </div>
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
