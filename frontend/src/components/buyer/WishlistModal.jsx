import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import api from '../../utils/api';

// ── Public hook — can be used by BuyerHome product cards ──────────────────
export function useWishlist() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState({});

  const fetchWishlist = useCallback(async () => {
    if (!user?.uid) {
      setWishlist({});
      return;
    }
    try {
      const res = await api.get('/api/buyer/wishlists');
      setWishlist(res.data || {});
    } catch (err) {
      console.error('Failed to fetch wishlist', err);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggle = async (product) => {
    if (!user?.uid) { toast.error('Please sign in first'); return; }
    
    const isWished = !!wishlist[product.id || product.productId];
    const pid = product.id || product.productId;

    try {
      if (isWished) {
        await api.delete(`/api/buyer/wishlists/${pid}`);
        toast('Removed from wishlist');
      } else {
        await api.post('/api/buyer/wishlists', {
          productId:   pid,
          productName: product.name || product.productName,
          price:       product.price,
          unit:        product.unit || 'kg',
          imageUrl:    product.imageUrl || '',
          sellerId:    product.sellerId || '',
          sellerName:  product.sellerName || '',
          stock:       product.stock || 0,
        });
        toast.success('❤️ Added to wishlist!');
      }
      fetchWishlist();
    } catch (e) {
      toast.error('Failed to update wishlist');
    }
  };

  const isInWishlist = (productId) => !!wishlist[productId];

  return { wishlist, toggle, isInWishlist, count: Object.keys(wishlist).length };
}

// ── WishlistModal component ───────────────────────────────────────────────
export default function WishlistModal({ open, onClose }) {
  const { user } = useAuth();
  const { wishlist, toggle } = useWishlist();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const items = Object.values(wishlist);

  const handleAddToCart = (item) => {
    if (item.stock <= 0) { toast.error('Out of stock'); return; }
    addItem({
      productId:   item.productId,
      productName: item.productName,
      price:       item.price,
      quantity:    1,
      stock:       item.stock,
      imageUrl:    item.imageUrl,
      unit:        item.unit,
      sellerName:  item.sellerName,
      sellerId:    item.sellerId,
    });
    toast.success(`${item.productName} added to cart!`);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-red-500 fill-red-500" />
            <h2 className="font-bold text-gray-900">Wishlist</h2>
            {items.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 px-6">
              <Heart size={56} strokeWidth={1} />
              <div className="text-center">
                <p className="font-semibold text-gray-500">No saved items yet</p>
                <p className="text-sm mt-1">Tap the ❤️ on any product to save it</p>
              </div>
              <button onClick={onClose} className="btn-primary">Browse Products</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.imageUrl
                      ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.productName} />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🌱</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.productName}</p>
                    <p className="text-gray-400 text-xs">{item.sellerName}</p>
                    <p className="text-primary-600 font-bold text-sm mt-0.5">{formatCurrency(item.price)}/{item.unit}</p>
                    {item.stock <= 0 && <p className="text-red-500 text-xs">Out of stock</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={item.stock <= 0}
                      className="p-2 bg-primary-100 hover:bg-primary-200 text-primary-600 rounded-xl transition-colors disabled:opacity-40"
                      title="Add to cart"
                    >
                      <ShoppingCart size={14} />
                    </button>
                    <button
                      onClick={() => toggle({ id: item.productId, ...item })}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-500 rounded-xl transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
            <p className="text-xs text-gray-400 text-center">{items.length} saved item{items.length !== 1 ? 's' : ''} • Items are saved to your account</p>
          </div>
        )}
      </div>
    </>
  );
}
