// App entry point — mounts React into the #root div in index.html.
// Styles are imported here so they're bundled globally by Vite.

  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  