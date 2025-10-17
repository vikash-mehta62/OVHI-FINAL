// vite.config.ts
import { defineConfig } from "file:///E:/OVHI-FINAL/node_modules/vite/dist/node/index.js";
import react from "file:///E:/OVHI-FINAL/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///E:/OVHI-FINAL/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///E:/OVHI-FINAL/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "E:\\OVHI-FINAL";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    ...mode === "development" ? [componentTagger()] : [],
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
        // 10MB
      },
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "icons/*.png"
      ],
      manifest: {
        name: "My Vite React PWA",
        short_name: "VitePWA",
        description: "A Vite + React Progressive Web App with TypeScript",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-select"],
          utils: ["lucide-react", "date-fns", "clsx"]
        }
      }
    },
    chunkSizeWarningLimit: 2e3
  },
  optimizeDeps: {
    include: ["js-cookie"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxPVkhJLUZJTkFMXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxPVkhJLUZJTkFMXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9PVkhJLUZJTkFML3ZpdGUuY29uZmlnLnRzXCI7Ly8gaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuLy8gaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuLy8gaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuLy8gaW1wb3J0IHsgTm9kZUdsb2JhbHNQb2x5ZmlsbFBsdWdpbiB9IGZyb20gXCJAZXNidWlsZC1wbHVnaW5zL25vZGUtZ2xvYmFscy1wb2x5ZmlsbFwiO1xyXG4vLyBpbXBvcnQgeyBOb2RlTW9kdWxlc1BvbHlmaWxsUGx1Z2luIH0gZnJvbSBcIkBlc2J1aWxkLXBsdWdpbnMvbm9kZS1tb2R1bGVzLXBvbHlmaWxsXCI7XHJcblxyXG4vLyAvLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG4vLyBleHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4vLyAgIHNlcnZlcjoge1xyXG4vLyAgICAgaG9zdDogXCI6OlwiLFxyXG4vLyAgICAgcG9ydDogODA4MCxcclxuLy8gICB9LFxyXG5cclxuLy8gICByZXNvbHZlOiB7XHJcbi8vICAgICBhbGlhczoge1xyXG4vLyAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuLy8gICAgICAgYnVmZmVyOiBcImJ1ZmZlclwiLCAvLyBcdUQ4M0RcdURDNDggYWRkIHRoaXMgbGluZVxyXG4vLyAgICAgfSxcclxuLy8gICB9LFxyXG4vLyAgIG9wdGltaXplRGVwczoge1xyXG4vLyAgICAgZXNidWlsZE9wdGlvbnM6IHtcclxuLy8gICAgICAgZGVmaW5lOiB7XHJcbi8vICAgICAgICAgZ2xvYmFsOiBcImdsb2JhbFRoaXNcIiwgLy8gXHVEODNEXHVEQzQ4IHBvbHlmaWxsIGdsb2JhbFxyXG4vLyAgICAgICB9LFxyXG4vLyAgICAgICBwbHVnaW5zOiBbXHJcbi8vICAgICAgICAgTm9kZUdsb2JhbHNQb2x5ZmlsbFBsdWdpbih7XHJcbi8vICAgICAgICAgICBidWZmZXI6IHRydWUsIC8vIFx1RDgzRFx1REM0OCBlbmFibGUgQnVmZmVyIHBvbHlmaWxsXHJcbi8vICAgICAgICAgfSksXHJcbi8vICAgICAgICAgTm9kZU1vZHVsZXNQb2x5ZmlsbFBsdWdpbigpLFxyXG4vLyAgICAgICBdLFxyXG4vLyAgICAgfSxcclxuLy8gICB9LFxyXG4vLyB9KSk7XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtyZWFjdCgpLFxyXG4gICAgIC4uLihtb2RlID09PSAnZGV2ZWxvcG1lbnQnID8gW2NvbXBvbmVudFRhZ2dlcigpXSA6IFtdKSxcclxuICAgICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnfSddLFxyXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiAxMCAqIDEwMjQgKiAxMDI0LCAvLyAxME1CXHJcbiAgICAgIH0sXHJcbiAgICAgIGluY2x1ZGVBc3NldHM6IFtcclxuICAgICAgICAnZmF2aWNvbi5pY28nLFxyXG4gICAgICAgICdyb2JvdHMudHh0JyxcclxuICAgICAgICAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnLFxyXG4gICAgICAgICdpY29ucy8qLnBuZycsXHJcbiAgICAgIF0sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogJ015IFZpdGUgUmVhY3QgUFdBJyxcclxuICAgICAgICBzaG9ydF9uYW1lOiAnVml0ZVBXQScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdBIFZpdGUgKyBSZWFjdCBQcm9ncmVzc2l2ZSBXZWIgQXBwIHdpdGggVHlwZVNjcmlwdCcsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjZmZmZmZmJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9pY29ucy9wd2EtMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9pY29ucy9wd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9pY29ucy9wd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG4gICAgXS5maWx0ZXIoXHJcbiAgICBCb29sZWFuXHJcbiAgKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcclxuICAgICAgICAgIHVpOiBbJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLCAnQHJhZGl4LXVpL3JlYWN0LXNlbGVjdCddLFxyXG4gICAgICAgICAgdXRpbHM6IFsnbHVjaWRlLXJlYWN0JywgJ2RhdGUtZm5zJywgJ2Nsc3gnXVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMjAwMFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBpbmNsdWRlOiBbJ2pzLWNvb2tpZSddXHJcbiAgfVxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUF3Q0EsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxTQUFTLGVBQWU7QUE1Q3hCLElBQU0sbUNBQW1DO0FBK0N6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFBQyxNQUFNO0FBQUEsSUFDYixHQUFJLFNBQVMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO0FBQUEsSUFDbkQsUUFBUTtBQUFBLE1BQ1IsY0FBYztBQUFBLE1BQ2QsU0FBUztBQUFBLFFBQ1AsY0FBYyxDQUFDLGdDQUFnQztBQUFBLFFBQy9DLCtCQUErQixLQUFLLE9BQU87QUFBQTtBQUFBLE1BQzdDO0FBQUEsTUFDQSxlQUFlO0FBQUEsUUFDYjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDUjtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0QsRUFBRTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDN0IsSUFBSSxDQUFDLDBCQUEwQix3QkFBd0I7QUFBQSxVQUN2RCxPQUFPLENBQUMsZ0JBQWdCLFlBQVksTUFBTTtBQUFBLFFBQzVDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLHVCQUF1QjtBQUFBLEVBQ3pCO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsV0FBVztBQUFBLEVBQ3ZCO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
