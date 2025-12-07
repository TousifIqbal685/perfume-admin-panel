import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css"; // <--- IMPORT THE CSS HERE

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation();

  return (
    <aside className={`sidebar-drawer ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="logo-dot" />
        <div className="sidebar-title-text">
          <span className="sidebar-title-main">Perfume Admin</span>
          <span className="sidebar-title-sub">Control Panel</span>
        </div>
        {/* Close button only visible on mobile via CSS */}
        <button className="sidebar-close" onClick={onClose}>✕</button>
      </div>

      <nav className="sidebar-nav">

        <Link
          to="/"
          className={`sidebar-link ${pathname === "/" ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="sidebar-icon">🏠</span>
          <span>Dashboard</span>
        </Link>

        {/* Products Page */}
        <Link
          to="/products"
          className={`sidebar-link ${
            pathname.startsWith("/products") ? "active" : ""
          }`}
          onClick={onClose}
        >
          <span className="sidebar-icon">🧴</span>
          <span>Products</span>
        </Link>

        {/* Orders Page */}
        <Link
          to="/orders"
          className={`sidebar-link ${
            pathname.startsWith("/orders") ? "active" : ""
          }`}
          onClick={onClose}
        >
          <span className="sidebar-icon">📦</span>
          <span>Orders</span>
        </Link>

        {/* Finance (Revenue) Page */}
        <Link
          to="/revenue"
          className={`sidebar-link ${
            pathname.startsWith("/revenue") ? "active" : ""
          }`}
          onClick={onClose}
        >
          <span className="sidebar-icon">💰</span>
          <span>Finance</span>
        </Link>

        {/* Ads Management Page */}
        <Link
          to="/ads"
          className={`sidebar-link ${
            pathname.startsWith("/ads") ? "active" : ""
          }`}
          onClick={onClose}
        >
          <span className="sidebar-icon">📢</span>
          <span>Ads & Banners</span>
        </Link>

      </nav>
    </aside>
  );
}