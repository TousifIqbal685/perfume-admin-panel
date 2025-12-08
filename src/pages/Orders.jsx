import React, { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    // Fetch order items + product pricing details to detect size
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        payment_status,
        order_status,
        payment_method,
        trx_id,
        shipping_fee,
        discount,
        created_at,
        customers:customer_id (full_name, phone, email, address),
        order_items (
          quantity,
          price,
          products:product_id ( 
            title, 
            main_image_url,
            price,
            discounted_price,
            price_5ml, 
            price_10ml, 
            volume_ml 
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setOrders(data || []);
  }

  async function updateOrder(id, field, value) {
    const { error } = await supabase
      .from("orders")
      .update({ [field]: value })
      .eq("id", id);

    if (error) console.error(error);

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }

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

  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase();
    const name = o.customers?.full_name?.toLowerCase() || "";
    const phone = o.customers?.phone?.toLowerCase() || "";
    const id = o.id.toLowerCase();
    return name.includes(term) || phone.includes(term) || id.includes(term);
  });

  // --- HELPER: DETECT SIZE BASED ON PRICE ---
  const getSizeLabel = (item) => {
    const p = item.products;
    if (!p) return ""; // Fallback

    // Check Decant Prices
    if (Number(item.price) === Number(p.price_5ml)) return "5ml";
    if (Number(item.price) === Number(p.price_10ml)) return "10ml";
    
    // Check Full Bottle Prices (Original or Discounted)
    if (Number(item.price) === Number(p.price) || Number(item.price) === Number(p.discounted_price)) {
        return p.volume_ml ? `${p.volume_ml}ml` : "Full Bottle";
    }

    // Fallback if price changed since purchase
    return p.volume_ml ? `${p.volume_ml}ml` : "Full Bottle";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
            <h2 className="page-title">Orders</h2>
            <p className="page-subtitle">Manage customer orders and track status.</p>
        </div>
        
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
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id}>
                <td
                  className="clickable-text"
                  onClick={() => setSelectedOrder(o)}
                  style={{ color: "#f525bd", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
                  title="Click to view full details"
                >
                  #{o.id.slice(0, 8)}
                </td>
                <td style={{ fontWeight: "500" }}>{o.customers?.full_name || "Guest"}</td>
                <td>{o.customers?.phone || "-"}</td>
                <td>৳ {o.total_amount?.toLocaleString()}</td>
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
                <td>
                    <button 
                        onClick={() => deleteOrder(o.id)}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", opacity: 0.7 }}
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

      {/* --- DETAILED ORDER PREVIEW MODAL --- */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)} style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: "0",
              borderRadius: "16px",
              width: "700px",
              maxWidth: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div style={{padding: "20px 30px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", borderTopLeftRadius: "16px", borderTopRightRadius: "16px"}}>
               <div>
                   <h3 style={{margin: 0, fontSize: "1.25rem", fontWeight: "700"}}>Order Preview</h3>
                   <span style={{fontSize: "0.85rem", color: "#666", fontFamily: "monospace"}}>#{selectedOrder.id}</span>
               </div>
               <button onClick={() => setSelectedOrder(null)} style={{background:"none", border:"none", fontSize:"1.5rem", cursor:"pointer", color: "#666"}}>✕</button>
            </div>

            <div style={{padding: "30px"}}>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px"}}>
                    <div style={{background: "#f8f9fa", padding: "15px", borderRadius: "8px"}}>
                        <h4 style={{marginTop: 0, marginBottom: "10px", fontSize: "0.9rem", textTransform: "uppercase", color: "#888"}}>Customer</h4>
                        <p style={{fontWeight: "bold", margin: "0 0 5px 0"}}>{selectedOrder.customers?.full_name}</p>
                        <p style={{margin: "0 0 5px 0", fontSize: "0.9rem"}}>{selectedOrder.customers?.phone}</p>
                        <p style={{margin: 0, fontSize: "0.9rem"}}>{selectedOrder.customers?.email}</p>
                    </div>
                    <div style={{background: "#f8f9fa", padding: "15px", borderRadius: "8px"}}>
                        <h4 style={{marginTop: 0, marginBottom: "10px", fontSize: "0.9rem", textTransform: "uppercase", color: "#888"}}>Shipping To</h4>
                        <p style={{margin: 0, fontSize: "0.95rem", lineHeight: "1.5"}}>{selectedOrder.customers?.address || "No address provided"}</p>
                    </div>
                </div>

                <h4 style={{fontSize: "1rem", fontWeight: "700", marginBottom: "15px"}}>Items Ordered</h4>
                <div style={{border: "1px solid #eee", borderRadius: "8px", overflow: "hidden", marginBottom: "30px"}}>
                    <table style={{width: "100%", borderCollapse: "collapse", fontSize: "0.9rem"}}>
                        <thead style={{background: "#f3f4f6", textAlign: "left"}}>
                            <tr>
                                <th style={{padding: "10px 15px"}}>Product</th>
                                <th style={{padding: "10px 15px", textAlign: "center"}}>Qty</th>
                                <th style={{padding: "10px 15px", textAlign: "right"}}>Price</th>
                                <th style={{padding: "10px 15px", textAlign: "right"}}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedOrder.order_items?.map((item, idx) => (
                                <tr key={idx} style={{borderBottom: "1px solid #f3f4f6"}}>
                                    <td style={{padding: "12px 15px", display: "flex", alignItems: "center", gap: "10px"}}>
                                        <img 
                                            src={item.products?.main_image_url || "https://via.placeholder.com/40"} 
                                            alt="prod" 
                                            style={{width: "40px", height: "40px", objectFit: "contain", borderRadius: "4px", border: "1px solid #eee"}}
                                        />
                                        <div>
                                            <span style={{fontWeight: "600", color: "#111"}}>{item.products?.title || "Unknown Product"}</span>
                                            {/* --- UPDATED: Size in brackets next to name --- */}
                                            <span style={{color: "#666", marginLeft: "5px", fontWeight: "500"}}>
                                                ({getSizeLabel(item)})
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{padding: "12px 15px", textAlign: "center"}}>{item.quantity}</td>
                                    <td style={{padding: "12px 15px", textAlign: "right"}}>৳ {item.price.toLocaleString()}</td>
                                    <td style={{padding: "12px 15px", textAlign: "right", fontWeight: "bold"}}>
                                        ৳ {(item.quantity * item.price).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{display: "flex", justifyContent: "flex-end"}}>
                    <div style={{width: "250px", fontSize: "0.95rem"}}>
                        <div style={{display: "flex", justifyContent: "space-between", marginBottom: "8px"}}>
                            <span style={{color: "#666"}}>Subtotal</span>
                            <span>৳ {selectedOrder.order_items?.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}</span>
                        </div>
                        <div style={{display: "flex", justifyContent: "space-between", marginBottom: "8px"}}>
                            <span style={{color: "#666"}}>Shipping</span>
                            <span>+ ৳ {selectedOrder.shipping_fee || 0}</span>
                        </div>
                        {selectedOrder.discount > 0 && (
                            <div style={{display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "green"}}>
                                <span>Discount</span>
                                <span>- ৳ {selectedOrder.discount}</span>
                            </div>
                        )}
                        <div style={{borderTop: "2px solid #eee", margin: "10px 0"}}></div>
                        <div style={{display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "bold"}}>
                            <span>Total</span>
                            <span>৳ {selectedOrder.total_amount?.toLocaleString()}</span>
                        </div>
                        
                        <div style={{marginTop: "15px", fontSize: "0.85rem", color: "#666", textAlign: "right"}}>
                            Method: <span style={{fontWeight: "600", textTransform: "uppercase"}}>{selectedOrder.payment_method}</span>
                            {selectedOrder.trx_id && <div style={{marginTop: "4px"}}>TRX: <span style={{fontFamily: "monospace"}}>{selectedOrder.trx_id}</span></div>}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{padding: "20px 30px", background: "#f9fafb", borderTop: "1px solid #eee", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px", textAlign: "right"}}>
                <button
                    onClick={() => setSelectedOrder(null)}
                    style={{ 
                        padding: "10px 25px", 
                        background: "black", color: "white", borderRadius: "8px", 
                        border: "none", cursor: "pointer", fontWeight: "bold" 
                    }}
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}