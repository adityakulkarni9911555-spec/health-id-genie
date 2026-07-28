import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { PostHogProvider } from "@/components/PostHogProvider";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <PostHogProvider>
      <App />
    </PostHogProvider>
  </HelmetProvider>,
);
