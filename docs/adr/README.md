# Architectural Decision Records (ADR)

This directory contains Architectural Decision Records for the SearchGPT project.

## What is an ADR?
An ADR is a document that captures an important architectural decision along with its context and consequences.

## Current ADRs

1. [001-deepseek-supabase-integration.md](001-deepseek-supabase-integration.md) - Decision to use DeepSeek API via Supabase Edge Functions
2. [002-frontend-technology-stack.md](002-frontend-technology-stack.md) - Frontend technology stack selection
3. [003-threaded-search-results.md](003-threaded-search-results.md) - Implementation of threaded search results
4. [004-search-caching-strategy.md](004-search-caching-strategy.md) - Search caching implementation strategy

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
