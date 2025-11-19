import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/api-client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css';
// Layouts
import { DashboardLayout } from '@/components/layout/DashboardLayout';
// Pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { StorePage } from '@/pages/StorePage';
import { LibraryPage } from '@/pages/LibraryPage';
import { GameDetailPage } from '@/pages/GameDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { FriendsPage } from '@/pages/FriendsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Toaster } from '@/components/ui/sonner';
// Set dark theme by default
document.documentElement.classList.add('dark');
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    element: <DashboardLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/store", element: <StorePage /> },
      { path: "/library", element: <LibraryPage /> },
      { path: "/game/:slug", element: <GameDetailPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/friends", element: <FriendsPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find the root element");
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster theme="dark" richColors closeButton />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);