# SearchGPT - AI-Powered Search Assistant

## Overview
SearchGPT is a React-based web application that provides Google-like search functionality powered by DeepSeek's LLM technology. It offers conversational search capabilities with threaded results and intelligent caching.

## Key Features
- **AI-Powered Search**: Uses DeepSeek API for comprehensive, cited answers
- **Conversational Interface**: Supports follow-up questions with context preservation
- **Smart Caching**: Redundant query prevention with localStorage-based caching
- **Modern UI**: Built with Shadcn UI and Tailwind CSS

## Architecture

### Frontend
- **Framework**: React with TypeScript
- **State Management**: React Query + Context API
- **UI Components**: Shadcn UI with Tailwind CSS
- **Routing**: react-router-dom

### Backend Integration
- **API Layer**: Supabase Edge Functions
- **LLM Provider**: DeepSeek API
- **Caching**: LocalStorage with 24hr TTL

## How It Works

### For Product Managers
1. **User Flow**:
   - User enters query in search bar
   - System checks cache first
   - If cache miss, calls DeepSeek via Supabase Edge Function
   - Displays formatted results with citations
   - Allows follow-up questions maintaining context

2. **Key Metrics**:
   - Cache hit rate
   - API response times
   - User engagement with follow-up questions

### For Developers
1. **Core Components**:
   - `SearchEngine.tsx`: Main search interface
   - `searchService.ts`: Handles search logic and caching
   - `cacheService.ts`: Manages localStorage cache
   - `ThreadedSearchResult.tsx`: Renders conversation threads

2. **Data Flow**:
   ```mermaid
   graph TD
     A[SearchBar] --> B[SearchEngine]
     B --> C{Check Cache}
     C -->|Hit| D[Return Cached Results]
     C -->|Miss| E[Call Supabase Edge Function]
     E --> F[DeepSeek API]
     F --> G[Format Results]
     G --> H[Update Cache]
     H --> I[Display Results]
   ```

## Deployment to Render.com

### Prerequisites
- Render.com account
- Supabase project with Edge Functions configured
- DeepSeek API key

### Steps
1. **Create New Web Service**:
   - Select "Web Service" in Render Dashboard
   - Connect your GitHub repository

2. **Configure Environment**:
   ```bash
   Build Command: npm run build
   Start Command: npm run preview
   ```

3. **Set Environment Variables**:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Advanced Settings**:
   - Set instance type to "Standard" (minimum)
   - Enable auto-deploy from main branch

5. **Deploy**:
   - Click "Create Web Service"
   - Monitor build logs for errors

### Post-Deployment
1. Verify:
   - Access your Render URL
   - Test search functionality
   - Check console for errors

2. Monitoring:
   - Set up Render alerts
   - Monitor response times
   - Track error rates

## Development Setup
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Roadmap
- [ ] User authentication
- [ ] Search history
- [ ] Multi-LLM support
- [ ] Advanced caching strategies
