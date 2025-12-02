// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; 
import { supabase } from "../supabase/client";
import "./Dashboard.css"; 

// Simple SVG Icons
const BoxIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const CartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const MoneyIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const AdIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>; // New Icon

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    activeAds: 0, // New Stat
  });

  useEffect(() => {
    async function loadStats() {
      const [
        { count: productCount }, 
        { count: orderCount }, 
        paidRevenue,
        { count: adCount } // New Fetch
      ] = await Promise.all([
          // Count products
          supabase.from("products").select("*", { count: "exact", head: true }),

          // Count all orders
          supabase.from("orders").select("*", { count: "exact", head: true }),

          // Load ONLY PAID Orders for Revenue
          supabase
            .from("orders")
            .select("total_amount")
            .eq("payment_status", "paid")
            .then(({ data }) => ({
              sum: data?.reduce(
                (acc, row) => acc + (row.total_amount || 0),
                0
              ),
            })),
            
          // Count Active Ads
          supabase.from("ads").select("*", { count: "exact", head: true }).eq("is_active", true),
        ]);

      setStats({
        products: productCount || 0,
        orders: orderCount || 0,
        revenue: paidRevenue.sum || 0,
        activeAds: adCount || 0,
      });
    }

    loadStats();
  }, []);

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-subtitle">
          Overview of your store performance.
        </p>
      </div>

      <div className="dashboard-grid">
        
        {/* PRODUCTS CARD */}
        <Link to="/products" className="stat-card pink-hover">
          <div className="stat-icon-bg">
            <BoxIcon />
          </div>
          <div>
            <p className="stat-label">Total Products</p>
            <p className="stat-value">{stats.products}</p>
          </div>
        </Link>

        {/* ORDERS CARD */}
        <Link to="/orders" className="stat-card blue-hover">
          <div className="stat-icon-bg">
            <CartIcon />
          </div>
          <div>
            <p className="stat-label">Total Orders</p>
            <p className="stat-value">{stats.orders}</p>
          </div>
        </Link>

        {/* REVENUE CARD */}
        <Link to="/revenue" className="stat-card green-hover">
          <div className="stat-icon-bg">
            <MoneyIcon />
          </div>
          <div>
            <p className="stat-label">Total Revenue</p>
            <p className="stat-value">৳ {stats.revenue.toLocaleString()}</p>
          </div>
        </Link>

        {/* ADS CARD (New) */}
        <Link to="/ads" className="stat-card purple-hover" style={{borderLeft: "4px solid #9333ea"}}>
          <div className="stat-icon-bg" style={{color: "#9333ea", background: "#f3e8ff"}}>
            <AdIcon />
          </div>
          <div>
            <p className="stat-label">Active Banners</p>
            <p className="stat-value">{stats.activeAds}</p>
          </div>
        </Link>

      </div>
    </div>
  );
}