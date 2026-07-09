import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import { useCart } from '../../contexts/CartContext';
import api from '../../utils/api';
import Navbar from '../../components/layout/Navbar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';
import { ShoppingCart, Star, MapPin, Package, Minus, Plus, ArrowLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { addItem } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [qty, setQty] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await api.get(`/api/buyer/products/${id}`);
      setProduct(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return toast.error('Out of stock');
    addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: qty,
      stock: product.stock,
      imageUrl: product.imageUrl || '',
      unit: product.unit,
      sellerName: product.sellerName,
      sellerId: product.sellerId,
    });
    toast.success(`${product.name} (×${qty}) added to cart! 🛒`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return toast.error('Write a review first');
    setSubmittingReview(true);
    try {
      await api.post('/api/buyer/reviews', {
        productId: id,
        rating: reviewRating,
        comment: reviewText,
      });
      setReviewText('');
      setReviewRating(5);
      toast.success('Review submitted! 🌟');
      fetchProduct(); // Refresh reviews and ratings
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="min-h-screen"><Navbar /><div className="pt-24"><LoadingSpinner /></div></div>;
  if (!product) return <div className="min-h-screen"><Navbar /><div className="pt-24 text-center text-gray-400"><p>Product not found</p></div></div>;

  const images = product.images?.length ? product.images : [product.imageUrl].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div>
            <div className="w-full h-72 rounded-2xl overflow-hidden bg-gray-100 mb-3">
              {images[selectedImg] ? (
                <img src={images[selectedImg]} className="w-full h-full object-cover" alt={product.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🥬</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImg === i ? 'border-primary-500' : 'border-transparent'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-extrabold text-gray-900">{product.name}</h1>
              {product.isAvailable ? (
                <span className="badge bg-green-100 text-green-700">✅ Available</span>
              ) : (
                <span className="badge bg-red-100 text-red-700">Out of Stock</span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={16} fill={i <= (product.rating || 0) ? '#facc15' : 'none'} className={i <= (product.rating || 0) ? 'text-yellow-400' : 'text-gray-200'} />
                ))}
              </div>
              <span className="text-gray-400 text-sm">({product.reviewCount || 0} reviews)</span>
            </div>

            <div className="text-4xl font-black text-gray-900 mb-1">
              {formatCurrency(product.price)}
              <span className="text-lg font-normal text-gray-400">/{product.unit}</span>
            </div>

            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                {product.location || product.sellerName}
              </div>
              <div className="flex items-center gap-1">
                <Package size={14} />
                {product.stock > 0 ? `${product.stock} ${product.unit} in stock` : 'Out of stock'}
              </div>
            </div>

            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-5 bg-gray-50 rounded-xl p-3">{product.description}</p>
            )}

            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {product.tags.map((tag, i) => (
                  <span key={i} className="badge bg-primary-50 text-primary-600 capitalize">{tag}</span>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-2 hover:bg-gray-200 rounded-l-xl transition-colors">
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="p-2 hover:bg-gray-200 rounded-r-xl transition-colors" disabled={qty >= product.stock}>
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-sm text-gray-400">Total: {formatCurrency(product.price * qty)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!product.isAvailable || product.stock === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold py-3 rounded-2xl transition-all disabled:opacity-40"
              >
                <ShoppingCart size={18} /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!product.isAvailable || product.stock === 0}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
              >
                Buy Now →
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
              <span>🌾</span>
              <span>Sold by <span className="font-semibold text-gray-600">{product.sellerName}</span> • {product.location}</span>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="card mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map(r => (
                <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-800">{r.buyerName}</span>
                    <span className="text-xs text-gray-400">• {formatDate(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={12} fill={i <= r.rating ? '#facc15' : 'none'} className={i <= r.rating ? 'text-yellow-400' : 'text-gray-200'} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave a Review */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">⭐ Leave a Review</h2>
          <div className="flex items-center gap-2 mb-3">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={() => setReviewRating(i)}>
                <Star size={24} fill={i <= reviewRating ? '#facc15' : 'none'} className={i <= reviewRating ? 'text-yellow-400' : 'text-gray-200'} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={3}
            placeholder="Share your experience with this product..."
            className="input resize-none mb-3"
          />
          <button
            onClick={handleSubmitReview}
            disabled={submittingReview}
            className="btn-primary text-sm py-2"
          >
            {submittingReview ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
