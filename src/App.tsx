import { enableMapSet } from "immer";
enableMapSet();
import React from 'react';
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
import { UserProfilePage } from '@/pages/UserProfilePage';
import { FriendsPage } from '@/pages/FriendsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ChatPage } from '@/pages/ChatPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { GameForumPage } from '@/pages/GameForumPage';
import { GameWorkshopPage } from '@/pages/GameWorkshopPage';
import { SearchPage } from '@/pages/SearchPage';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useUserStatus } from '@/hooks/use-user-status';
// Set dark theme by default
document.documentElement.classList.add('dark');

// Component to handle user status updates
function UserStatusManager() {
  useUserStatus();
  return null;
}
const router = createBrowserRouter(
  [
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
    path: "/about",
    element: <AboutPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/contact",
    element: <ContactPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    element: <DashboardLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/store", element: <StorePage /> },
      { path: "/library", element: <LibraryPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/game/:slug", element: <GameDetailPage /> },
      { path: "/game/:slug/forum", element: <GameForumPage /> },
      { path: "/game/:slug/workshop", element: <GameWorkshopPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/profile/achievements", element: <AchievementsPage /> },
      { path: "/user/:username", element: <UserProfilePage /> },
      { path: "/friends", element: <FriendsPage /> },
      { path: "/friends/chat/:id", element: <ChatPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/cart", element: <CartPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/notifications", element: <NotificationsPage /> },
    ],
  },
],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <UserStatusManager />
          <RouterProvider router={router} />
          <Toaster theme="dark" richColors closeButton />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}