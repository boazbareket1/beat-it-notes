import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Full game: every rhythm pattern, including sixteenths and triplets.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App variant="full" />
  </React.StrictMode>,
);
