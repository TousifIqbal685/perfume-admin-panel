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
    { id: "7741f377-e4f5-45e8-b49b-9f2765c2ea60", name: "Body Spray" },
    { id: "e06e7a2b-2f05-4baa-90da-1573d82ae74b", name: "Men" },
  ];

  const perfumeTypes = ["Niche", "Arabian", "Designer"];

  /* --- STATES --- */
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const productRefs = useRef({});
  const [previousStock, setPreviousStock] = useState({});

  // ADD FORM STATE - Added perfume_type
  const [form, setForm] = useState({
    title: "", brand: "", perfume_type: "", // <--- Added here
    price: "", discounted_price: "", 
    price_5ml: "", price_10ml: "", 
    stock: "",
    description: "", top_notes: "", heart_notes: "", base_notes: "", category_id: "",
  });
  const [newImages, setNewImages] = useState([]); 
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // EDIT MODAL STATE
  const [editingProduct, setEditingProduct] = useState(null); 
  const [editForm, setEditForm] = useState({}); 
  const [editNewImages, setEditNewImages] = useState([]); 

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
  const handleImageSelect = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewImages((prev) => [...prev, ...files]);
    }
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImagesToStorage = async (files, slug) => {
    const uploadedUrls = [];
    for (let file of files) {
      const filename = `${slug}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error } = await supabase.storage.from("product-images").upload(filename, file);
      if (!error) {
        const { data } = supabase.storage.from("product-images").getPublicUrl(filename);
        uploadedUrls.push(data.publicUrl);
      }
    }
    return uploadedUrls;
  };

  /* --- ADD PRODUCT LOGIC --- */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (newImages.length === 0) {
        alert("Please select at least one image.");
        setSaving(false);
        return;
    }

    const slug = generateSlug(form.brand, form.title);
    const uploadedUrls = await uploadImagesToStorage(newImages, slug);
    const mainImageUrl = uploadedUrls[0]; 
    const extraImageUrls = uploadedUrls.slice(1); 

    const { data: inserted, error } = await supabase
      .from("products")
      .insert([{
        ...form, 
        slug, 
        perfume_type: form.perfume_type, // <--- Saving the type
        price: Number(form.price),
        discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
        price_5ml: form.price_5ml ? Number(form.price_5ml) : null,
        price_10ml: form.price_10ml ? Number(form.price_10ml) : null,
        stock: Number(form.stock), 
        main_image_url: mainImageUrl, 
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

    if (extraImageUrls.length > 0) {
      const imageInserts = extraImageUrls.map(url => ({
        product_id: inserted.id, image_url: url
      }));
      await supabase.from("product_images").insert(imageInserts);
    }

    setSaving(false);
    setMessage("✅ Product Added Successfully!");
    
    setForm({
        title: "", brand: "", perfume_type: "", // <--- Reset type
        price: "", discounted_price: "", 
        price_5ml: "", price_10ml: "",
        stock: "", description: "",
        top_notes: "", heart_notes: "", base_notes: "", category_id: "",
    });
    setNewImages([]);
    loadProducts();
  };

  /* --- EDIT PRODUCT LOGIC --- */
  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({ ...product });
    setEditNewImages([]); 
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    await supabase.from("products").update({
        title: editForm.title, 
        brand: editForm.brand, 
        perfume_type: editForm.perfume_type, // <--- Update type
        price: Number(editForm.price),
        discounted_price: editForm.discounted_price ? Number(editForm.discounted_price) : null,
        price_5ml: editForm.price_5ml ? Number(editForm.price_5ml) : null,
        price_10ml: editForm.price_10ml ? Number(editForm.price_10ml) : null,
        stock: Number(editForm.stock), 
        description: editForm.description,
        top_notes: editForm.top_notes, 
        heart_notes: editForm.heart_notes,
        base_notes: editForm.base_notes, 
        category_id: editForm.category_id,
    }).eq("id", editingProduct.id);

    if (editNewImages.length > 0) {
        const uploadedUrls = await uploadImagesToStorage(editNewImages, editingProduct.slug);
        
        if (!editingProduct.main_image_url && uploadedUrls.length > 0) {
            await supabase.from("products").update({ main_image_url: uploadedUrls[0] }).eq("id", editingProduct.id);
            uploadedUrls.shift(); 
        }

        if (uploadedUrls.length > 0) {
            const imageInserts = uploadedUrls.map(url => ({ product_id: editingProduct.id, image_url: url }));
            await supabase.from("product_images").insert(imageInserts);
        }
    }

    setSaving(false);
    setEditingProduct(null); 
    loadProducts(); 
  };

  const deleteExistingImage = async (imgId, isMain) => {
    if (!window.confirm("Delete this image?")) return;

    if (isMain) {
       await supabase.from("products").update({ main_image_url: null }).eq("id", editingProduct.id);
       setEditForm(prev => ({ ...prev, main_image_url: null })); 
    } else {
       await supabase.from("product_images").delete().eq("id", imgId);
       const updatedExtras = editingProduct.product_images.filter(img => img.id !== imgId);
       setEditingProduct(prev => ({ ...prev, product_images: updatedExtras }));
    }
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
            {/* NEW TYPE DROPDOWN */}
            <div className="form-group"><label>Type</label>
                <select className="input" value={form.perfume_type} onChange={e=>setForm({...form, perfume_type: e.target.value})} >
                    <option value="">Select Type</option>
                    {perfumeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="form-grid-3">
            <div className="form-group"><label>Full Bottle Price (৳)</label><input type="number" className="input" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} required/></div>
            <div className="form-group"><label>Discounted Price (৳)</label><input type="number" className="input" value={form.discounted_price} onChange={e=>setForm({...form, discounted_price: e.target.value})} /></div>
            <div className="form-group"><label>Stock</label><input type="number" className="input" value={form.stock} onChange={e=>setForm({...form, stock: e.target.value})} /></div>
          </div>

          {/* Decant Section */}
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

          {/* UNIFIED IMAGE UPLOAD */}
          <div className="form-group">
            <label>Images (First image will be Main)</label>
            <div className="image-upload-area">
                <input type="file" id="add-images" multiple accept="image/*" onChange={handleImageSelect} hidden />
                <label htmlFor="add-images" className="file-label">Click to Select Images</label>
            </div>
            <div className="preview-grid">
                {newImages.map((file, i) => (
                    <div key={i} className="preview-card">
                        <img src={URL.createObjectURL(file)} alt="preview" />
                        <button type="button" className="remove-btn" onClick={() => removeNewImage(i)}>✕</button>
                        {i === 0 && <span className="badge">MAIN</span>}
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
                    <div className="admin-img-wrap"><img src={p.main_image_url || "https://via.placeholder.com/80"} className="admin-img" alt={p.title} /></div>
                    <div className="card-info">
                        <h4 className="admin-title" title={p.title}>{p.title}</h4>
                        <p className="admin-brand">{p.brand}</p>
                        {/* SHOW TYPE IN CARD */}
                        {p.perfume_type && <span style={{fontSize:'11px', background:'#eee', padding:'2px 6px', borderRadius:'4px', color:'#555'}}>{p.perfume_type}</span>}
                    </div>
                </div>
                
                <div className="card-body">
                    <div className="field-row"><label>Price</label><input type="number" className="admin-input-small" value={p.price} onChange={e => autoUpdate(p.id, "price", e.target.value)} /></div>
                    <div className="field-row"><label>Discount</label><input type="number" className="admin-input-small" value={p.discounted_price || ""} onChange={e => autoUpdate(p.id, "discounted_price", e.target.value)} /></div>
                    <div className="field-row"><label>Stock</label><input type="number" className="admin-input-small" value={p.stock} onChange={e => autoUpdate(p.id, "stock", e.target.value)} /></div>
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

                    {/* EDIT TYPE */}
                    <div className="form-group" style={{maxWidth:'33%', marginBottom:'15px'}}>
                        <label>Type</label>
                        <select className="input" value={editForm.perfume_type || ""} onChange={e=>setEditForm({...editForm, perfume_type: e.target.value})}>
                            <option value="">Select Type</option>
                            {perfumeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    
                    {/* EDIT PRICING */}
                    <div className="form-grid-3">
                        <div className="form-group"><label>Full Price</label><input type="number" className="input" value={editForm.price || ""} onChange={e=>setEditForm({...editForm, price: e.target.value})} /></div>
                        <div className="form-group"><label>Discounted</label><input type="number" className="input" value={editForm.discounted_price || ""} onChange={e=>setEditForm({...editForm, discounted_price: e.target.value})} /></div>
                        <div className="form-group"><label>Stock</label><input type="number" className="input" value={editForm.stock || ""} onChange={e=>setEditForm({...editForm, stock: e.target.value})} /></div>
                    </div>

                    {/* EDIT DECANTS */}
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

                    <h4 style={{marginTop: '20px', marginBottom: '10px'}}>Manage Images</h4>
                    
                    <div className="preview-grid">
                        {editForm.main_image_url && (
                            <div className="preview-card">
                                <img src={editForm.main_image_url} alt="main" />
                                <button type="button" className="remove-btn" onClick={() => deleteExistingImage(null, true)}>✕</button>
                                <span className="badge">MAIN</span>
                            </div>
                        )}
                        {editingProduct.product_images?.map(img => (
                            <div key={img.id} className="preview-card">
                                <img src={img.image_url} alt="extra" />
                                <button type="button" className="remove-btn" onClick={() => deleteExistingImage(img.id, false)}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div className="form-group" style={{marginTop: '15px'}}>
                        <label>Add More Images</label>
                        <input type="file" multiple accept="image/*" onChange={e => setEditNewImages([...e.target.files])} />
                        <div className="preview-grid">
                            {editNewImages.map((file, i) => (
                                <div key={i} className="preview-card" style={{opacity: 0.7}}>
                                    <img src={URL.createObjectURL(file)} alt="new" />
                                    <span className="badge" style={{background:'green'}}>NEW</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}