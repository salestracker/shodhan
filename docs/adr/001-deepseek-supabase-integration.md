# ADR 001: Decision to Use DeepSeek API via Supabase Edge Functions

## Status
Accepted

## Context
The project requires:
- An LLM-powered search backend
- Secure API key management
- Efficient API invocation
- CORS handling for frontend integration

## Decision
Utilize DeepSeek API for LLM capabilities, invoked via a Supabase Edge Function.

## Rationale
1. **Security**: 
   - Supabase Edge Functions provide a secure environment to store and manage the DeepSeek API key
   - Prevents exposure in client-side code
2. **Performance**: 
   - Edge functions offer low-latency execution closer to users
3. **CORS Handling**: 
   - Built-in CORS management simplifies frontend integration
4. **Scalability**: 
   - Leverages Supabase's serverless infrastructure
   - Automatic scaling for API calls

## Consequences
- Requires Deno-based edge function development
- Need to manage Supabase environment variables
- Slightly more complex deployment than direct client-side API calls
- Additional latency from edge function layer (minimal)
