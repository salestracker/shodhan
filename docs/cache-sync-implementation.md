# Cache Sync Implementation for SearchGPT

## Overview

This document provides a technical overview of the cache synchronization mechanism implemented in the SearchGPT project. This system is designed to collect, deduplicate, and persist anonymous, fingerprinted search results for instant recall, leveraging a Service Worker with Workbox for robust background sync. It is intended for new developers onboarding to the project to understand the architecture, usage, debugging, and troubleshooting processes.

## Related Systems

- Supabase authentication (using environment variables)
- LocalStorage caching  
- [Quick Cached Results](quick-cached-results-implementation.md) (vector similarity search)

## Vector Search Integration
The vector similarity check shown in Figure 1 ([Caching Strategy Diagram](./caching-strategy-diagram.md)) 
leverages Supabase's pgvector implementation with HNSW indexes as detailed in [ADR-013](../adr/013-cache-similarity-service.md).

## Purpose

The cache sync system addresses the need for instant, privacy-preserving search results by fingerprinting anonymous queries at the edge, merging duplicates, and persisting them for quick access. It minimizes repeated LLM and vector searches by using a cache-aside orchestration pattern, ensuring sub-100 ms skeleton responses via edge cache hits while respecting PII compliance by storing only non-identifying fingerprints.

## Workflow for Product Managers

1.  **User Submits Query**: The user enters a search query into the application.
2.  **System Checks Caches**: The system first checks the local cache for an exact match, then the semantic cache for similar results.
3.  **Parallel API Call**: If no matches are found, a parallel API call is made to the DeepSeek API.
4.  **Results Merged and Synced**: The results are merged, displayed to the user, and synced in the background by the Service Worker.

## Workflow for Developers

1.  **Sequence Diagram**: The caching and query fetching strategy is visualized in the [Caching Strategy Diagram](caching-strategy-diagram.md).
2.  **Service Worker Message Flow**: The Service Worker communicates with the main thread via a message-based system, which is detailed in the [Service Worker Issues Log](service-worker-issues-log.md).
3.  **Error Handling**: The error handling hierarchy is designed to be resilient and is documented in [ADR-014](adr/014-error-handling-and-logging.md).

[Rest of existing file content remains unchanged...]
