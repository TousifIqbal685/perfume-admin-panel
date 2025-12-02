// src/pages/Revenue.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import "./Revenue.css"; // We will create this CSS below

export default function Revenue() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

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
            {transactions.map((t) => (
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
            {transactions.length === 0 && !loading && (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'30px'}}>No paid transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}