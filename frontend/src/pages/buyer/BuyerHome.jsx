import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/layout/Navbar';
import { useNavigate } from 'react-router-dom';
import CartDrawer from '../../components/buyer/CartDrawer';
import WishlistModal, { useWishlist } from '../../components/buyer/WishlistModal';
import { ShoppingCart, Star, Search, MapPin, ArrowLeft, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'all',        label: 'All',        icon: '🛒' },
  { id: 'vegetables', label: 'Vegetables', icon: '🥦' },
  { id: 'fruits',     label: 'Fruits',     icon: '🍎' },
  { id: 'grains',     label: 'Grains',     icon: '🌾' },
  { id: 'dairy',      label: 'Dairy',      icon: '🥛' },
  { id: 'herbs',      label: 'Herbs',      icon: '🌿' },
];

const EMOJI_FALLBACK = {
  vegetables: '🥦', fruits: '🍎', grains: '🌾',
  dairy: '🥛', herbs: '🌿', default: '🌱',
};

export default function BuyerHome() {
  const { userProfile } = useAuth();
  const { addItem, items: cartItems, clampToStock, itemCount } = useCart();
  const { toggle: toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  const [category,        setCategory]        = useState('all');
  const [search,          setSearch]          = useState('');
  const [cartOpen,        setCartOpen]        = useState(false);
  const [wishlistOpen,    setWishlistOpen]    = useState(false);
  const [products,        setProducts]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({name:"", description:"", price:"", stock:"", unit:"kg", category:"vegetables", imageUrl:""});
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/buyer/products');
      let fetchedProducts = res.data.products || [];
      
      // Sort new products first
      fetchedProducts.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      // Clamp cart quantities against live stock
      fetchedProducts.forEach(p => { 
        try { 
          if (clampToStock) clampToStock(p.id, p.stock || 0); 
        } catch {} 
      });

      setProducts(fetchedProducts);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [clampToStock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  
  const handleSellSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/buyer/products', newProduct);
      setProducts([res.data, ...products]);
      setSellModalOpen(false);
      setNewProduct({name:"", description:"", price:"", stock:"", unit:"kg", category:"vegetables", imageUrl:""});
      toast.success('Product listed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to list product');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchCat    = category === 'all' || (p.category && p.category.toLowerCase() === category);
    const q           = search.toLowerCase();
    const matchSearch = !search ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sellerName && p.sellerName.toLowerCase().includes(q)) ||
      (p.sellerLocation && p.sellerLocation.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleAddToCart = (product, e) => {
    e?.stopPropagation();
    if (product.stock <= 0) { toast.error('Out of stock'); return; }
    addItem({
      productId:   product.id,
      productName: product.name,
      price:       product.price,
      quantity:    1,
      stock:       product.stock,
      imageUrl:    product.imageUrl,
      unit:        product.unit,
      sellerName:  product.sellerName,
      sellerId:    product.sellerId,
    });
    toast.success(`${product.name} added to cart! 🛒`);
  };

  const isInCart = (id) => cartItems.some(i => i.productId === id);

  const StockBadge = ({ stock }) => {
    if (stock <= 0)  return <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Out of Stock</span>;
    if (stock <= 5)  return <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Only {stock} left!</span>;
    return null;
  };

  // ── Product Detail View ──────────────────────────────────────────────────
  if (selectedProduct) {
    const p       = selectedProduct;
    const related = filtered.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 max-w-5xl mx-auto px-4 py-8">
          <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-2 text-primary-600 font-semibold mb-6 hover:underline">
            <ArrowLeft size={18} /> Back to All Products
          </button>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 grid md:grid-cols-2 gap-8">
            <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden bg-gray-100 relative">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl">{EMOJI_FALLBACK[p.category] || EMOJI_FALLBACK.default}</div>
              )}
              <StockBadge stock={p.stock} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{p.name}</h1>
              {p.rating > 0 && (
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(p.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />)}
                  <span className="text-xs text-gray-500 ml-1">({p.reviewCount})</span>
                </div>
              )}
              <div className="mb-4">
                <span className="text-3xl font-black text-gray-900">₹{p.price?.toFixed(2)}</span>
                <span className="text-gray-400 text-sm">/{p.unit}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-4 space-y-1">
                {p.sellerName     && <p>👤 <strong>Seller:</strong> {p.sellerName}</p>}
                {p.sellerLocation && <p><MapPin size={12} className="inline" /> <strong>Location:</strong> {p.sellerLocation}</p>}
                <p>📦 <strong>Stock:</strong> {p.stock > 0 ? `${p.stock} ${p.unit} available` : 'Out of Stock'}</p>
                <p>🚚 <strong>Delivery:</strong> 2-3 business days</p>
              </div>
              {p.description && <p className="text-gray-500 text-sm leading-relaxed mb-4">{p.description}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAddToCart(p)}
                  disabled={p.stock <= 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                    p.stock <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                    isInCart(p.id) ? 'bg-primary-100 text-primary-700' :
                    'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  <ShoppingCart size={18} />
                  {p.stock <= 0 ? 'Out of Stock' : isInCart(p.id) ? 'In Cart ✓' : 'Add to Cart'}
                </button>
                {p.stock > 0 && (
                  <button onClick={() => { handleAddToCart(p); setCartOpen(true); }} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    Buy Now ⚡
                  </button>
                )}
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Related Products</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {related.map(rp => (
                  <div key={rp.id} onClick={() => setSelectedProduct(rp)}
                    className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className="h-28 bg-gray-100 overflow-hidden">
                      {rp.imageUrl ? <img src={rp.imageUrl} alt={rp.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">{EMOJI_FALLBACK[rp.category] || '🌱'}</div>}
                    </div>
                    <div className="p-2">
                      <p className="font-semibold text-xs text-gray-900 truncate">{rp.name}</p>
                      <p className="text-primary-600 font-bold text-sm">₹{rp.price?.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <CartDrawer    open={cartOpen}     onClose={() => setCartOpen(false)} />
        <WishlistModal open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
      </div>
    );
  }

  // ── Main Shop View ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-900 py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-primary-200 text-sm mb-1">Welcome, {userProfile?.displayName?.split(' ')[0] || 'Buyer'}! 👋</p>
                <h1 className="text-3xl font-extrabold text-white mb-2">Fresh from the Farm 🌾</h1>
                <p className="text-primary-200 text-sm">Direct from local farmers — no middlemen, fair prices</p>
              </div>
                            <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setSellModalOpen(true)} className="hidden sm:flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-md cursor-pointer">
                  🛒 Sell Your Product
                </button>
                <button onClick={() => setWishlistOpen(true)} className="hidden sm:flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer">
                  <Heart size={12} /> Wishlist
                </button>
                <span className="bg-green-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full animate-pulse hidden sm:block">● LIVE</span>
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-6 max-w-lg">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vegetables, fruits, grains, seller name..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white text-gray-800 placeholder-gray-400 border-0 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  category === cat.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                }`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">
                {search ? `Results for "${search}"` : category === 'all' ? 'All Products' : CATEGORIES.find(c => c.id === category)?.label}
              </h2>
              <p className="text-gray-400 text-sm">{filtered.length} product{filtered.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({length: 8}).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded-xl mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-6xl">{search ? '🔍' : '🌾'}</span>
              <h3 className="text-xl font-bold text-gray-900 mt-4">
                {products.length === 0 ? 'No products yet' : 'No products found'}
              </h3>
              <p className="text-gray-400 mt-2">
                {products.length === 0
                  ? 'Sellers are adding products — check back soon!'
                  : `Try a different ${search ? 'search term' : 'category'}`}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-4 btn-secondary text-sm">Clear Search</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filtered.map(product => (
                <div key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-2xl shadow-card border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative w-full h-40 sm:h-44 bg-gray-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt={product.name}
                        onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-5xl">${EMOJI_FALLBACK[product.category] || '🌱'}</div>`; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        {EMOJI_FALLBACK[product.category] || '🌱'}
                      </div>
                    )}
                    <StockBadge stock={product.stock} />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                      className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm shadow-sm transition-all hover:scale-110 active:scale-95"
                    >
                      <Heart 
                        size={18} 
                        className={`transition-colors ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} 
                      />
                    </button>
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-primary-600 transition-colors">
                      {product.name}
                    </h3>

                    {(product.sellerName || product.sellerLocation) && (
                      <div className="flex items-center gap-1 mt-0.5 mb-1">
                        <MapPin size={10} className="text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-400 truncate">
                          {[product.sellerName, product.sellerLocation].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    )}

                    {product.rating > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-gray-500">{product.rating.toFixed(1)} ({product.reviewCount})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <span className="text-base sm:text-lg font-black text-gray-900">₹{product.price?.toFixed(0)}</span>
                        <span className="text-xs text-gray-400">/{product.unit}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={product.stock <= 0}
                      className={`w-full mt-2.5 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        product.stock <= 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isInCart(product.id)
                          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                    >
                      <ShoppingCart size={13} />
                      {product.stock <= 0 ? 'Out of Stock' : isInCart(product.id) ? 'In Cart ✓' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CartDrawer    open={cartOpen}     onClose={() => setCartOpen(false)} />
      <WishlistModal open={wishlistOpen} onClose={() => setWishlistOpen(false)} />

      {/* Floating Cart Button */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary-600 text-white p-4 rounded-full shadow-2xl hover:bg-primary-700 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        <ShoppingCart size={24} />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {itemCount}
          </span>
        )}
      </button>


      {/* Sell Modal */}
      {sellModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Sell a Product</h2>
              <button onClick={() => setSellModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSellSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name</label>
                  <input required className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" value={newProduct.name} onChange={e=>setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Fresh Organic Tomatoes" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea required rows={2} className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.description} onChange={e=>setNewProduct({...newProduct, description: e.target.value})} placeholder="Describe the quality, farming method, etc." />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price (₹)</label>
                    <input required type="number" min="1" className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.price} onChange={e=>setNewProduct({...newProduct, price: e.target.value})} placeholder="100" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Stock</label>
                    <input required type="number" min="1" className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.stock} onChange={e=>setNewProduct({...newProduct, stock: e.target.value})} placeholder="50" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                    <select className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl outline-none" value={newProduct.unit} onChange={e=>setNewProduct({...newProduct, unit: e.target.value})}>
                      <option value="kg">kg</option>
                      <option value="gram">gram</option>
                      <option value="piece">piece</option>
                      <option value="dozen">dozen</option>
                      <option value="liter">liter</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                    <select className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl outline-none" value={newProduct.category} onChange={e=>setNewProduct({...newProduct, category: e.target.value})}>
                      <option value="vegetables">Vegetables</option>
                      <option value="fruits">Fruits</option>
                      <option value="grains">Grains</option>
                      <option value="dairy">Dairy</option>
                      <option value="herbs">Herbs</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL (Optional)</label>
                  <input type="url" className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.imageUrl} onChange={e=>setNewProduct({...newProduct, imageUrl: e.target.value})} placeholder="https://example.com/image.jpg" />
                </div>
                <div className="pt-4">
                  <button disabled={submitting} type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary-500/30">
                    {submitting ? 'Listing...' : 'List Product Now'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
