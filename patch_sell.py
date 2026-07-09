import re

def update_buyer_py():
    with open('F:/Thanthi/AgroPulse AI/backend/routes/buyer.py', 'r', encoding='utf-8') as f:
        text = f.read()

    new_endpoint = """
@buyer_bp.route('/products', methods=['POST'])
@require_buyer
def add_buyer_product():
    data = request.get_json()
    required = ['name', 'description', 'price', 'stock', 'unit', 'category']
    for r in required:
        if not data.get(r):
            return jsonify({'error': f'Missing {r}'}), 400
            
    product = {
        'name': data['name'],
        'description': data['description'],
        'price': float(data['price']),
        'stock': int(data['stock']),
        'unit': data['unit'],
        'category': data['category'].lower(),
        'imageUrl': data.get('imageUrl', ''),
        'sellerId': request.uid,
        'sellerName': request.user.get('displayName', 'Unknown User'),
        'sellerLocation': request.user.get('address', 'Unknown Location'),
        'isApproved': True,
        'isAvailable': True,
        'createdAt': datetime.utcnow()
    }
    
    res = db.products.insert_one(product)
    product['id'] = str(res.inserted_id)
    product.pop('_id', None)
    return jsonify(product), 201

# ─── Products (public browse) ────────────────────────────────────────────────
"""
    text = text.replace('# ─── Products (public browse) ────────────────────────────────────────────────', new_endpoint)
    
    with open('F:/Thanthi/AgroPulse AI/backend/routes/buyer.py', 'w', encoding='utf-8') as f:
        f.write(text)

def update_buyer_home_jsx():
    with open('F:/Thanthi/AgroPulse AI/frontend/src/pages/buyer/BuyerHome.jsx', 'r', encoding='utf-8') as f:
        text = f.read()

    # Add state
    text = text.replace('const [selectedProduct, setSelectedProduct] = useState(null);',
                        'const [selectedProduct, setSelectedProduct] = useState(null);\n  const [sellModalOpen, setSellModalOpen] = useState(false);\n  const [newProduct, setNewProduct] = useState({name:"", description:"", price:"", stock:"", unit:"kg", category:"vegetables", imageUrl:""});\n  const [submitting, setSubmitting] = useState(false);')

    # Add Sell handler
    handler = """
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

  // ── Filter ───────────────────────────────────────────────────────────────"""
    text = text.replace('// ── Filter ───────────────────────────────────────────────────────────────', handler)

    # Add button
    btn = """              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setSellModalOpen(true)} className="hidden sm:flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-md cursor-pointer">
                  🛒 Sell Your Product
                </button>
                <button onClick={() => setWishlistOpen(true)} className="hidden sm:flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer">"""
    text = re.sub(r'<div className="flex items-center gap-2 mt-1">\s*<button onClick=\{\(\) => setWishlistOpen\(true\)', btn, text, flags=re.MULTILINE | re.DOTALL)

    # Add modal component at the end before last div closure
    modal = """

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
                  <input required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" value={newProduct.name} onChange={e=>setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Fresh Organic Tomatoes" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea required rows={2} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.description} onChange={e=>setNewProduct({...newProduct, description: e.target.value})} placeholder="Describe the quality, farming method, etc." />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price (₹)</label>
                    <input required type="number" min="1" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.price} onChange={e=>setNewProduct({...newProduct, price: e.target.value})} placeholder="100" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Stock</label>
                    <input required type="number" min="1" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.stock} onChange={e=>setNewProduct({...newProduct, stock: e.target.value})} placeholder="50" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                    <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newProduct.unit} onChange={e=>setNewProduct({...newProduct, unit: e.target.value})}>
                      <option value="kg">kg</option>
                      <option value="gram">gram</option>
                      <option value="piece">piece</option>
                      <option value="dozen">dozen</option>
                      <option value="liter">liter</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                    <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={newProduct.category} onChange={e=>setNewProduct({...newProduct, category: e.target.value})}>
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
                  <input type="url" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" value={newProduct.imageUrl} onChange={e=>setNewProduct({...newProduct, imageUrl: e.target.value})} placeholder="https://example.com/image.jpg" />
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
}"""
    text = text.replace('    </div>\n  );\n}', modal)

    with open('F:/Thanthi/AgroPulse AI/frontend/src/pages/buyer/BuyerHome.jsx', 'w', encoding='utf-8') as f:
        f.write(text)

update_buyer_py()
update_buyer_home_jsx()
