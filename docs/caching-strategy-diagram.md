# Caching and Query Fetching Strategy Diagram

```mermaid
graph TD
    A[User Query] --> B{Check Local Cache}
    B -->|Cache Hit| C[Return Cached Results]
    B -->|Cache Miss| D[Generate SHA512 Hash]
    D --> E[Call Similarity Webhook]
    E --> F[Store Embedding in Supabase]
    F --> G[Poll for Cached Results]
    G -->|Found| H[Fetch from cacheUserResults]
    G -->|Not Found| I[Call DeepSeek API]
    H --> J[Display Top 5 Results]
    I --> J
    J --> K[Store in Local Cache]
    K --> L[Sync via Webhook]

    subgraph Local
        B
        K
    end

    subgraph Supabase
        F
        G
        H
    end

    subgraph External Services
        E
        I
    end

    style A fill:#f9f,stroke:#333
    style J fill:#bbf,stroke:#333
    style E fill:#f96,stroke:#333
    style I fill:#f96,stroke:#333
```

## Key Components

1. **Local Cache** (LocalStorage):
   - Stores recent search results with 24hr TTL
   - Maintains conversation threads
   - First check for query matches

2. **Supabase Cache**:
   - `cachedQueryResults`: Maps query hashes to cache entries
   - `cache`: Stores vector embeddings and metadata  
   - `cacheUserResults`: Contains actual content and sources

3. **Vector Similarity Flow**:
   - Webhook generates embeddings for new queries
   - Supabase performs vector similarity search
   - Returns top 5 most similar cached results

4. **Fallback to API**:
   - If no similar cached results found within 5 retries
   - Calls DeepSeek API for fresh results
   - Stores new results in both caches

5. **Sync Mechanism**:
   - Local cache changes synced to webhook
   - Ensures consistency across devices
