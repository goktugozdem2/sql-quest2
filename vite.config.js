import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Split into chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk - React, Supabase, etc.
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
          // Icons chunk
          icons: ['lucide-react'],
          // Data chunks - split heavy data files
          'data-challenges': [
            './src/data/challenges.js',
            './src/data/daily-challenges.js',
            './src/data/mock-interviews.js',
          ],
          'data-curriculum': [
            './src/data/curriculum.js',
            './src/data/thirty-day-challenge.js',
            './src/data/thirty-day-complete-1.js',
            './src/data/thirty-day-complete-2.js',
          ],
          'data-core': [
            './src/data/config.js',
            './src/data/datasets.js',
            './src/data/exercises.js',
            './src/data/lessons.js',
          ],
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
