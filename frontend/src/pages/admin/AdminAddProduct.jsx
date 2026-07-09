import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import Sidebar from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';
import { Upload, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import api from '../../utils/api';
import axios from 'axios';

const CATEGORIES = ['vegetables', 'fruits', 'grains', 'dairy', 'herbs'];
const UNITS      = ['kg', 'dozen', 'piece', 'litre', 'gram', 'bundle'];

const STEPS = [
  { n: 1, label: 'Product Details' },
  { n: 2, label: 'Images' },
  { n: 3, label: 'Review & Submit' },
];

export default function AdminAddProduct() {
  const { userProfile } = useAuth();
  const { id: editId }  = useParams();
  const navigate        = useNavigate();
  const fileRef         = useRef(null);

  const [step,           setStep]           = useState(1);
  const [saving,         setSaving]         = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images,         setImages]         = useState([]);

  const [form, setForm] = useState({
    name: '', description: '', category: 'vegetables', price: '',
    unit: 'kg', stock: '',
    sellerLocation: '',
    tags: '',
  });

  // Pre-fill form when editing
  const fetchProductForEdit = useCallback(async () => {
    if (!editId) return;
    try {
      const res = await api.get('/api/seller/products');
      const product = res.data.products?.find(p => p.id === editId);
      if (!product) return;
      
      setForm({
        name:           product.name         || product.itemName || '',
        description:    product.description  || '',
        category:       product.category     || 'vegetables',
        price:          String(product.price || product.itemPrice || ''),
        unit:           product.unit         || 'kg',
        stock:          String(product.stock || ''),
        sellerLocation: product.sellerLocation || product.location || '',
        tags:           (product.tags || []).join(', '),
      });
      if (product.images?.length) setImages(product.images);
      else if (product.imageUrl)  setImages([product.imageUrl]);
    } catch (err) {
      toast.error('Failed to load product details');
    }
  }, [editId]);

  useEffect(() => {
    fetchProductForEdit();
  }, [fetchProductForEdit]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleImageUpload = async (files) => {
    for (const file of Array.from(files)) {
      if (images.length >= 5) { toast.error('Max 5 images'); break; }
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append('item_image', file);
        // Assuming we keep axios for image upload if it uses a generic route without auth, 
        // or we can use api if it's protected.
        const res = await api.post('/upload-item-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const url = res.data.imageUrl || res.data.secure_url;
        if (url) setImages(prev => [...prev, url]);
        toast.success('Image uploaded!');
      } catch {
        toast.error('Image upload failed');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleDrop = (e) => { e.preventDefault(); handleImageUpload(e.dataTransfer.files); };

  const validateStep1 = () => {
    if (!form.name || !form.price || !form.stock || !form.category) {
      toast.error('Please fill all required fields');
      return false;
    }
    if (parseFloat(form.price) <= 0) { toast.error('Price must be > 0'); return false; }
    if (parseInt(form.stock)  <  0)  { toast.error('Stock cannot be negative'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!userProfile?.isApproved) {
      toast.error('Your seller account is pending admin approval');
      return;
    }
    setSaving(true);
    try {
      const productData = {
        name:           form.name.trim(),
        description:    form.description.trim(),
        category:       form.category,
        price:          parseFloat(form.price),
        unit:           form.unit,
        stock:          parseInt(form.stock),
        imageUrl:       images[0] || '',
        images,
        location:       form.sellerLocation.trim(),
        tags:           form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editId) {
        await api.put(`/api/admin/products/${editId}`, productData);
        toast.success('Product updated! Awaiting admin approval.');
      } else {
        await api.post('/api/admin/products', productData);
        toast.success('Product submitted for review! 🌾');
      }

      navigate('/admin/products');
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS.seller} role="seller" />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="page-header">{editId ? 'Edit Product' : 'Add New Product'}</h1>

          {/* Step Indicator */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step > s.n  ? 'bg-primary-600 text-white' :
                    step === s.n ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {step > s.n ? <Check size={14} /> : s.n}
                  </div>
                  <span className={`text-sm font-medium ${step === s.n ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-gray-100 mx-3" />}
              </div>
            ))}
          </div>

          <div className="card">
            {/* Step 1: Product Details */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <label className="label">Product Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Fresh Tomatoes" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category *</label>
                    <select name="category" value={form.category} onChange={handleChange} className="input">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Unit *</label>
                    <select name="unit" value={form.unit} onChange={handleChange} className="input">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Price (₹) per {form.unit} *</label>
                    <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="45" className="input" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="label">Available Stock *</label>
                    <input name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="100" className="input" min="0" />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Describe your product — freshness, origin, quality..." className="input resize-none" />
                </div>
                <div>
                  <label className="label">Farm / Seller Location</label>
                  <input name="sellerLocation" value={form.sellerLocation} onChange={handleChange} placeholder="e.g. Pollachi, Coimbatore" className="input" />
                </div>
                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input name="tags" value={form.tags} onChange={handleChange} placeholder="organic, fresh, seasonal" className="input" />
                </div>
                <button onClick={() => validateStep1() && setStep(2)} className="btn-primary w-full flex items-center justify-center gap-2">
                  Next: Add Images <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Step 2: Images */}
            {step === 2 && (
              <div className="animate-fade-in">
                <h2 className="font-bold text-gray-900 mb-4">Upload Product Images</h2>
                <p className="text-gray-400 text-sm mb-5">Add up to 5 images. The first image will be the main display image.</p>

                <div
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer mb-5"
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-medium text-gray-500">Drag & drop images here</p>
                  <p className="text-gray-400 text-sm mt-1">or click to browse</p>
                  {uploadingImage && <p className="text-primary-600 text-sm mt-2 animate-pulse">Uploading...</p>}
                  <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files)} />
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} className="w-full h-24 object-cover rounded-xl" alt="" />
                        {i === 0 && <span className="absolute top-1 left-1 badge bg-primary-600 text-white text-xs">Main</span>}
                        <button
                          onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Next: Review <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h2 className="font-bold text-gray-900 mb-4">Review & Submit</h2>
                <div className="bg-gray-50 rounded-2xl p-5 mb-6 flex gap-4">
                  {images[0] && <img src={images[0]} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" alt="" />}
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{form.name}</h3>
                    <p className="text-gray-500 text-sm capitalize">{form.category} • {form.unit}</p>
                    <p className="text-2xl font-black text-primary-600 mt-1">₹{form.price}<span className="text-sm font-normal text-gray-400">/{form.unit}</span></p>
                    <p className="text-gray-400 text-xs mt-1">{form.stock} units in stock • {form.sellerLocation}</p>
                    {form.description && <p className="text-gray-500 text-xs mt-1">{form.description}</p>}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6">
                  <p className="text-yellow-700 text-sm">
                    ⚠️ After submission, your product will be reviewed by an admin before going live in the marketplace.
                    This usually takes 1-2 hours.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {saving ? 'Submitting...' : <><Check size={16} /> {editId ? 'Update Product' : 'Submit for Review'}</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
