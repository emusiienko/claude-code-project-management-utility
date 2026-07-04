import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/App";
import "@/app/index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error(
    "Root element #root not found. Check index.html for a <div id='root'>.",
  );
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
