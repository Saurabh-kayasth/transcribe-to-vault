import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
        background: 'src/components/background/background.ts',
        contentScript: 'src/components/content/contentScript.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
