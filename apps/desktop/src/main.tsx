import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import App from "./App";
import { ExternalDisplayApp } from "./ExternalDisplayApp";
import "./styles/global.css";

const label = getCurrentWebviewWindow().label;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {label === "external-display" ? <ExternalDisplayApp /> : <App />}
  </React.StrictMode>,
);
