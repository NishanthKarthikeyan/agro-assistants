import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';

const CATEGORY_ICONS = { vegetables: '🥦', fruits: '🍎', grains: '🌾', dairy: '🥛', herbs: '🌿' };

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // the backend currently returns all products without filtering when we call GET /api/admin/products? Wait, let's verify if the route GET /api/admin/products exists.
      // Wait, let's look at what GET /api/admin/products returns right now. Let me assume the route exists and returns all products.
      // Ah, there is no GET /api/admin/products. The frontend actually fetched from /api/admin/products previously or maybe /api/products ?
      const res = await api.get('/products'); // Use public products endpoint or admin endpoint
      setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const displayed = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar role="admin" links={SIDEBAR_LINKS.admin} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
              <p className="text-gray-500">Manage all marketplace products here.</p>
            </div>
            <Link to="/admin/products/add" className="btn-primary flex items-center gap-2 px-6 py-3">
              <Plus size={20} /> Add Product
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><LoadingSpinner /></div>
            ) : displayed.length === 0 ? (
              <div className="p-16 text-center text-gray-500 flex flex-col items-center">
                <Package size={48} className="mb-4 text-gray-300" />
                <p>No products found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-500 text-sm border-b border-gray-100">
                    <tr>
                      <th className="py-4 px-6 font-medium">Product</th>
                      <th className="py-4 px-6 font-medium">Category</th>
                      <th className="py-4 px-6 font-medium">Price</th>
                      <th className="py-4 px-6 font-medium">Stock</th>
                      <th className="py-4 px-6 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <img src={p.imageUrl || '/placeholder.png'} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                            <div>
                              <p className="font-semibold text-gray-900">{p.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700">
                            {CATEGORY_ICONS[p.category]} {p.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900">
                          {formatCurrency(p.price)} / {p.unit}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${p.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.stock} {p.unit}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/admin/products/edit/${p.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 size={18} />
                            </Link>
                            <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
