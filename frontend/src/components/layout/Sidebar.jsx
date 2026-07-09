import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';

// ─── Sidebar Weather Widget (identical to FeatureDashboard) ───────────────────
function WeatherWidget() {
  const [w, setW] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) { setW({ temp: '30°C', icon: '☁️', loc: 'Tamil Nadu, IN' }); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const key = import.meta.env.VITE_OPENWEATHER_KEY || '3347e778aac495ead88b34f2a1f93259';
        const { latitude: lat, longitude: lon } = pos.coords;
        const r = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`);
        const main = r.data.weather[0].main;
        const em = main.includes('Rain') ? '🌧️' : main.includes('Cloud') ? '☁️' : main.includes('Snow') ? '❄️' : main.includes('Thunder') ? '⛈️' : '☀️';
        setW({ temp: Math.round(r.data.main.temp) + '°C', icon: em, loc: r.data.name + ', ' + r.data.sys.country });
      } catch { setW({ temp: '30°C', icon: '☁️', loc: 'Tamil Nadu, IN' }); }
    }, () => setW({ temp: '30°C', icon: '☁️', loc: 'Tamil Nadu, IN' }));
  }, []);

  if (!w) return (
    <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #edf2f7', background: '#f8fafc' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid rgba(22,163,74,.3)', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto' }} />
    </div>
  );

  return (
    <div style={{ padding: '16px 12px', textAlign: 'center', borderBottom: '1px solid #edf2f7', background: '#f8fafc' }}>
      <div style={{ fontSize: '2rem', lineHeight: 1 }}>{w.icon}</div>
      <div style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 2px' }}>{w.temp}</div>
      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.35 }}>{w.loc}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Sidebar({ links, role }) {
  const { logout, userProfile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebarContent = (
    <>
      <style>{`
        .gs-sidebar {
          width: 100%; min-height: 100vh;
          background: #ffffff;
          display: flex; flex-direction: column;
          border-right: 1px solid #edf2f7;
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
        }
        .gs-nav { flex: 1; overflow-y: auto; padding: 6px 0; }
        .gs-nav-item {
          display: flex; align-items: center; gap: 13px;
          padding: 12px 20px;
          color: #475569; font-size: .9rem; font-weight: 600;
          cursor: pointer; position: relative; overflow: hidden;
          border: none; background: transparent; width: 100%; text-align: left;
          transition: color .25s; text-decoration: none;
        }
        .gs-nav-item::before {
          content: ''; position: absolute; top: 0; left: 0;
          height: 100%; width: 0; background: #16a34a; z-index: 0;
          transition: width .28s ease-in-out;
        }
        .gs-nav-item:hover::before,
        .gs-nav-item.active::before { width: 100%; }
        .gs-nav-item:hover,
        .gs-nav-item.active { color: #ffffff; }
        .gs-nav-item span { position: relative; z-index: 1; }
        .gs-nav-icon { font-size: 1.1rem; width: 20px; text-align: center; flex-shrink: 0; position: relative; z-index: 1; }
        .gs-logout-area {
          border-top: 1px solid #edf2f7;
          padding: 12px 20px;
        }
        .gs-logout-btn {
          display: flex; align-items: center; gap: 13px;
          color: #94a3b8; background: transparent; border: none;
          cursor: pointer; font-size: .9rem; font-weight: 600; width: 100%;
          transition: color .2s; font-family: inherit;
        }
        .gs-logout-btn:hover { color: #dc2626; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <aside className="gs-sidebar">
        <WeatherWidget />

        <nav className="gs-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `gs-nav-item${isActive ? ' active' : ''}`
              }
            >
              <span className="gs-nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="gs-logout-area">
          <button onClick={handleLogout} className="gs-logout-btn">
            <span className="gs-nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
        style={{ display: mobileOpen ? 'none' : undefined }}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Desktop sidebar — fixed */}
      <div className="hidden md:block fixed left-0 top-0 w-[220px] h-screen z-40">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed left-0 top-0 h-screen w-[220px] z-50 md:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
