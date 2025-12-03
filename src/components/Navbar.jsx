import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase/client.js";
import { useLocation } from "react-router-dom";
import "./Navbar.css"; 

// Simple SVG Icons
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

export default function Navbar({ toggleSidebar }) {
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null); // State for the real user
  const dropdownRef = useRef(null);
  
  // 1. FETCH REAL USER ON MOUNT
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Title Logic
  const getPageTitle = (pathname) => {
    const path = pathname.replace(/^\//, '');
    if (path === '') return 'Dashboard';
    // Handle 'ads' route specifically if needed, or generic title case
    if (path === 'ads') return 'Ads & Banners';
    return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const currentTitle = getPageTitle(location.pathname);

  // 2. COMPUTE DISPLAY NAME (Fallback to email prefix if no name)
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Admin";
  const displayEmail = user?.email || "Loading...";
  const initial = displayName ? displayName[0].toUpperCase() : "A";

  return (
    <header className="navbar">
      {/* LEFT: Hamburger & Title */}
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={toggleSidebar}>
          ☰
        </button>
        <div className="navbar-title-wrapper">
          <h1 className="navbar-title">{currentTitle}</h1>
          <p className="navbar-subtitle">Perfume-Box Admin</p>
        </div>
      </div>

      {/* RIGHT: Profile Dropdown */}
      <div className="navbar-right" ref={dropdownRef}>
        <div 
          className={`profile-trigger ${isDropdownOpen ? "active" : ""}`} 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <div className="avatar-circle">
            {initial}
          </div>
        </div>

        {/* POPUP DROPDOWN */}
        <div className={`profile-dropdown ${isDropdownOpen ? "show" : ""}`}>
          <div className="dropdown-header">
            <div className="dropdown-avatar">
              <UserIcon />
            </div>
            <div className="dropdown-user-info">
              {/* Dynamic Name */}
              <span className="dropdown-name" title={displayName}>
                {displayName}
              </span>
              {/* Dynamic Email */}
              <span className="dropdown-email" title={displayEmail}>
                {displayEmail}
              </span>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <button className="dropdown-item logout" onClick={handleLogout}>
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}