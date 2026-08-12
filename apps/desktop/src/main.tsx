import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import App from "./App";
import { ExternalDisplayApp } from "./ExternalDisplayApp";
import { parseScreenPanel } from "./screenPanels";
import "./styles/global.css";

const label = getCurrentWebviewWindow().label;
const isScreen = label.startsWith("screen-");

function bootScreen() {
  const params = new URLSearchParams(window.location.search);
  const panel = parseScreenPanel(params.get("panel"));
  const title = params.get("title") ?? "Screen";
  return <ExternalDisplayApp panel={panel} title={title} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isScreen ? bootScreen() : <App />}</React.StrictMode>,
);
