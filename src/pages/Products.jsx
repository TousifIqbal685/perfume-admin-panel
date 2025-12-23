import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase/client";
import "./Products.css";

function generateSlug(brand, title) {
  return `${brand} ${title}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export default function Products() {
  const categories = [
    { id: "243e4b4a-aa06-4679-9c7e-bd96db02de34", name: "Unisex" },
    { id: "2ceb546a-4940-448a-9987-83870d2638f3", name: "Women" },
    { id: "7741f377-e4f5-45e8-b49b-9f2765c2ea60", name: "Car Perfume" },
    { id: "e06e7a2b-2f05-4baa-90da-1573d82ae74b", name: "Men" },
  ];

  const perfumeTypes = ["Niche", "Arabian", "Designer"];

  /* --- STATES --- */
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const productRefs = useRef({});
  const [previousStock, setPreviousStock] = useState({});

  // FORM STATE
  const [form, setForm] = useState({
    title: "", brand: "", perfume_type: "",
    price: "", volume_ml: "", 
    discounted_price: "", 
    price_5ml: "", price_10ml: "", 
    stock: "", bestseller_priority: 0,
    description: "", top_notes: "", heart_notes: "", base_notes: "", category_id: "",
  });
  
  // UNIFIED IMAGE STATE FOR ADDING
  // Stores File objects
  const [addImages, setAddImages] = useState([]); 
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // EDIT STATE
  const [editingProduct, setEditingProduct] = useState(null); 
  const [editForm, setEditForm] = useState({}); 
  
  // UNIFIED IMAGE STATE FOR EDITING
  // Stores objects: { type: 'url' | 'file', src: string | File }
  const [editImages, setEditImages] = useState([]); 

  /* --- LOAD DATA --- */
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_images (id, image_url)
      `)
      .order("bestseller_priority", { ascending: false }) 
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    
    const stockMap = {};
    data?.forEach((p) => stockMap[p.id] = p.stock);
    setPreviousStock(stockMap);
    
    setProducts(data || []);
  }

  async function autoSave(id, fields) {
    const { error } = await supabase.from("products").update(fields).eq("id", id);
    if (error) console.error(error);
  }

  /* --- IMAGE HELPERS --- */
  const uploadImagesToStorage = async (files, slug) => {
    const uploadedUrls = [];
    for (let file of files) {
      // Clean filename
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filename = `${slug}-${Date.now()}-${cleanName}`;
      
      const { error } = await supabase.storage.from("cms-media").upload(filename, file);
      if (!error) {
        const { data } = supabase.storage.from("cms-media").getPublicUrl(filename);
        uploadedUrls.push(data.publicUrl);
      } else {
        console.error("Upload error:", error);
      }
    }
    return uploadedUrls;
  };

  /* --- ADD MODE IMAGE HANDLERS --- */
  const handleAddImageSelect = (e) => {
    if (e.target.files) {
      setAddImages((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };
  const removeAddImage = (index) => {
    setAddImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* --- EDIT MODE IMAGE HANDLERS --- */
  const handleEditImageSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        type: 'file',
        src: file // The actual File object
      }));
      setEditImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeEditImage = (index) => {
    // Just remove from the array. 
    // If index 0 is removed, index 1 becomes index 0 (the new main image) automatically.
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  /* --- ADD PRODUCT SUBMIT --- */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (addImages.length === 0) {
        alert("Please select at least one image.");
        setSaving(false);
        return;
    }

    const slug = generateSlug(form.brand, form.title);
    
    // 1. Upload all images
    const uploadedUrls = await uploadImagesToStorage(addImages, slug);
    
    // 2. Determine Main vs Extras based on Order
    // Index 0 is Main, Index 1+ are Extras
    const mainImageUrl = uploadedUrls[0]; 
    const extraImageUrls = uploadedUrls.slice(1); 

    // 3. Insert Product
    const { data: inserted, error } = await supabase
      .from("products")
      .insert([{
        ...form, 
        slug, 
        volume_ml: form.volume_ml ? Number(form.volume_ml) : null,
        price: Number(form.price),
        discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
        price_5ml: form.price_5ml ? Number(form.price_5ml) : null,
        price_10ml: form.price_10ml ? Number(form.price_10ml) : null,
        stock: Number(form.stock), 
        bestseller_priority: Number(form.bestseller_priority) || 0,
        main_image_url: mainImageUrl, // First image goes here
        is_visible: true, 
        is_bestseller: false,
      }])
      .select()
      .single();

    if (error) {
      setMessage("❌ Error adding product");
      setSaving(false);
      return;
    }

    // 4. Insert Extra Images
    if (extraImageUrls.length > 0) {
      const imageInserts = extraImageUrls.map(url => ({
        product_id: inserted.id, image_url: url
      }));
      await supabase.from("product_images").insert(imageInserts);
    }

    setSaving(false);
    setMessage("✅ Product Added Successfully!");
    
    // Reset Form
    setForm({
        title: "", brand: "", perfume_type: "",
        price: "", volume_ml: "", discounted_price: "", 
        price_5ml: "", price_10ml: "",
        stock: "", bestseller_priority: 0,
        description: "", top_notes: "", heart_notes: "", base_notes: "", category_id: "",
    });
    setAddImages([]);
    loadProducts();
  };

  /* --- EDIT PRODUCT LOGIC --- */
  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({ ...product });
    
    // Combine existing images into one unified array for the UI
    // Order: Main Image -> Extra Images
    let combinedImages = [];
    
    if (product.main_image_url) {
        combinedImages.push({ type: 'url', src: product.main_image_url });
    }
    
    if (product.product_images && product.product_images.length > 0) {
        const extras = product.product_images.map(img => ({ type: 'url', src: img.image_url }));
        combinedImages = [...combinedImages, ...extras];
    }

    setEditImages(combinedImages);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // 1. Process Images
    // We need to iterate through editImages. 
    // If it's a URL, keep it. If it's a File, upload it.
    let finalImageUrls = [];
    const filesToUpload = [];
    const fileIndices = [];

    // Separate existing URLs from new files to maintain order
    for (let i = 0; i < editImages.length; i++) {
        const img = editImages[i];
        if (img.type === 'url') {
            finalImageUrls[i] = img.src;
        } else {
            filesToUpload.push(img.src);
            fileIndices.push(i); // Remember where this file belongs in the array
        }
    }

    // Upload new files
    if (filesToUpload.length > 0) {
        const uploaded = await uploadImagesToStorage(filesToUpload, editingProduct.slug);
        // Place uploaded URLs back into their correct positions
        uploaded.forEach((url, idx) => {
            const originalIndex = fileIndices[idx];
            finalImageUrls[originalIndex] = url;
        });
    }

    // Filter out undefined holes (just in case)
    finalImageUrls = finalImageUrls.filter(u => u);

    const newMainImage = finalImageUrls[0] || null;
    const newExtraImages = finalImageUrls.slice(1);

    // 2. Update Product Data (including Main Image)
    const { error: updateError } = await supabase.from("products").update({
        title: editForm.title, 
        brand: editForm.brand, 
        perfume_type: editForm.perfume_type,
        volume_ml: editForm.volume_ml ? Number(editForm.volume_ml) : null,
        price: Number(editForm.price),
        discounted_price: editForm.discounted_price ? Number(editForm.discounted_price) : null,
        price_5ml: editForm.price_5ml ? Number(editForm.price_5ml) : null,
        price_10ml: editForm.price_10ml ? Number(editForm.price_10ml) : null,
        stock: Number(editForm.stock), 
        bestseller_priority: Number(editForm.bestseller_priority) || 0,
        description: editForm.description,
        top_notes: editForm.top_notes, 
        heart_notes: editForm.heart_notes,
        base_notes: editForm.base_notes, 
        category_id: editForm.category_id,
        main_image_url: newMainImage // Update main image based on index 0
    }).eq("id", editingProduct.id);

    if (updateError) {
        console.error("Update Error", updateError);
        setSaving(false);
        return;
    }

    // 3. Update Extra Images (Product Images Table)
    // Strategy: Delete all existing extras for this product and re-insert the list.
    // This ensures the order matches exactly what the user sees in the UI.
    
    // Delete old extras
    await supabase.from("product_images").delete().eq("product_id", editingProduct.id);

    // Insert new extras (if any)
    if (newExtraImages.length > 0) {
        const inserts = newExtraImages.map(url => ({
            product_id: editingProduct.id,
            image_url: url
        }));
        await supabase.from("product_images").insert(inserts);
    }

    setSaving(false);
    setEditingProduct(null); 
    loadProducts(); 
  };

  /* --- INLINE UPDATES --- */
  const autoUpdate = async (id, field, value) => {
    setProducts(prev => 
      prev.map(p => {
        if (p.id === id) {
          if (field === "is_visible") {
            const newVisible = value;
            const currentStock = p.stock;
            let stockToSave;
            
            if (!newVisible) {
                setPreviousStock(prevMap => ({ ...prevMap, [id]: currentStock }));
                stockToSave = 0; 
            } else {
                const restored = previousStock[id] || 0;
                stockToSave = restored === 0 ? 1 : restored;
            }
            
            autoSave(id, { is_visible: newVisible, stock: stockToSave });
            return { ...p, is_visible: newVisible, stock: stockToSave };
          }
          
          autoSave(id, { [field]: value });
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete product completely?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  /* --- SEARCH & SCROLL --- */
  const handleSearch = (val) => {
    setSearch(val);
    if (!val.trim()) return setSuggestions([]);
    const hits = products.filter(p => p.title.toLowerCase().includes(val.toLowerCase()));
    setSuggestions(hits.slice(0, 5));
  };

  const scrollToCard = (id) => {
    const el = productRefs.current[id];
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlight-card");
        setTimeout(() => {el.classList.remove("highlight-card");}, 2000);
    }
    setSuggestions([]);
    setSearch("");
  };

  return (
    <div className="page-container">
      <h2 className="page-title">Product Management</h2>

      {message && <p className="status-message">{message}</p>}

      {/* --- ADD PRODUCT FORM --- */}
      <div className="form-card">
        <h3 className="section-title">Add New Product</h3>
        <form onSubmit={handleAddSubmit}>
          <div className="form-grid-3">
            <div className="form-group"><label>Title*</label><input className="input" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} required/></div>
            <div className="form-group"><label>Brand*</label><input className="input" value={form.brand} onChange={e=>setForm({...form, brand: e.target.value})} required/></div>
            <div className="form-group"><label>Category*</label>
                <select className="input" value={form.category_id} onChange={e=>setForm({...form, category_id: e.target.value})} required>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
          </div>
          
          <div className="form-group" style={{maxWidth:'32%'}}>
                <label>Type</label>
                <select className="input" value={form.perfume_type} onChange={e=>setForm({...form, perfume_type: e.target.value})} >
                    <option value="">Select Type</option>
                    {perfumeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>

          {/* Pricing Grid with Volume */}
          <div className="form-grid-3">
            <div className="form-group">
                <label>Bottle Size (ml)</label>
                <input type="number" className="input" placeholder="e.g. 100" value={form.volume_ml} onChange={e=>setForm({...form, volume_ml: e.target.value})} />
            </div>
            <div className="form-group">
                <label>Full Bottle Price (৳)</label>
                <input type="number" className="input" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} required/>
            </div>
            <div className="form-group">
                <label>Discounted Price (৳)</label>
                <input type="number" className="input" value={form.discounted_price} onChange={e=>setForm({...form, discounted_price: e.target.value})} />
            </div>
          </div>
          
          <div className="form-grid-3">
             <div className="form-group">
                <label>Stock Quantity</label>
                <input type="number" className="input" value={form.stock} onChange={e=>setForm({...form, stock: e.target.value})} />
             </div>
             <div className="form-group">
                <label>Priority (1-100)</label>
                <input 
                    type="number" 
                    className="input" 
                    placeholder="100 = Top" 
                    min="0" 
                    max="100"
                    value={form.bestseller_priority} 
                    onChange={e=>setForm({...form, bestseller_priority: e.target.value})} 
                />
             </div>
          </div>

          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
             <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>Decant Pricing (Optional)</h4>
             <div className="form-grid-3">
                <div className="form-group">
                    <label>5ml Price (৳)</label>
                    <input type="number" className="input" value={form.price_5ml} onChange={e=>setForm({...form, price_5ml: e.target.value})} placeholder="e.g. 500" />
                </div>
                <div className="form-group">
                    <label>10ml Price (৳)</label>
                    <input type="number" className="input" value={form.price_10ml} onChange={e=>setForm({...form, price_10ml: e.target.value})} placeholder="e.g. 950" />
                </div>
             </div>
          </div>

          <div className="form-group"><label>Description</label><textarea className="input textarea" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} /></div>

          <div className="form-grid-3">
             <div className="form-group"><label>Top Notes</label><input className="input" value={form.top_notes} onChange={e=>setForm({...form, top_notes: e.target.value})} /></div>
             <div className="form-group"><label>Heart Notes</label><input className="input" value={form.heart_notes} onChange={e=>setForm({...form, heart_notes: e.target.value})} /></div>
             <div className="form-group"><label>Base Notes</label><input className="input" value={form.base_notes} onChange={e=>setForm({...form, base_notes: e.target.value})} /></div>
          </div>

          <div className="form-group">
            <label>Product Images (First one is Main Image)</label>
            <div className="image-upload-area">
                <input type="file" id="add-images" multiple accept="image/*" onChange={handleAddImageSelect} hidden />
                <label htmlFor="add-images" className="file-label">Click to Select Images</label>
            </div>
            <div className="preview-grid">
                {addImages.map((file, i) => (
                    <div key={i} className="preview-card">
                        <img src={URL.createObjectURL(file)} alt="preview" />
                        <button type="button" className="remove-btn" onClick={() => removeAddImage(i)}>✕</button>
                        {i === 0 && <span className="badge">1st</span>}
                    </div>
                ))}
            </div>
          </div>

          <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "+ Add Product"}</button>
        </form>
      </div>

      {/* --- INVENTORY LIST --- */}
      <h3 className="section-title">Inventory</h3>
      <div className="search-area">
        <input type="text" className="search-input" placeholder="Search products by title..." value={search} onChange={e => handleSearch(e.target.value)} />
        {suggestions.length > 0 && (
            <div className="search-dropdown">
                {suggestions.map(s => (
                    <div key={s.id} className="search-item" onClick={() => scrollToCard(s.id)}>
                        <img src={s.main_image_url} alt="product" />
                        <span>{s.title}</span>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="admin-card-grid">
        {products.map(p => (
            <div className={`admin-card ${!p.is_visible ? 'opacity-60' : ''}`} key={p.id} id={`product-${p.id}`} ref={el => productRefs.current[p.id] = el}>
                <div className="card-header">
                    <div className="admin-img-wrap">
                      <img 
                        src={p.main_image_url || "https://placehold.co/80x80/png"} 
                        className="admin-img" 
                        alt={p.title}
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/80x80/png"; }} 
                      />
                    </div>
                    <div className="card-info">
                        <h4 className="admin-title" title={p.title}>{p.title}</h4>
                        <p className="admin-brand">{p.brand}</p>
                        <div style={{display:'flex', gap:'5px', marginTop:'4px'}}>
                            {p.perfume_type && <span style={{fontSize:'11px', background:'#eee', padding:'2px 6px', borderRadius:'4px', color:'#555'}}>{p.perfume_type}</span>}
                            {p.volume_ml && <span style={{fontSize:'11px', background:'#eef', padding:'2px 6px', borderRadius:'4px', color:'#555'}}>{p.volume_ml}ml</span>}
                        </div>
                    </div>
                </div>
                
                <div className="card-body">
                    <div className="field-row"><label>Price</label><input type="number" className="admin-input-small" value={p.price} onChange={e => autoUpdate(p.id, "price", e.target.value)} /></div>
                    <div className="field-row"><label>Discount</label><input type="number" className="admin-input-small" value={p.discounted_price || ""} onChange={e => autoUpdate(p.id, "discounted_price", e.target.value)} /></div>
                    <div className="field-row"><label>Stock</label><input type="number" className="admin-input-small" value={p.stock} onChange={e => autoUpdate(p.id, "stock", e.target.value)} /></div>
                    <div className="field-row">
                        <label>Priority</label>
                        <input type="number" className="admin-input-small" style={{borderColor: '#ffd700'}} value={p.bestseller_priority || 0} onChange={e => autoUpdate(p.id, "bestseller_priority", e.target.value)} />
                    </div>
                    {(p.price_5ml || p.price_10ml) && (
                        <div className="field-row" style={{fontSize:'10px', color:'green', justifyContent:'flex-start'}}>
                             ✓ Has Decants
                        </div>
                    )}
                </div>

                <div className="card-footer">
                    <div className="toggle-wrapper">
                        <span>Visible</span>
                        <label className="switch">
                            <input type="checkbox" checked={p.is_visible} onChange={e => autoUpdate(p.id, "is_visible", e.target.checked)} />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <div className="toggle-wrapper">
                        <span>Hot</span>
                        <label className="switch">
                            <input type="checkbox" checked={p.is_bestseller || false} onChange={e => autoUpdate(p.id, "is_bestseller", e.target.checked)} />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <div style={{display: 'flex', gap: '8px'}}>
                        <button className="action-btn edit-btn" onClick={() => openEditModal(p)}>✏️</button>
                        <button className="action-btn delete-btn" onClick={() => handleDeleteProduct(p.id)}>🗑️</button>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* --- EDIT MODAL --- */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
            <div className="modal-content" 
                 style={{ maxWidth: '850px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
                 onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3>Edit Product</h3>
                    <button className="close-modal" onClick={() => setEditingProduct(null)}>✕</button>
                </div>
                
                <form onSubmit={handleEditSubmit}>
                    <div className="form-grid-3">
                        <div className="form-group"><label>Title</label><input className="input" value={editForm.title || ""} onChange={e=>setEditForm({...editForm, title: e.target.value})} /></div>
                        <div className="form-group"><label>Brand</label><input className="input" value={editForm.brand || ""} onChange={e=>setEditForm({...editForm, brand: e.target.value})} /></div>
                        <div className="form-group"><label>Category</label><select className="input" value={editForm.category_id || ""} onChange={e=>setEditForm({...editForm, category_id: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    </div>

                    <div className="form-group" style={{maxWidth:'33%', marginBottom:'15px'}}>
                        <label>Type</label>
                        <select className="input" value={editForm.perfume_type || ""} onChange={e=>setEditForm({...editForm, perfume_type: e.target.value})}>
                            <option value="">Select Type</option>
                            {perfumeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    
                    <div className="form-grid-3">
                        <div className="form-group"><label>Bottle Size (ml)</label><input type="number" className="input" value={editForm.volume_ml || ""} onChange={e=>setEditForm({...editForm, volume_ml: e.target.value})} placeholder="ml" /></div>
                        <div className="form-group"><label>Full Price</label><input type="number" className="input" value={editForm.price || ""} onChange={e=>setEditForm({...editForm, price: e.target.value})} /></div>
                        <div className="form-group"><label>Discounted</label><input type="number" className="input" value={editForm.discounted_price || ""} onChange={e=>setEditForm({...editForm, discounted_price: e.target.value})} /></div>
                    </div>
                    
                    <div className="form-grid-3">
                        <div className="form-group"><label>Stock</label><input type="number" className="input" value={editForm.stock || ""} onChange={e=>setEditForm({...editForm, stock: e.target.value})} /></div>
                        <div className="form-group">
                            <label>Priority (1-100)</label>
                            <input type="number" className="input" value={editForm.bestseller_priority || 0} onChange={e=>setEditForm({...editForm, bestseller_priority: e.target.value})} />
                        </div>
                    </div>

                    <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>Decant Pricing</h4>
                        <div className="form-grid-3">
                            <div className="form-group">
                                <label>5ml Price</label>
                                <input type="number" className="input" value={editForm.price_5ml || ""} onChange={e=>setEditForm({...editForm, price_5ml: e.target.value})} placeholder="None" />
                            </div>
                            <div className="form-group">
                                <label>10ml Price</label>
                                <input type="number" className="input" value={editForm.price_10ml || ""} onChange={e=>setEditForm({...editForm, price_10ml: e.target.value})} placeholder="None" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="form-group"><label>Description</label><textarea className="input textarea" value={editForm.description || ""} onChange={e=>setEditForm({...editForm, description: e.target.value})} /></div>
                    
                    <div className="form-grid-3">
                        <div className="form-group"><label>Top Notes</label><input className="input" value={editForm.top_notes || ""} onChange={e=>setEditForm({...editForm, top_notes: e.target.value})} /></div>
                        <div className="form-group"><label>Heart Notes</label><input className="input" value={editForm.heart_notes || ""} onChange={e=>setEditForm({...editForm, heart_notes: e.target.value})} /></div>
                        <div className="form-group"><label>Base Notes</label><input className="input" value={editForm.base_notes || ""} onChange={e=>setEditForm({...editForm, base_notes: e.target.value})} /></div>
                    </div>

                    {/* UNIFIED IMAGE EDITING AREA */}
                    <div className="form-group" style={{marginTop: '15px'}}>
                        <label>Product Images (Drag & Drop or use buttons to reorder, First image is Main)</label>
                        <input type="file" multiple accept="image/*" onChange={handleEditImageSelect} style={{marginBottom:'10px'}} />
                        
                        <div className="preview-grid">
                            {editImages.map((img, i) => (
                                <div key={i} className="preview-card">
                                    <img 
                                        src={img.type === 'url' ? img.src : URL.createObjectURL(img.src)} 
                                        alt="preview" 
                                    />
                                    <button type="button" className="remove-btn" onClick={() => removeEditImage(i)}>✕</button>
                                    
                                    {/* Visual Indicator for First Image */}
                                    {i === 0 && <span className="badge" style={{background:'#007bff'}}>Main</span>}
                                    {img.type === 'file' && <span className="badge" style={{background:'green', top: i===0?'25px':'5px'}}>New</span>}
                                </div>
                            ))}
                        </div>
                        {editImages.length === 0 && <p style={{color:'#999', fontSize:'13px', fontStyle:'italic'}}>No images selected. Product will have no image.</p>}
                    </div>

                    <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}