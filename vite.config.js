import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async ({ command }) => {
  const plugins = [react()];

  // Only enable the SQLite middleware in dev mode ('serve'), never during CI/production 'build'
  if (command === 'serve') {
    // Load server-side .env vars (JWT_SECRET, TURSO_*, ADMIN_SECRET) for the dev middleware.
    // Vite only exposes VITE_* vars to the browser; server vars must be loaded separately.
    const { config: dotenvConfig } = await import('dotenv');
    dotenvConfig({ path: '.env' });

    plugins.push({
      name: 'sqlite-dev-backend',
      configureServer(server) {
        server.middlewares.use('/api', async (req, res, next) => {
          try {
            const { handleApiRequest } = await import('./server/api.js');
            await handleApiRequest(req, res, next);
          } catch (err) {
            console.warn('SQLite API error in dev middleware:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      },
    });
  }

  return {
    plugins,
    server: {
      port: 5173,
      host: true,
      fs: {
        strict: false,
        allow: ['..', '.'],
      },
    },
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      chunkSizeWarningLimit: 3000,
    },
  };
});
