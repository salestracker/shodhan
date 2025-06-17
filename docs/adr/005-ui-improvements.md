# ADR 005: UI/UX Improvements for Search Results and Conversational Flow

## Status
Accepted

## Context
Following initial implementation and user feedback, several UI/UX issues were identified that hindered the search engine's usability and modern feel:
- Search history items, when clicked, did not re-render results.
- The conversational interface, while having backend logic, lacked a clear frontend mechanism for follow-up questions and visual threading.
- Source citations were displayed as a separate footer section without inline hyperlinks, making them less accessible and modern.
- Asking follow-up questions caused the entire search result area to disappear, leading to a disruptive user experience.

## Decision
Implement the following UI/UX improvements:
1.  **Fix Search History Rendering**: Ensure clicking a history item correctly triggers a search and displays the result.
2.  **Enable Conversational Interface**: Provide an intuitive way to ask follow-up questions and display replies in a threaded manner.
3.  **Implement Inline Hyperlinked Citations**: Integrate source citations directly into the content as clickable superscript links.
4.  **Localized Loading for Follow-ups**: Display a localized loading indicator for follow-up questions, keeping the main results visible.

## Rationale
1.  **Enhanced User Experience**: Directly addresses user feedback for a more intuitive, interactive, and modern search experience.
2.  **Consistency with ADR 003**: Fully implements the "Threaded Search Results" decision by providing the necessary UI components and state management.
3.  **Improved Information Accessibility**: Inline citations make sources immediately available and verifiable without disrupting the reading flow.
4.  **Reduced Perceived Latency**: Localized loading indicators provide immediate feedback for follow-up actions, improving responsiveness.
5.  **Adherence to Best Practices**: Moves towards a more standard and expected behavior for modern web applications.

## Consequences
-   **Increased Frontend Complexity**: Requires modifications across `AppLayout.tsx`, `SearchEngine.tsx`, `SearchResults.tsx`, and `ThreadedSearchResult.tsx` to manage new states and rendering logic.
-   **Refined Data Flow**: The `SearchResult` type was extended to include `isReplying` for localized loading.
-   **Markdown Processing Nuances**: Required careful handling of `ReactMarkdown` and `remarkGfm` to correctly interpret and render reference-style links from combined content and source strings.
-   **Potential for UI Bugs**: Introducing new state management for localized loading and recursive rendering increases the surface area for potential rendering issues if not handled carefully.

## Implementation Details
Key components modified:
1.  `AppLayout.tsx`: Updated to pass `handleHistoryClick` to `SearchEngine`.
2.  `SearchEngine.tsx`:
    *   `SearchResult` type updated with `isReplying?: boolean`.
    *   `handleSearch` and `handleFollowUpSearch` logic refined to manage `isReplying` state.
    *   Passes `onFollowUp` prop to `SearchResults`.
3.  `SearchResults.tsx`:
    *   `onFollowUp` prop added to interface.
    *   Combines `result.content` and `result.sources` for `ReactMarkdown` input.
    *   Removed custom `text` renderer for citations.
    *   Removed explicit "Sources" footer.
    *   Added follow-up input form and conditionally renders localized loading spinner.
    *   Renders `ThreadedSearchResult` for replies.
4.  `ThreadedSearchResult.tsx`:
    *   Updated `formatContent` to combine content and sources.
    *   Added follow-up input form and conditionally renders localized loading spinner based on `isReplying` state.
