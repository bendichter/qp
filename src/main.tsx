import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./css/fonts.css";
import "./css/tokens.css";
import "./index.css";
import getAppName from "./qpcommon/getAppName";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

document.title = getAppName();
