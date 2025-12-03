// src/pages/Orders.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState(""); // 1. Search State
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
        payment_method,
        trx_id,
        created_at,
        customers:customer_id (full_name, phone, email, address)
      `)
      .order("created_at", { ascending: false }); // 2. Sorted by Date

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

  // 3. Delete Order Logic
  async function deleteOrder(id) {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Failed to delete order");
    } else {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    }
  }

  // 4. Search Filter Logic
  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase();
    const name = o.customers?.full_name?.toLowerCase() || "";
    const phone = o.customers?.phone?.toLowerCase() || "";
    const id = o.id.toLowerCase();
    
    return name.includes(term) || phone.includes(term) || id.includes(term);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
            <h2 className="page-title">Orders</h2>
            <p className="page-subtitle">Manage customer orders and track status.</p>
        </div>
        
        {/* --- SEARCH BAR --- */}
        <input 
            type="text"
            placeholder="Search Name, Phone, or Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
                padding: "10px 15px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                width: "300px",
                outline: "none"
            }}
        />
      </div>

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
              <th>Action</th> {/* New Column */}
            </tr>
          </thead>

          <tbody>
            {filteredOrders.map((o) => (
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

                {/* ORDER STATUS */}
                <td>
                  <select
                    className="status-dropdown"
                    value={o.order_status} 
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
                    <option value="received">Received</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>

                <td>{new Date(o.created_at).toLocaleDateString()}</td>

                {/* DELETE BUTTON */}
                <td>
                    <button 
                        onClick={() => deleteOrder(o.id)}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1.2rem",
                            opacity: 0.7
                        }}
                        title="Delete Order"
                    >
                        🗑️
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredOrders.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
                No orders found.
            </div>
        )}
      </div>

      {/* DETAILS MODAL (Pop-up) */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)} style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              width: "450px",
              maxWidth: "90%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
            }}
          >
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
               <h3 style={{margin: 0, fontSize: "1.2rem"}}>Order Details</h3>
               <button onClick={() => setSelectedOrder(null)} style={{background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer"}}>✕</button>
            </div>

            <div style={{display: "grid", gap: "12px", fontSize: "0.95rem", color: "#444"}}>
                <p><b>Order ID:</b> #{selectedOrder.id}</p>
                <p><b>Date:</b> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                <hr style={{border: "none", borderTop: "1px solid #eee", margin: "5px 0"}}/>
                
                <p><b>Customer:</b> {selectedOrder.customers?.full_name}</p>
                <p><b>Phone:</b> {selectedOrder.customers?.phone}</p>
                <p><b>Address:</b> {selectedOrder.customers?.address}</p>
                <hr style={{border: "none", borderTop: "1px solid #eee", margin: "5px 0"}}/>
                
                <p><b>Total Amount:</b> ৳{selectedOrder.total_amount?.toLocaleString()}</p>
                <p><b>Payment Method:</b> {selectedOrder.payment_method} 
                   {selectedOrder.trx_id ? ` (Trx: ${selectedOrder.trx_id})` : ""}
                </p>
            </div>

            <button
              style={{ 
                  marginTop: "25px", width: "100%", padding: "12px", 
                  background: "black", color: "white", borderRadius: "8px", 
                  border: "none", cursor: "pointer", fontWeight: "bold" 
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