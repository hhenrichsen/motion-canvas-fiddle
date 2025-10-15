import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    minify: "terser",
    rollupOptions: {
      input: {
        main: "./index.html",
      },
      output: {
        manualChunks: {
          vendor: ['@motion-canvas/core', '@motion-canvas/2d'],
          editor: ['@babel/standalone', 'codemirror']
        }
      }
    },
  },
  optimizeDeps: {
    include: [
      "@motion-canvas/core",
      "@motion-canvas/2d",
      "chroma-js"
    ],
  },
});
