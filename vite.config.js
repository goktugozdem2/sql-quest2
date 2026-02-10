import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split data files into their own chunk
          if (id.includes('/src/data/')) {
            return 'data';
          }
          // Let Vite handle vendor splitting automatically
        },
      },
    },
    // Target modern browsers for smaller output
    target: 'es2020',
    // Use esbuild for fast minification (built into Vite)
    minify: 'esbuild',
    // Generate source maps for debugging
    sourcemap: false,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
  },
});
