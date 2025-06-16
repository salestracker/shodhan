export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  resultId: string; // Reference to the cached SearchResult
}
