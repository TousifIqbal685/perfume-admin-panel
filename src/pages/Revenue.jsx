import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import "./Revenue.css"; 

export default function Revenue() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  // 1. New State for Search
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRevenue();
  }, []);

  async function fetchRevenue() {
    // Fetch only PAID orders
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        created_at,
        payment_method,
        trx_id,
        customers:customer_id (full_name, phone)
      `)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    
    setTransactions(data || []);
    
    // Calculate Total
    const total = data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    setTotalRevenue(total);
    setLoading(false);
  }

  // 2. Filter Logic
  const filteredTransactions = transactions.filter((t) => {
    const query = searchQuery.toLowerCase();
    const orderId = t.id?.toLowerCase() || "";
    const customerName = t.customers?.full_name?.toLowerCase() || "";
    
    // Search checks both ID and Name
    return orderId.includes(query) || customerName.includes(query);
  });

  return (
    <div className="page-container">
      <div className="revenue-header">
        <div>
            <h2 className="page-title">Revenue Tracker</h2>
            <p className="page-subtitle">Overview of confirmed earnings.</p>
        </div>
        <div className="total-badge">
            <span>Total Earnings</span>
            <h3>৳ {totalRevenue.toLocaleString()}</h3>
        </div>
      </div>

      {/* 3. Search Bar UI */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="🔍 Search by Order ID or Customer Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "12px 16px",
            width: "100%",
            maxWidth: "400px",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            fontSize: "0.95rem",
            outline: "none",
            boxShadow: "0 2px 5px rgba(0,0,0,0.02)"
          }}
        />
      </div>

      <div className="table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Trx ID</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* 4. Use filteredTransactions instead of transactions */}
            {filteredTransactions.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td style={{fontFamily:'monospace'}}>#{t.id.slice(0, 8)}</td>
                <td>
                    <div style={{fontWeight:'bold'}}>{t.customers?.full_name}</div>
                    <div style={{fontSize:'0.8em', color:'#888'}}>{t.customers?.phone}</div>
                </td>
                <td style={{textTransform:'capitalize'}}>{t.payment_method}</td>
                <td style={{fontFamily:'monospace'}}>{t.trx_id || "-"}</td>
                <td className="text-right" style={{fontWeight:'bold', color:'green'}}>
                    + ৳ {t.total_amount.toLocaleString()}
                </td>
              </tr>
            ))}
            
            {filteredTransactions.length === 0 && !loading && (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'30px'}}>No matching records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}