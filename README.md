# Shodhan - An AI SearchGPT

A frontend application for searching and displaying results with caching and synchronization capabilities.

## Key Features
- **AI-Powered Search**: Uses LLM API for comprehensive, cited answers
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

### Service Worker and Cache Sync
- **Purpose**: A critical component for background cache synchronization, ensuring instant, privacy-preserving search results by fingerprinting anonymous queries at the edge and persisting them for quick access.
- **Mechanism**: Utilizes **Workbox** for robust background sync, queuing and retrying failed requests to a configured webhook. The Service Worker operates on multiple sync triggers:
  - **Periodic Background Sync**: Where supported (e.g., Chrome), syncs data even when the app is in the background.
  - **Foreground Sync**: As a fallback for browsers without periodic sync support (e.g., Safari), syncs at intervals when the app is visible.
  - **One-off Sync**: Triggers on connectivity changes to ensure data syncs when the user comes back online.
- **Data Flow**: The Service Worker requests cached data from the main thread, filters for new entries based on timestamps, and sends them to the webhook for orchestration, minimizing redundant API calls.
- **Further Reading**: For a detailed technical overview, implementation specifics, debugging, and troubleshooting, refer to [Cache Sync Implementation](docs/cache-sync-implementation.md).

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

## Setup and Development

1. Clone the repository.
2. Ensure you have a `.env.local` file at the project root with the necessary environment variables.
3. Run `npm install` to install dependencies.
4. Use `npm run dev` for development mode or `npm run build` followed by `npm run serve` for production testing.

### Development Commands
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deployment

### Prerequisites
- A cloud account such as digitalocean, aws, gcp to deploy to. How to setup for deployment is out of scope of this project but an instance is provided in the [steps](#steps) section below.
- Supabase project with Edge Functions configured. How to setup this up is out of scope of this project.
- An LLM API key. How to setup this up is out of scope of this project.

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
   VITE_SUPABASE_EDGE_FUNCTION_URL=The URL for Supabase edge functions used in search operations.
   VITE_CACHE_SYNC_INTERVAL=The interval (in milliseconds) for cache synchronization.
   VITE_CACHE_WEBHOOK_URL=The webhook URL for cache data synchronization.
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

## Environment Variables

This project uses environment variables to manage sensitive information and configuration settings. The following variables are defined in `.env.local` at the project root:

- `VITE_SUPABASE_URL`: The URL for the Supabase instance.
- `VITE_SUPABASE_KEY`: The API key for Supabase authentication.
- `VITE_SUPABASE_EDGE_FUNCTION_URL`: The URL for Supabase edge functions used in search operations.
- `VITE_CACHE_SYNC_INTERVAL`: The interval (in milliseconds) for cache synchronization.
- `VITE_CACHE_WEBHOOK_URL`: The webhook URL for cache data synchronization.
- `VITE_SW_MINIFY`: A boolean flag to determine if the Service Worker should be minified.

These variables have been integrated into the codebase to replace hardcoded values, ensuring better security and configurability. The changes have been applied to:
- `src/lib/supabase.ts` for Supabase URL and key.
- `src/services/searchService.ts` for the Supabase edge function URL.
- `src/main.tsx` for the cache webhook URL.

## Roadmap
- [ ] User authentication
- [ ] Search history
- [ ] Multi-LLM support
- [ ] Advanced caching strategies

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding new features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Report Bugs or Suggest Features**: Use [GitHub Issues](https://github.com/your-username/search-gpt-answers/issues) to report bugs or suggest enhancements. Please provide as much detail as possible, including steps to reproduce the issue or a clear description of the feature.
2. **Submit Changes**:
   - **Fork the Repository**: Create your own fork of the code.
   - **Clone the Fork**: Clone your fork to your local machine.
   - **Create a Branch**: Make your changes in a new branch with a descriptive name (e.g., `feature/add-auth` or `bugfix/fix-cache-issue`).
   - **Commit Changes**: Commit your changes with clear, concise commit messages following the [conventional commits](https://www.conventionalcommits.org/) format if possible.
   - **Push Changes**: Push your branch to your fork on GitHub.
   - **Submit a Pull Request**: Open a Pull Request (PR) from your branch to the `main` branch of this repository. Ensure your PR description explains the purpose of the changes and references any related issues.
3. **Review Architectural Decisions**: Before proposing significant changes, please review the [Architectural Decision Records (ADRs)](docs/adr/) in the `docs/adr` directory to understand the project's design choices and rationale.

We will review your contributions as soon as possible and provide feedback. Thank you for helping improve SearchGPT!

## Code of Conduct

In the interest of fostering an open and welcoming environment, we expect all contributors to be respectful and considerate of others. By participating in this project, you agree to:
- Be respectful of different viewpoints and experiences.
- Gracefully accept constructive criticism.
- Focus on what is best for the community.
- Show empathy towards other community members.
- Be nice and give credit back to this project if you independently work off this.

We are in the process of formalizing a `CODE_OF_CONDUCT.md` file. Until then, please adhere to these principles to ensure a positive and inclusive community.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE). You are free to use, modify, and distribute this software under the terms of the GPL-3.0 license. For more details, see the full license text in the repository.

## Documentation

Further details on architectural decisions and implementation can be found in the `docs/` directory.
