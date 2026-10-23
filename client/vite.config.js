import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:5001",
        changeOrigin: true
      },
      "/metrics": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:5001",
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-core": ["react", "react-dom", "react-router-dom"],
          "three-visualizer": ["three", "@react-three/fiber", "@react-three/drei"],
          "ui-icons": ["lucide-react"]
        }
      }
    }
  }
});
