import { createRoot } from "react-dom/client";
import { AppProvider } from "./context/AppContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { LoaderProvider } from "./context/LoaderContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import "./styles/app.css";
import "./styles/globals.css";
import "./index.css";
import "./styles/mv-theme-pages.css";
import App from "./App.tsx";

function hideBootLoader() {
  const el = document.getElementById("boot-loader");
  if (!el) return;
  el.classList.add("boot-loader--hide");
  window.setTimeout(() => el.remove(), 300);
}

try {
  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <AppProvider>
        <ThemeProvider>
          <LoaderProvider>
            <App />
          </LoaderProvider>
        </ThemeProvider>
      </AppProvider>
    </AuthProvider>,
  );
} finally {
  hideBootLoader();
}
