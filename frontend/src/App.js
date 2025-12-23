import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Landing from "@/pages/Landing";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Garage from "@/pages/Garage";
import Lobbies from "@/pages/Lobbies";
import UserProfile from "@/pages/UserProfile";
import Requests from "@/pages/Requests";
import Squad from "@/pages/Squad";
import CarMeets from "@/pages/CarMeets";
import Leaderboards from "@/pages/Leaderboards";
import Achievements from "@/pages/Achievements";
import RoutesPage from "@/pages/Routes";

// Components
import Navbar from "@/components/Navbar";

// Auth context
import { AuthProvider, useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Dashboard has its own navigation, so don't show global navbar
  const hideNavbar = location.pathname === '/dashboard';

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
};

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id SYNCHRONOUSLY during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/garage"
        element={
          <ProtectedRoute>
            <Garage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lobbies"
        element={
          <ProtectedRoute>
            <Lobbies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:userId"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <Requests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/squad"
        element={
          <ProtectedRoute>
            <Squad />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meets"
        element={
          <ProtectedRoute>
            <CarMeets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboards"
        element={
          <ProtectedRoute>
            <Leaderboards />
          </ProtectedRoute>
        }
      />
      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <Achievements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/routes"
        element={
          <ProtectedRoute>
            <RoutesPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <div className="App min-h-screen bg-void">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
