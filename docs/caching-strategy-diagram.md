# Caching and Query Fetching Strategy Diagram

```mermaid
flowchart TD
 subgraph subGraph0["Step 1: User"]
        U1["Submit Query:\nGraphQL best practices"]
  end
 subgraph subGraph1["Step 2: Browser Cache"]
        E1["Check Exact Cache\n(LocalStorage)"]
        D1{"Exact Cache hit?"}
        S2["Check Semantic Cache\n(Supabase HNSW)"]
        D2{"Semantic Cache hit?"}
        C1["Display cached results"]
        W1["Trigger webhook to no-code orchestration pipeline"]
  end
 subgraph subGraph2["Step 3: no-code pipeline"]
        M1["Receive webhook\n(query, user_id)"]
        M2["Generate embedding"]
        M3{"Vector search\n(Supabase HNSW)?"}
        M4["Return similar results"]
        M5["Call DeepSeek API"]
        M6["Store embeddings & results\n(in Supabase)"]
  end
 subgraph subGraph3["Step 4: Sync & Display"]
        B1["Background sync\n(Service Worker)"]
        D3["Display API results"]
  end
    U1 --> E1
    E1 --> D1
    D1 -- Yes --> C1
    C1 --> B1
    B1 --> endC(["End"])
    D1 -- No --> S2
    S2 --> D2
    D2 -- Yes --> C1
    D2 -- No --> W1
    W1 --> M1
    M1 --> M2
    M2 --> M3
    M3 -- Hit --> M4
    M4 --> B1
    M3 -- Miss --> M5
    M5 --> M6
    M6 --> B1
    B1 --> D3
    D3 --> endD(["End"])
```

## Key Components

1.  **Dual-Phase Cache Check**:
    *   **Exact Cache (LocalStorage)**: First, the browser checks for an exact match in the local storage. If found, results are displayed instantly.
    *   **Semantic Cache (Supabase HNSW)**: If no exact match is found, a semantic search is performed against the vector database in Supabase.

2.  **No-Code Orchestration (Make.com)**:
    *   If no cache hits occur, a webhook triggers a Make.com pipeline.
    *   The pipeline generates embeddings, performs a vector search, and if necessary, calls the DeepSeek API for a fresh search.
    *   New results and their embeddings are stored in Supabase.

3.  **Background Sync (Service Worker)**:
    *   The Service Worker ensures that new results (either from cache or the API) are synced in the background.
    *   This keeps the local and remote caches consistent and provides a seamless user experience.
