import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import { RefreshCw, ExternalLink, Clock, Globe } from 'lucide-react';
import { triggerNotification } from '../../utils/notifications';

const CATEGORIES = ['All', 'Farming', 'Weather', 'Market', 'Government Schemes', 'Technology', 'Organic'];

export default function AgriNews() {
  const { userProfile } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);

  const role = userProfile?.role || 'buyer';
  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/agri-news');
      const articles = res.data?.articles || res.data?.news || res.data || [];
      setNews(Array.isArray(articles) ? articles : []);
      
      // Push real news notification for the latest headline
      if (Array.isArray(articles) && articles.length > 0) {
        const latestArticle = articles[0];
        const title = latestArticle.title || 'New Article Available';
        triggerNotification('📰 Latest Agri News Alert', title);
      }
    } catch (e) {
      // Fallback static news when API is unavailable
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  const PER_PAGE = 9;
  const filtered = category === 'All' ? news : news.filter(n =>
    (n.title + ' ' + n.description + ' ' + (n.category || '')).toLowerCase().includes(category.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const formatDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const getFallbackImage = (i) => {
    const emojis = ['🌾', '🌿', '🚜', '🌱', '🍃', '🌻', '🏡', '📊', '💧'];
    return emojis[i % emojis.length];
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={links} role={role} />
      <main className="flex-1 ml-[220px] pt-20 px-4 pb-8 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="page-header mb-1 flex items-center gap-3">
                <span className="text-4xl">📰</span> Agri News
              </h1>
              <p className="text-gray-400 text-sm">Latest agricultural news from India and around the world</p>
            </div>
            <button onClick={fetchNews} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  category === cat ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* News Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-40 bg-gray-200 rounded-xl mb-4" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-6xl">📰</span>
              <p className="text-gray-400 mt-4 font-semibold">
                {news.length === 0
                  ? 'Could not load news. Make sure backend is running and NEWS_API_KEY is set in .env'
                  : 'No articles found for this category'}
              </p>
              <button onClick={fetchNews} className="btn-primary mt-4">Try Again</button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginated.map((article, i) => (
                  <a
                    key={i}
                    href={article.url || article.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-2xl shadow-card border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group block"
                  >
                    {/* Image */}
                    <div className="w-full h-44 bg-gradient-to-br from-primary-50 to-primary-100 overflow-hidden relative">
                      {article.urlToImage || article.image ? (
                        <img
                          src={article.urlToImage || article.image}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={article.title}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          {getFallbackImage(i)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 right-2">
                        <ExternalLink size={14} className="text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Source & Date */}
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={11} className="text-gray-300" />
                        <span className="text-gray-400 text-xs">{article.source?.name || article.source || 'News'}</span>
                        <span className="text-gray-200">•</span>
                        <Clock size={11} className="text-gray-300" />
                        <span className="text-gray-400 text-xs">{formatDate(article.publishedAt || article.published_at || article.date)}</span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {article.title}
                      </h3>

                      {article.description && (
                        <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                          {article.description}
                        </p>
                      )}

                      <div className="mt-3 text-primary-600 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Read full article <ExternalLink size={11} />
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-2 px-4 disabled:opacity-40">
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${page === p ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm py-2 px-4 disabled:opacity-40">
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
