// src/pages/Orders.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        payment_status,
        order_status,
        created_at,
        customers:customer_id (full_name, phone, email, address)
      `)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setOrders(data || []);
  }

  // Update Status or Payment
  async function updateOrder(id, field, value) {
    const { error } = await supabase
      .from("orders")
      .update({ [field]: value })
      .eq("id", id);

    if (error) console.error(error);

    // Update UI immediately
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }

  return (
    <div>
      <h2 className="page-title">Orders</h2>
      <p className="page-subtitle">Manage customer orders and track status.</p>

      <div className="table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Total (৳)</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Placed At</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                {/* CLICKABLE ORDER ID */}
                <td
                  className="clickable-text"
                  onClick={() => setSelectedOrder(o)}
                  style={{ color: "#f525bd", cursor: "pointer", fontWeight: "bold" }}
                >
                  #{o.id.slice(0, 8)}
                </td>

                <td style={{ fontWeight: "500" }}>
                  {o.customers?.full_name || "Guest"}
                </td>

                <td>{o.customers?.phone || "-"}</td>

                <td>৳ {o.total_amount?.toLocaleString()}</td>

                {/* PAYMENT STATUS */}
                <td>
                  <select
                    className="status-dropdown"
                    value={o.payment_status}
                    onChange={(e) => updateOrder(o.id, "payment_status", e.target.value)}
                    style={{
                      background: o.payment_status === "paid" ? "#d1fae5" : "#fee2e2",
                      color: o.payment_status === "paid" ? "#065f46" : "#991b1b",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid transparent",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </td>

                {/* ORDER STATUS (Matched with Frontend) */}
                <td>
                  <select
                    className="status-dropdown"
                    value={o.order_status} // This loads the current status
                    onChange={(e) => updateOrder(o.id, "order_status", e.target.value)}
                    style={{
                      background: 
                        o.order_status === "received" ? "#dbeafe" :
                        o.order_status === "dispatched" ? "#fef9c3" :
                        o.order_status === "delivered" ? "#d1fae5" : "#f3f4f6",
                      color: 
                        o.order_status === "received" ? "#1e40af" :
                        o.order_status === "dispatched" ? "#854d0e" :
                        o.order_status === "delivered" ? "#065f46" : "#374151",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid transparent",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    {/* IMPORTANT: Values must match your frontend logic EXACTLY */}
                    <option value="received">Received</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>

                <td>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ORDER DETAILS POPUP */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              width: "450px",
              maxWidth: "90%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              animation: "fadeIn 0.2s ease-out"
            }}
          >
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
               <h3 style={{margin: 0, fontSize: "1.2rem"}}>Order Details</h3>
               <span style={{fontSize: "0.8rem", color: "#888"}}>#{selectedOrder.id.slice(0, 8)}</span>
            </div>

            <div style={{display: "grid", gap: "12px", fontSize: "0.95rem", color: "#444"}}>
                <p><b>Customer:</b> {selectedOrder.customers?.full_name}</p>
                <p><b>Phone:</b> {selectedOrder.customers?.phone}</p>
                <p><b>Address:</b> {selectedOrder.customers?.address}</p>
                <hr style={{border: "none", borderTop: "1px solid #eee", margin: "10px 0"}}/>
                <p><b>Total Amount:</b> ৳{selectedOrder.total_amount?.toLocaleString()}</p>
                <p><b>Payment Status:</b> <span style={{textTransform: "capitalize"}}>{selectedOrder.payment_status}</span></p>
            </div>

            <button
              className="primary-btn"
              style={{ 
                  marginTop: "25px", 
                  width: "100%", 
                  padding: "12px", 
                  background: "black", 
                  color: "white", 
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold"
              }}
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}