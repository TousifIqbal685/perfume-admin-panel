import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

export default function Ads() {
  const [ads, setAds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newLink, setNewLink] = useState("");

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds(data || []);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    // 1. Upload Image
    const filename = `banner-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("ad-images").upload(filename, file);
    
    if (uploadError) {
      alert("Error uploading image");
      setUploading(false);
      return;
    }

    // 2. Get URL
    const { data: urlData } = supabase.storage.from("ad-images").getPublicUrl(filename);
    
    // 3. Save to DB
    const { error: dbError } = await supabase.from("ads").insert([{
      image_url: urlData.publicUrl,
      link: newLink,
      is_active: true
    }]);

    if (!dbError) {
      setNewLink("");
      // Reset file input
      e.target.value = null;
      fetchAds();
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this banner?")) return;
    
    await supabase.from("ads").delete().eq("id", id);
    fetchAds();
  };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from("ads").update({ is_active: !currentStatus }).eq("id", id);
    fetchAds();
  };

  return (
    <div className="page-container" style={{ padding: "20px" }}>
      <h2 className="page-title">Ads & Banners Management</h2>

      {/* --- Upload Section (More Organized) --- */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", marginBottom: "30px", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        <h3 style={{marginTop: 0, marginBottom: "15px", fontSize: "1.1rem"}}>Add New Banner</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "500px" }}>
          <div>
            <label style={{display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px"}}>Destination Link (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. /products/men" 
              value={newLink} 
              onChange={(e) => setNewLink(e.target.value)}
              className="input"
              style={{ width: "100%" }}
            />
          </div>
          <div>
             <label style={{display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px"}}>Banner Image</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleUpload} 
              disabled={uploading}
              style={{ display: "block" }}
            />
          </div>
          
          {uploading && <span style={{color: "blue", fontSize: "14px"}}>Uploading & Saving...</span>}
        </div>
        <p style={{fontSize: '12px', color: '#666', marginTop: "15px", fontStyle: "italic"}}>Recommended size: 1200x400 px (Landscape)</p>
      </div>

      {/* --- List Section (Grid Layout for Smaller Previews) --- */}
      <h3 style={{marginBottom: "15px", fontSize: "1.1rem"}}>Existing Banners</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
        {ads.map((ad) => (
          <div key={ad.id} style={{ 
              border: "1px solid #eee", 
              borderRadius: "8px", 
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              opacity: ad.is_active ? 1 : 0.7,
              transition: "all 0.2s"
            }}>
            
            {/* Banner Preview */}
            <div style={{ height: "140px", overflow: "hidden", background: "#f3f4f6" }}>
              <img src={ad.image_url} alt="Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            
            {/* Banner Details & Actions */}
            <div style={{ padding: "15px" }}>
              <div style={{ marginBottom: "15px" }}>
                 <span style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "2px" }}>Link:</span>
                 <span style={{ fontSize: "14px", color: "blue", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                    {ad.link || "No Link"}
                 </span>
              </div>
              
              <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
                {/* Enable/Disable Toggle Button */}
                <button 
                  onClick={() => toggleActive(ad.id, ad.is_active)} 
                  style={{ 
                    flex: 1,
                    cursor: "pointer", 
                    padding: "8px", 
                    borderRadius: "6px", 
                    border: "1px solid transparent", 
                    background: ad.is_active ? "#dcfce7" : "#f3f4f6", 
                    color: ad.is_active ? "#166534" : "#374151",
                    fontSize: "13px",
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                >
                  {ad.is_active ? "● Active" : "○ Disabled"}
                </button>
                
                {/* Delete Button */}
                <button 
                  onClick={() => handleDelete(ad.id)} 
                  style={{ 
                    cursor: "pointer",
                    padding: "8px 12px", 
                    borderRadius: "6px", 
                    border: "1px solid #fee2e2",
                    background: "#fff",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#fee2e2"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#fff"}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {ads.length === 0 && <p style={{color: "#666", fontStyle: "italic"}}>No banners uploaded yet.</p>}
    </div>
  );
}