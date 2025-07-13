# Caching and Query Fetching Strategy Diagram

```mermaid
graph TD
    A[User Query] --> B{Local Cache Check};
    B -->|Hit| C[Display Cached Results];
    B -->|Miss| D{Vector Similarity Check}:::vector-node;
    D -->|Similar Found| E[Display Cached Results];
    D -->|None Found| F[Call DeepSeek API];
    F --> G[Display API Results];
    G --> H[Store New Embeddings]:::supabase-node;
    H --> I[Background Sync]:::sw-node;
    C --> J[End];
    E --> J;
    I --> J;

    classDef vector-node fill:#f9d5e5,stroke:#ff6b6b;
    classDef supabase-node fill:#c0d8f7,stroke:#3b82f6;
    classDef sw-node fill:#d1f7c0,stroke:#22c55e;

    subgraph "Local Client"
        B;
        C;
    end

    subgraph "Supabase Backend"
        D;
        H;
    end

    subgraph "External Services"
        F;
    end

    subgraph "Service Worker"
        I;
    end

    style A fill:#f9f,stroke:#333;
    style J fill:#bbf,stroke:#333;
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
   - Supabase performs vector similarity search using HNSW index.
   - Returns top 5 most similar cached results.
   - See [ADR-013](adr/013-cache-similarity-service.md) for details.

4. **Fallback to API**:
   - If no similar cached results found within 5 retries
   - Calls DeepSeek API for fresh results
   - Stores new results in both caches

5. **Sync Mechanism**:
   - Local cache changes synced to webhook via Service Worker.
   - Uses Workbox BackgroundSyncPlugin for reliability.
   - Ensures consistency across devices.
   - See [cache-sync-implementation.md](cache-sync-implementation.md) for details.
