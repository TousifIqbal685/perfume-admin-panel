import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Login from "../auth/Login";
import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Orders from "../pages/Orders";
import Revenue from "../pages/Revenue";
import Ads from "../pages/Ads"; 
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
// REMOVED UNUSED SUPABASE IMPORT HERE
import { useAdminAuth } from "../auth/useAdminAuth"; 

// ----------------------------
// Protected Route Wrapper
// ----------------------------
function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAdminAuth(); 

  if (loading) {
    return (
      <div className="full-center">
        <div className="loader" />
        <p>Checking authentication…</p>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/login" replace />;

  return children;
}

// ----------------------------
// Main Admin Layout
// ----------------------------
function Layout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const toggleSidebar = () => setSidebarOpen((p) => !p);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      <div className="main-area">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ----------------------------
// ROUTER
// ----------------------------
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED ADMIN ROUTES */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="ads" element={<Ads />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}