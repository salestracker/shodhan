# ADR 012: Custom UUID for Privacy-Preserving Session Fingerprinting

## Status
Accepted

## Context
The SearchGPT project requires a mechanism for session tracking to maintain user-specific data such as search history while adhering to strict privacy standards. There is a need for a session fingerprint ID that does not collect or process personal identifiable information (PII), ensuring compliance with regulations like GDPR and CCPA. Additionally, the solution must address potential session data fragmentation when users clear local storage or access the application from different browsers or devices. Alternatives like FingerprintJS or ClientJS, which rely on device and browser characteristics, pose privacy concerns and require complex consent mechanisms, making them less suitable for a privacy-first approach.

## Decision
Adopt a Custom UUID with Local Storage approach for session fingerprinting, using the `uuid` JavaScript library (via CDN) to generate and store a unique identifier in local storage. This UUID will serve as a session-persistent fingerprint ID, independent of the Supabase anonymous user ID, and will be used for tracking user sessions, storing data in Supabase, and inclusion in webhook payloads. Future mechanisms like TOTP codes or QR codes will be planned to mitigate session fragmentation by enabling manual linking across devices or browsers.

## Rationale
1. **Privacy Preservation**: The Custom UUID approach generates a random or time-based identifier without collecting any device or browser-specific data, inherently complying with GDPR and CCPA by avoiding PII. This aligns with SearchGPT’s commitment to user privacy.
2. **Simplicity and Efficiency**: Implementation is straightforward, requiring minimal code changes and no complex user consent mechanisms beyond basic transparency notices, reducing development overhead.
3. **Functional Suitability**: The UUID can be stored in the `public.cacheUserResults` table in Supabase and included in payloads sent to `VITE_CACHE_WEBHOOK_URL`, meeting requirements for session tracking and data synchronization.
4. **Future-Proofing**: This approach supports potential multi-device linking through secure sharing mechanisms like QR codes or TOTP codes, allowing session continuity across different browsers or devices without compromising privacy.
5. **User Control**: Users can be provided with options to reset or clear their fingerprint ID, ensuring control over their data and aligning with regulatory rights like deletion.

## Consequences
- **Session Data Fragmentation**: If a user clears local storage or uses a different browser/device, a new UUID will be generated, potentially fragmenting session data. This can be mitigated by integrating with Supabase user IDs as a fallback where possible and planning future manual linking mechanisms (e.g., TOTP codes or QR codes) to unify session data across instances.
- **Minimal Overhead**: Adds slight complexity to application context management to store and manage the UUID, though it leverages existing structures like `AppContext` for minimal impact.
- **Transparency Needs**: Requires a subtle notice or privacy policy update to inform users about the use of a local storage identifier, ensuring compliance with transparency requirements.
- **Future Development**: Lays the groundwork for profile linking features across sessions and devices, though additional implementation will be needed to fully address multi-device synchronization.

## Implementation Details
Key steps for implementation:
1. **UUID Library Integration**: Include the `uuid` library via CDN in `index.html` or dynamically load it to generate unique identifiers.
2. **Generation and Storage**: On app initialization in `src/contexts/AppContext.tsx`, check for an existing UUID in local storage (key: `searchGptFingerprintId`). If none exists, generate a new UUID using `uuid.v4()` and store it.
3. **Context Extension**: Update `AppContext` to include the fingerprint ID, making it accessible to components.
4. **Supabase Storage**: Store the fingerprint ID in the `public.cacheUserResults` table in Supabase, linking it to user data.
5. **Webhook Payload**: Modify `src/services/searchService.ts` to include the fingerprint ID in payloads sent to `VITE_CACHE_WEBHOOK_URL`.
6. **User Control**: Provide an option in a settings or privacy menu to reset or clear the ID, ensuring user control over data.

This decision ensures that SearchGPT maintains a privacy-first approach to session tracking while addressing potential fragmentation through planned future enhancements for cross-device linking.
