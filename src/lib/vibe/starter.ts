import type { FileMap } from "./types";

export function createStarterFiles(): FileMap {
  return {
    "/App.tsx": `export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>Hello, VibeCoder ✨</h1>
        <p>Ask the AI to build something — anything.</p>
      </div>
    </div>
  );
}
`,
    "/index.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
    "/public/index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VibeCoder App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
  };
}