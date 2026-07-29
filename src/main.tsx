import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { reportWebVitals } from "./lib/webVitals";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
  );
  reportWebVitals();
}
