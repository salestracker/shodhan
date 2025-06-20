// build-sw.js
import * as esbuild from 'esbuild';

// Build the Service Worker from TypeScript to JavaScript for use in public directory
esbuild.build({
  entryPoints: ['src/service-worker.ts'],
  bundle: true,
  platform: 'browser',
  outfile: 'public/service-worker-dev.js',
  define: {
    'import.meta.env.DEV': process.env.NODE_ENV === 'development' ? 'true' : 'false'
  }
}).then(() => {
  console.log('Service Worker built successfully to public/service-worker-dev.js');
}).catch((error) => {
  console.error('Service Worker build failed:', error);
  process.exit(1);
});
