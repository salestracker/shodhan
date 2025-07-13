# ADR 014: Error Handling and Logging Strategy

## Status
Accepted

## Context
With the introduction of the `cacheSimilarityService` (ADR-013) and its external dependencies, a more robust and unified error handling and logging strategy is required to ensure system stability and improve diagnosability.

## Decision
Implement a structured error handling and logging strategy that includes:
1.  **Custom Error Classes**: Create a `CacheSimilarityError` class with a `code` (e.g., 'CACHE-404') and `context` object to provide structured error information.
2.  **Centralized Logging**: Use the existing `logger.ts` utility to log all errors with a consistent format, including the error code, message, and a timestamp.
3.  **Graceful Fallbacks**: Ensure that all service-level errors are caught and handled gracefully (e.g., by returning an empty array) to prevent crashes in the UI.
4.  **User-Facing Error Messages**: While detailed errors are logged for developers, user-facing messages should be simple and non-technical, such as the existing "I'm unable to find reliable information" fallback.

## Rationale
-   **Improved Debugging**: Structured error codes and contextual information make it easier to identify and debug issues in a distributed system.
-   **System Resilience**: Graceful error handling prevents failures in one service (like the cache similarity check) from breaking the entire search experience.
-   **Maintainability**: Centralizing logging logic in `logger.ts` makes it easier to manage and extend in the future (e.g., by adding a third-party logging service like Sentry).
-   **Clear Separation of Concerns**: Distinguishes between internal errors (logged in detail) and user-facing messages (kept simple).

## Consequences
-   **Increased Code Overhead**: Requires adding `try...catch` blocks and custom error classes, which adds some boilerplate to the services.
-   **Standardization**: Developers must adhere to the new error handling patterns to ensure consistency across the codebase.

## Related ADRs
-   [ADR-013: Cache Similarity Service Implementation](013-cache-similarity-service.md)
