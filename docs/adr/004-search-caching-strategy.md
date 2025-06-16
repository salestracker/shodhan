# ADR 004: Search Caching Strategy Implementation

## Status
Accepted

## Context
The search engine required improvements to:
- Reduce redundant API calls for repeated queries
- Maintain conversation thread context
- Improve performance for follow-up questions
- Handle query resets properly

## Decision
Implement a comprehensive caching strategy using:
1. **LocalStorage-based cache** with TTL (24 hours)
2. **Consistent query hashing** for cache keys
3. **Threaded cache structure** maintaining parent-child relationships
4. **Cache invalidation** on query reset

## Rationale
1. **Performance**:
   - Eliminates redundant API calls for repeated queries
   - Faster response times for cached results
2. **User Experience**:
   - Maintains conversation context between sessions
   - Preserves follow-up question relationships
3. **Technical Implementation**:
   - Simple localStorage integration
   - Lightweight hashing for consistent keys
   - Clear cache structure mirroring UI threads
4. **Reliability**:
   - Automatic cache expiration prevents staleness
   - Graceful fallback to API when cache misses

## Consequences
- Added complexity in search service
- Need to manage cache size and expiration
- Additional state synchronization requirements
- ~5-10% bundle size increase for caching utilities
- Requires proper cache invalidation logic

## Recent Changes and Pending Issues (June 16, 2025)

### Changes Made:
- **Type Consistency**: Standardized the `SearchResult` interface across components
- **Debug Logging**: Added comprehensive logging for cache operations
- **handleSearch Refinement**: Modified to prevent useQuery from re-fetching cached results
- **State Management**: Separated results state from useQuery data

### Pending Issues:
- **Cached History Rendering**: Results from history clicks not displaying despite correct state updates
- **Race Conditions**: Potential timing issues between cache loading and UI rendering
- **Error Handling**: Need better error recovery for corrupted cache entries

## Implementation Details
Key components modified:
1. `cacheService.ts` - Core caching logic
2. `searchService.ts` - Cache integration
3. `SearchEngine.tsx` - Cache-aware query handling

Cache behavior:
- Root queries: `root-[queryHash]`
- Follow-ups: `[parentId]-[timestamp]`
- Thread structure preserved via `parentId`/`replies`
