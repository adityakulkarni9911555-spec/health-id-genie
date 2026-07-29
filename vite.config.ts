import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split heavy vendor libs out of the initial chunk so the landing route
    // (/auth) can paint without downloading Supabase, React Query, Radix,
    // PostHog, Helmet, etc.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("@supabase") || id.includes("@lovable.dev/cloud-auth-js")) return "supabase";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("posthog-js")) return "posthog";
          if (id.includes("react-helmet-async")) return "helmet";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("qrcode.react")) return "qr";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) return "forms";
          if (id.includes("date-fns")) return "date";
          if (id.includes("embla-carousel")) return "carousel";
          if (id.includes("react-day-picker")) return "daypicker";
          if (id.includes("cmdk") || id.includes("vaul") || id.includes("sonner") || id.includes("input-otp")) return "ui-extras";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) return "react";
        },
      },
    },
  },
}));
