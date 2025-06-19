export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  resultId: string; // Reference to the cached SearchResult
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  confidence: number;
  category: string;
  timestamp: string | number;
  sources?: string;
  parentId?: string;
  followUpQuery?: string;
  replies?: SearchResult[];
  isReplying?: boolean;
}
