import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/oig_cloud_static_v2/',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  build: {
    outDir: 'dist',
    emptyDirBeforeWrite: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['lit'],
          'charts': ['chart.js', 'chartjs-plugin-zoom', 'chartjs-plugin-datalabels', 'chartjs-plugin-annotation']
        }
      }
    }
  },
  
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://10.0.0.143:8123',
        changeOrigin: true
      }
    }
  },
  
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(process.env.npm_package_version || '2.0.0')
  }
});
