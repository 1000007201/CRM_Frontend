/**
 * src/main.jsx
 *
 * Entry point. Wraps the app in:
 *   QueryClientProvider  — React Query cache + devtools
 *   AuthProvider         — JWT auth state, login/logout
 *   BrowserRouter        — React Router
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/common/Toast";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch just because the window was re-focused
      refetchOnWindowFocus: false,
      // Retry once on failure before showing an error
      retry: 1,
      // Data is considered fresh for 60 seconds
      staleTime: 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);