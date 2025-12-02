// src/components/Navbar.jsx
import React from "react";
// FIX: Explicitly added .js extension to resolve module error
import { supabase } from "../supabase/client.js"; 
import { useLocation } from "react-router-dom"; // Import useLocation for dynamic title

export default function Navbar({ toggleSidebar }) {
  // Use useLocation to get the current path
  const location = useLocation();
  
  // Hardcoded example email - fetch from session later
  const email = "tousifqbal10083@gmail.com"; 

  const handleLogout = async () => {
    // Note: window.location.href forces a full page reload, which is often desired after logout
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  /**
   * Function to determine the page title based on the current pathname
   */
  const getPageTitle = (pathname) => {
    // Remove leading slash and capitalize
    const path = pathname.replace(/^\//, '');
    if (path === '') return 'Dashboard'; // Handle index route
    
    // Simple title case for common paths (e.g., 'products' -> 'Products', 'orders' -> 'Orders')
    return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const currentTitle = getPageTitle(location.pathname);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={toggleSidebar}>
          ☰
        </button>
        <div>
          {/* Dynamically display the current page title */}
          <h1 className="navbar-title">{currentTitle}</h1>
          <p className="navbar-subtitle">Perfume-Box admin overview</p>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-user">
          <div className="avatar-circle">
            {/* Display first letter of email or 'A' as fallback */}
            {email ? email[0].toUpperCase() : "A"}
          </div>
          <span className="navbar-email">{email}</span>
        </div>
        <button className="btn-outline" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}