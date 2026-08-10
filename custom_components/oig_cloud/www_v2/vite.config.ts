import { defineConfig } from 'vite';
import { resolve } from 'path';

// Unique per build — appended as ?v= to the entry asset refs in index.html so
// the mobile app / browser webview can't serve a stale cached index.js after a
// deploy (filenames are intentionally NOT content-hashed; see output config).
const BUILD_ID = Date.now().toString(36);

export default defineConfig({
  root: '.',
  base: '/oig_cloud_static_v2/',

  plugins: [
    {
      name: 'oig-cache-bust',
      transformIndexHtml(html: string) {
        return html.replace(
          /(\/oig_cloud_static_v2\/assets\/[\w.-]+\.(?:js|css))/g,
          `$1?v=${BUILD_ID}`,
        );
      },
    },
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Disable file hashing for better HA compatibility
        // Cache busting handled via query parameters in panel URL
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
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
