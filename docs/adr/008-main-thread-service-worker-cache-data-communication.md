# ADR 008: Main Thread-Service Worker Cache Data Communication

## Status
Accepted

## Context
During the development of the SearchGPT project, an issue was identified in the communication between the main thread and the Service Worker regarding cache data synchronization. The main thread in `src/main.tsx` was sending `SearchResult` objects to the Service Worker using the `getAllSearchResults()` method from `cacheService.ts`. However, `SearchResult` objects lacked the top-level `timestamp` property necessary for the Service Worker's filtering logic to determine which entries were new since the last sync. This mismatch prevented accurate filtering based on timestamps, leading to potential sync failures or duplicate data being sent to the webhook, undermining the efficiency and correctness of SearchGPT's cache synchronization mechanism.

## Decision
To address the data structure mismatch between the main thread and the Service Worker, the following change was implemented:
- Update `src/main.tsx` to use `getAllCacheEntries()` instead of `getAllSearchResults()` when responding to the Service Worker's request for cache data.
- Ensure the import statement in `src/main.tsx` correctly references `getAllCacheEntries` from `cacheService.ts`, which returns `CacheEntryForSync` objects that include the necessary top-level `timestamp` property for filtering.

## Rationale
1. **Correct Data Structure**: The `getAllCacheEntries()` method returns `CacheEntryForSync` objects, which include a top-level `timestamp` property critical for the Service Worker's filtering logic to compare against the `lastSyncTimestamp` and identify new entries for synchronization.
2. **Prevent Sync Errors**: Using the appropriate data structure ensures that the Service Worker can accurately filter cache entries, avoiding issues like sending duplicate data or missing new entries, thereby maintaining the integrity of the cache synchronization process.
3. **Consistency Across Layers**: This decision aligns the data flow between the main thread and Service Worker, ensuring consistent handling of cache data throughout the application, which is essential for reliable operation of SearchGPT's instant recall feature.
4. **Simple and Targeted Fix**: The change involves a straightforward update to a function call in `src/main.tsx`, addressing the root cause without requiring extensive refactoring or additional complexity.

## Consequences
- **Code Update Requirement**: Developers must ensure that any future modifications to cache data handling in `src/main.tsx` continue to use `getAllCacheEntries()` for Service Worker communication to maintain consistency in data structure.
- **Potential for Oversight**: If new developers are unaware of this decision, they might inadvertently revert to using `getAllSearchResults()` or a similar method lacking the required properties, reintroducing the issue. Documentation and code comments are necessary to prevent such regressions.
- **Enhanced Data Validation**: While this change resolves the immediate issue, it highlights the need for potential additional validation or logging in the Service Worker to confirm the structure of received data, adding a layer of robustness against future mismatches.

## Implementation Details
Key changes implemented:
1. **Function Update**: Modified `src/main.tsx` to replace the call to `getAllSearchResults()` with `getAllCacheEntries()` in the message handler that responds to the Service Worker's `REQUEST_CACHE_DATA` message type. This ensures that the data sent to the Service Worker includes the top-level `timestamp` property.
2. **Import Verification**: Confirmed that the import statement in `src/main.tsx` correctly imports `getAllCacheEntries` from `../services/cacheService.ts`, aligning with the existing codebase structure.

This decision resolved the data structure mismatch, enabling the Service Worker to receive `CacheEntryForSync` objects with the necessary timestamp information for accurate filtering and synchronization, thereby restoring the full functionality of SearchGPT's cache synchronization system.
