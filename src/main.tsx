import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { initializeNativeApp, isNativeApp } from "./native";
import { router } from "./router";
import { applyTheme, readTheme } from "./lib/theme";
import "./styles.css";
import "./redesign.css";
import "./practice.css";
import "./reader.css";
import "./expressions.css";
import "./sunny.css";
import "./ui-polish.css";

applyTheme(readTheme());

if (isNativeApp) {
  void initializeNativeApp();
} else {
  registerSW({ immediate: true });
}

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
