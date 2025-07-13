export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  resultId: string; // Reference to the cached SearchResult
}

export interface CacheResult {
  id: string;
  content: string;
  sources: string[];
  similarity: number;
}

export interface CacheSimilarityResponse {
  cached: boolean;
  results?: CacheResult[];
}

export interface SearchResult {
  id: string;
  query?: string; // Added query as optional property
  title: string;
  content: string;
  confidence: number;
  category: string;
  timestamp: string | number;
  sources?: string[] | null;
  parentId?: string;
  followUpQuery?: string;
  replies?: SearchResult[];
  isReplying?: boolean;
  isLoading?: boolean;
  isCached?: boolean;
  isFallback?: boolean;
  rootId?: string;
}
