# Architectural Decision Records (ADR)

This directory contains Architectural Decision Records for the SearchGPT project.

## What is an ADR?
An ADR is a document that captures an important architectural decision along with its context and consequences.

## Current ADRs

1. [001-deepseek-supabase-integration.md](001-deepseek-supabase-integration.md) - Decision to use DeepSeek API via Supabase Edge Functions
2. [002-frontend-technology-stack.md](002-frontend-technology-stack.md) - Frontend technology stack selection
3. [003-threaded-search-results.md](003-threaded-search-results.md) - Implementation of threaded search results
4. [004-search-caching-strategy.md](004-search-caching-strategy.md) - Search caching implementation strategy
5. [005-ui-improvements.md](005-ui-improvements.md) - UI/UX Improvements for Search Results and Conversational Flow
6. [006-service-worker-development-environment-strategy.md](006-service-worker-development-environment-strategy.md) - Service Worker development environment strategy
7. [007-service-worker-data-filtering-refinement.md](007-service-worker-data-filtering-refinement.md) - Service Worker data filtering refinement
8. [008-main-thread-service-worker-cache-data-communication.md](008-main-thread-service-worker-cache-data-communication.md) - Main thread-Service Worker cache data communication
9. [009-hybrid-cache-sync-model.md](009-hybrid-cache-sync-model.md) - Hybrid cache synchronization model
10. [010-robust-service-worker-dev-strategy.md](010-robust-service-worker-dev-strategy.md) - Robust Service Worker Development Strategy

## Template
New ADRs should follow this template:

```markdown
# ADR [number]: [short title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the issue we're addressing?]

## Decision
[What are we deciding to do?]

## Rationale
[Why did we make this decision?]

## Consequences
[What becomes easier/harder? Any tradeoffs?]
```

## Creating a New ADR
1. Create a new markdown file with the next sequential number
2. Follow the template above
3. Add a link to this README
4. Submit for review
