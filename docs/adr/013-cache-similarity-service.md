# ADR 013: Cache Similarity Service Implementation

## Status
Accepted

## Context
To improve search performance and reduce redundant API calls, a mechanism is needed to find and serve similar, previously cached search results. This builds upon the initial caching strategy in ADR-004 by introducing vector-based similarity matching.

## Decision
Implement a `cacheSimilarityService` that:
1.  Receives a user query and triggers an external webhook to generate and store vector embeddings.
2.  Polls a Supabase table (`cachedQueryResults`) for a matching query hash, which indicates the embedding process is complete.
3.  Retrieves the full cached results from `cacheUserResults` and `cache` tables.
4.  Returns the top 5 most relevant results to be displayed to the user.

## Rationale
-   **Reduces Latency**: Serving cached results is significantly faster than making live API calls to the LLM.
-   **Lowers API Costs**: Minimizes the number of calls to the DeepSeek API, reducing operational expenses.
-   **Improves User Experience**: Provides near-instantaneous results for common or similar queries.
-   **Leverages Existing Infrastructure**: Utilizes the existing Supabase backend and extends it with `pgvector` capabilities.

## Consequences
-   **Increased Complexity**: Introduces a new service and a polling mechanism, adding complexity to the search workflow.
-   **Dependency on External Webhook**: The system now relies on an external Make.com webhook for embedding generation, which could be a point of failure.
-   **Data Consistency**: Requires careful management to ensure that the vector cache remains consistent with the primary data store.
-   **Configuration Management**: Adds new environment variables (`VITE_CACHE_SIMILARITY_QUERY`, `VITE_CACHE_SIMILARITY_API_KEY`) that must be configured correctly.

## Related ADRs
-   [ADR-004: Search Caching Strategy](004-search-caching-strategy.md)
-   [ADR-011: Anonymous User Sign-In](011-anonymous-user-sign-in.md)
