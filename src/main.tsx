import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import "./pwa";
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
