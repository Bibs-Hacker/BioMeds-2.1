import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "app-entry",
      transformIndexHtml: {
        order: "pre",
        handler() {
          return [
            {
              tag: "script",
              attrs: { type: "module", src: "/src/main.tsx" },
              injectTo: "body",
            },
          ];
        },
      },
    },
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "charts", test: /node_modules\/(recharts|d3-)/ },
            {
              name: "exports",
              test: /node_modules\/(jspdf|jspdf-autotable|xlsx|html-to-image|qrcode)/,
            },
            { name: "supabase", test: /node_modules\/@supabase/ },
          ],
        },
      },
    },
  },
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
});
