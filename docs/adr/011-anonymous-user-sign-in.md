# ADR 011: Anonymous User Sign-In with Supabase

## Status
Accepted

## Context
The SearchGPT project aims to provide a privacy-preserving search experience while maintaining the ability to store user-specific data such as search history. To achieve this, a mechanism for user authentication that does not require personal information was needed. Supabase offers an anonymous sign-in feature that creates a unique user ID without collecting identifiable data, which aligns with the project's privacy goals. This feature also enables associating search results with a user ID in the 'cacheUserResults' table for persistence across sessions.

## Decision
Implement anonymous user sign-in using Supabase's authentication capabilities:
1. **Supabase Configuration**: Ensure anonymous sign-in is enabled in the Supabase project settings.
2. **Client Enhancement**: Add a `signInAnonymously` function in `src/lib/supabase.ts` to handle anonymous authentication.
3. **State Management**: Extend the `AppContext` in `src/contexts/AppContext.tsx` to manage user state, including the anonymous user ID, and trigger sign-in on app startup.
4. **UI Integration**: Add a subtle indicator in `src/components/AppLayout.tsx` to show the user is signed in anonymously, placed in the top-right corner with a tooltip for clarity.

## Rationale
1. **Privacy Preservation**: Anonymous sign-in allows users to interact with the application without providing personal information, maintaining the project's commitment to privacy while enabling user-specific data storage.
2. **Data Persistence**: The generated user ID can be used to associate search results in the `cacheUserResults` table, ensuring continuity of user experience across sessions.
3. **Seamless Integration**: Leveraging Supabase's built-in anonymous authentication minimizes development overhead and integrates smoothly with existing Supabase backend services.
4. **User Transparency**: A subtle UI indicator informs users of their anonymous status, adhering to UX best practices by providing transparency without disrupting the primary search interface.
5. **Cross-Browser Compatibility**: This approach works across all browsers as it relies on standard web authentication mechanisms provided by Supabase.

## Consequences
- **Configuration Dependency**: Requires anonymous sign-in to be enabled in Supabase project settings, which must be verified during setup or deployment.
- **State Management Overhead**: Adding user state to the application context introduces minor complexity, though it leverages existing context structures for minimal impact.
- **UI Considerations**: The anonymous indicator must be maintained to ensure it remains consistent with the evolving UI design, requiring updates if the layout or styling changes significantly.
- **Potential for Future Expansion**: This implementation lays the groundwork for potential future authentication methods (e.g., email/password or social logins), though additional work would be needed to support account conversion from anonymous to registered users.

## Implementation Details
Key changes implemented:
1. **Supabase Client Update**: Added `signInAnonymously` function in `src/lib/supabase.ts` to perform anonymous authentication via Supabase's API.
2. **Context Extension**: Updated `src/contexts/AppContext.tsx` to include `user` and `setUser` in the context, with logic to trigger anonymous sign-in during app initialization using `useEffect`.
3. **UI Indicator**: Integrated a `Badge` component with a `Tooltip` in `src/components/AppLayout.tsx`, positioned in the top-right corner to display "Anonymous" status when a user is signed in anonymously, ensuring minimal intrusion and alignment with existing Shadcn UI components and Tailwind CSS styling.

This decision enables SearchGPT to offer a privacy-focused user experience with persistent data capabilities, seamlessly integrated into the existing application architecture.
