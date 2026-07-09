import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, X } from 'lucide-react';
import axios from 'axios';
import ChatWidget from '../../components/common/ChatWidget';

// ─── Lazy-load feature pages (renders inside the shell) ───────────────────────
const WeatherPage    = lazy(() => import('../weather/WeatherPage'));
const CropDisease    = lazy(() => import('../features/CropDisease'));
const AiPlanner      = lazy(() => import('../features/AiPlanner'));
const MarketPrices   = lazy(() => import('../features/MarketPrices'));
// Removed BuyerHome internal products page as we redirect to LM Store
const AgriNews       = lazy(() => import('../features/AgriNews'));
const AgroBot        = lazy(() => import('../features/AgroBot'));
const AgroLoan       = lazy(() => import('../features/AgroLoan'));

// ─── Section key → component map ──────────────────────────────────────────────
const SECTION_COMPONENTS = {
  weather : WeatherPage,
  crop    : CropDisease,
  planner : AiPlanner,
  prices  : MarketPrices,
  market  : null, // Redirects to LM Store
  news    : AgriNews,
  chatbot : AgroBot,
  loan    : AgroLoan,
};

// ─── Route → section key map ──────────────────────────────────────────────────
const ROUTE_TO_SECTION = {
  '/weather'                : 'weather',
  '/features/crop-disease'  : 'crop',
  '/features/planner'       : 'planner',
  '/features/market-prices' : 'prices',
  '/shop'             : 'market',
  '/features/news'          : 'news',
  '/features/chatbot'       : 'chatbot',
  '/features/loan'          : 'loan',
};

// ─── Nav Items ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard',     section: null    },
  { icon: '🔬', label: 'Crop Guide',    section: 'crop'    },
  { icon: '🌤️', label: 'Weather',       section: 'weather' },
  { icon: '📈', label: 'Market Prices', section: 'prices'  },
  { icon: '🌱', label: 'AI Planner',    section: 'planner' },
  { icon: '🛒', label: 'Buy / Sell',    section: 'market'  },
  { icon: '📰', label: 'Agri News',     section: 'news'    },
  { icon: '🤖', label: 'AI Chat',       section: 'chatbot' },
  { icon: '🏦', label: 'Agri Loan',     section: 'loan'    },
  { icon: '📦', label: 'My Orders',     path: '/orders' },
  { icon: '🚚', label: 'Delivery Panel', section: 'delivery' },
];

// ─── Feature Panels (home view) ──────────────────────────────────────────────
const PANELS = [
  {
    id: 'weather',
    icon: '⛈️',
    title: 'WEATHER\nFORECAST',
    desc: 'Real-time weather updates to plan your farming activities.',
    section: 'weather',
    bg: 'https://i.gifer.com/Iqt.gif',
    color: '#60a5fa',
    grad: 'linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,60,120,.45) 55%,transparent 100%)',
  },
  {
    id: 'crop',
    icon: '🌿',
    title: 'CROP\nGUIDE',
    desc: 'Upload a leaf image — AI instantly detects diseases and suggests remedies.',
    section: 'crop',
    bg: 'https://s14.gifyu.com/images/bNLvJ.gif',
    color: '#4ade80',
    grad: 'linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,80,30,.45) 55%,transparent 100%)',
  },
  {
    id: 'planner',
    icon: '🧠',
    title: 'AI\nPLANNER',
    desc: 'Smart crop suggestions based on your land, soil type, and season.',
    section: 'planner',
    bg: 'https://s14.gifyu.com/images/bNLmY.gif',
    color: '#c084fc',
    grad: 'linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(60,0,120,.45) 55%,transparent 100%)',
  },
  {
    id: 'prices',
    icon: '📊',
    title: 'MARKET\nPRICES',
    desc: 'Live mandi prices for vegetables, fruits and grains.',
    section: 'prices',
    bg: 'https://s14.gifyu.com/images/bNLIp.gif',
    color: '#fbbf24',
    grad: 'linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,30,80,.5) 55%,transparent 100%)',
  },
  {
    id: 'market',
    icon: '🛒',
    title: 'MARKET',
    desc: 'Buy and sell fresh farm produce directly — no middlemen.',
    section: 'market',
    bg: 'https://s14.gifyu.com/images/bNLuQ.gif',
    color: '#39ff14',
    grad: 'linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(10,60,0,.45) 55%,transparent 100%)',
  },
];

// ─── Sidebar Weather Widget ───────────────────────────────────────────────────
function WeatherWidget() {
  const [w, setW] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) { setW({ temp:'31°C', icon:'☀️', loc:'Tamil Nadu, IN' }); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const key = import.meta.env.VITE_OPENWEATHER_KEY;
        if (!key) throw new Error('no key');
        const { latitude:lat, longitude:lon } = pos.coords;
        const r = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`);
        const main = r.data.weather[0].main;
        const em = main.includes('Rain')?'🌧️':main.includes('Cloud')?'☁️':main.includes('Snow')?'❄️':main.includes('Thunder')?'⛈️':'☀️';
        setW({ temp:Math.round(r.data.main.temp)+'°C', icon:em, loc:r.data.name+', '+r.data.sys.country, desc:r.data.weather[0].description });
      } catch { setW({ temp:'31°C', icon:'☀️', loc:'Tamil Nadu, IN' }); }
    }, () => setW({ temp:'31°C', icon:'☀️', loc:'Tamil Nadu, IN' }));
  }, []);

  if (!w) return (
    <div style={{padding:'20px',textAlign:'center'}}>
      <div style={{width:'24px',height:'24px',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto'}}/>
    </div>
  );
  return (
    <div style={{padding:'16px 12px',textAlign:'center',borderBottom:'1px solid #edf2f7',background:'#f8fafc'}}>
      <div style={{fontSize:'2rem',lineHeight:1}}>{w.icon}</div>
      <div style={{color:'#1e293b',fontSize:'1.5rem',fontWeight:800,margin:'4px 0 2px'}}>{w.temp}</div>
      <div style={{color:'#64748b',fontSize:'0.72rem',fontWeight:600,lineHeight:1.35}}>{w.loc}</div>
    </div>
  );
}

// ─── Chart Bars (decorative) ──────────────────────────────────────────────────
const BARS = Array.from({length:18},()=>Math.random()*50+10);

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100%', minHeight:'300px', gap:'16px',
    }}>
      <div style={{
        width:'48px', height:'48px',
        border:'3px solid rgba(57,255,20,.2)',
        borderTopColor:'#39ff14',
        borderRadius:'50%',
        animation:'spin .8s linear infinite',
      }}/>
      <p style={{color:'rgba(255,255,255,.5)', fontSize:'.9rem'}}>Loading...</p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function FeatureDashboard() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { section: routeSection } = useParams();
  const activeSection = routeSection || null;

  const setActiveSection = (section) => {
    if (section === 'market') {
      window.location.href = 'http://localhost:5175';
      return;
    }
    if (section === 'delivery') {
      window.location.href = 'http://localhost:3000';
      return;
    }
    if (section) {
      navigate(`/${section}`);
    } else {
      navigate(`/dashboard`);
    }
  };

  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const overlayRef = useRef(null);

  const handleNav = (item) => {
    setSidebarOpen(false);
    if (item.path) {
      navigate(item.path);
    } else {
      setActiveSection(item.section); // null = dashboard home
    }
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  // Close sidebar on outside click
  useEffect(() => {
    const fn = (e) => {
      if (sidebarOpen && overlayRef.current && !overlayRef.current.contains(e.target)) {
        const toggle = document.getElementById('sidebar-toggle');
        if (toggle && !toggle.contains(e.target)) setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [sidebarOpen]);

  const name = userProfile?.displayName?.split(' ')[0] || 'User';
  const initials = (userProfile?.displayName||'U')[0].toUpperCase();

  // Determine which component to render
  const ActiveComponent = activeSection ? SECTION_COMPONENTS[activeSection] : null;

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" />

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .agro-root{
          display:flex; min-height:100vh;
          background:#050505; font-family:'Poppins',sans-serif; color:#fff;
          overflow-x:hidden;
        }

        /* ── SIDEBAR ─────────────────────────────── */
        .agro-sidebar{
          width:220px; min-height:100vh;
          background:#ffffff; position:fixed;
          top:0; left:0; z-index:200;
          display:flex; flex-direction:column;
          border-right:1px solid #edf2f7;
          transition: transform .32s cubic-bezier(.4,0,.2,1);
        }
        @media(max-width:767px){
          .agro-sidebar{
            transform:translateX(-100%);
            box-shadow:4px 0 30px rgba(0,0,0,.15);
          }
          .agro-sidebar.open{ transform:translateX(0); }
        }

        .sidebar-overlay{
          display:none; position:fixed; inset:0; background:rgba(0,0,0,.45);
          z-index:199; backdrop-filter:blur(2px);
        }
        @media(max-width:767px){
          .sidebar-overlay{ display:block; }
        }

        .agro-nav{ flex:1; overflow-y:auto; padding:6px 0; }
        .nav-item{
          display:flex; align-items:center; gap:13px;
          padding:12px 20px;
          color:#475569; font-size:.9rem; font-weight:600;
          cursor:pointer; position:relative; overflow:hidden;
          border:none; background:transparent; width:100%; text-align:left;
          transition:color .25s; text-decoration:none;
        }
        .nav-item::before{
          content:''; position:absolute; top:0; left:0;
          height:100%; width:0; background:#16a34a; z-index:-1;
          transition:width .28s ease-in-out;
        }
        .nav-item:hover::before,.nav-item.active::before{ width:100%; }
        .nav-item:hover,.nav-item.active{ color:#ffffff; }
        .nav-icon{ font-size:1.1rem; width:20px; text-align:center; flex-shrink:0; }

        .nav-logout-btn{
          border-top:1px solid #edf2f7;
          padding:12px 20px;
        }
        .nav-logout-btn button{
          display:flex; align-items:center; gap:13px;
          color:#94a3b8; background:transparent; border:none;
          cursor:pointer; font-size:.9rem; font-weight:600; width:100%;
          transition:color .2s; font-family:'Poppins',sans-serif;
        }
        .nav-logout-btn button:hover{ color:#dc2626; }

        /* ── HEADER ──────────────────────────────── */
        .agro-header{
          position:fixed; top:0; right:0;
          left:220px;
          background:linear-gradient(90deg,#27ae60,#39ff14);
          display:flex; justify-content:space-between; align-items:center;
          padding:0 24px; height:58px; z-index:150;
          box-shadow:0 2px 20px rgba(57,255,20,.25);
        }
        @media(max-width:767px){
          .agro-header{ left:0; padding:0 16px; }
        }

        .header-logo{
          display:flex; align-items:center; gap:10px;
          font-size:1.05rem; font-weight:800;
          letter-spacing:1.5px; text-transform:uppercase; color:#fff;
        }
        .header-logo .leaf{ font-size:1.4rem; }
        .header-right{ display:flex; align-items:center; gap:8px; }

        .hbtn{
          background:rgba(0,0,0,.55); border:1px solid rgba(0,0,0,.35);
          color:#39ff14; padding:5px 12px; border-radius:20px;
          cursor:pointer; font-size:.72rem; font-weight:700;
          letter-spacing:.6px; text-transform:uppercase;
          display:flex; align-items:center; gap:5px;
          transition:all .2s; border-color:#39ff14;
          white-space:nowrap;
        }
        .hbtn:hover{ background:#000; box-shadow:0 0 12px rgba(57,255,20,.4); }
        @media(max-width:480px){ .hbtn{ display:none; } }

        .h-avatar{
          width:34px; height:34px; border-radius:50%;
          border:2px solid #fff; background:rgba(255,255,255,.25);
          display:flex; align-items:center; justify-content:center;
          font-weight:800; font-size:.85rem; color:#000; cursor:pointer;
          overflow:hidden; flex-shrink:0;
        }
        .h-avatar img{ width:100%; height:100%; object-fit:cover; }
        .h-name{ color:#fff; font-weight:700; font-size:.88rem; }
        @media(max-width:400px){ .h-name{ display:none; } }

        /* hamburger */
        .hamburger{
          display:none; background:none; border:none; cursor:pointer;
          color:#fff; font-size:1.5rem; margin-right:6px; padding:4px;
          line-height:1; transition:transform .2s;
        }
        .hamburger:hover{ transform:scale(1.1); }
        @media(max-width:767px){ .hamburger{ display:flex; align-items:center; } }

        /* ── CONTENT ──────────────────────────────── */
        .agro-content{
          margin-left:220px; padding-top:58px;
          width:calc(100% - 220px); display:flex; flex-direction:column;
          min-height:100vh;
        }
        @media(max-width:767px){
          .agro-content{ margin-left:0; width:100%; }
        }

        /* ── FEATURE CONTENT WRAPPER ──────────────── */
        /* Suppresses inner sidebars/navbars that feature components render themselves */
        .feature-content-wrapper{
          flex:1; overflow-y:auto;
          background:#050505;
        }
        /* Hide any nested sidebar the feature component has */
        .feature-content-wrapper .agro-sidebar,
        .feature-content-wrapper aside,
        .feature-content-wrapper [class*="sidebar"],
        .feature-content-wrapper .w-64,
        .feature-content-wrapper nav:not(.agro-nav) {
          display:none !important;
        }
        /* Make inner main take full width */
        .feature-content-wrapper main,
        .feature-content-wrapper .flex-1.ml-64,
        .feature-content-wrapper [class*="ml-64"],
        .feature-content-wrapper [class*="ml-[220px]"] {
          margin-left:0 !important;
          width:100% !important;
          max-width:100% !important;
        }
        /* Remove flex wrappers that split layout */
        .feature-content-wrapper .flex.min-h-screen,
        .feature-content-wrapper .flex.h-screen {
          display:block !important;
        }

        /* ── PANELS — desktop horizontal ─────────── */
        .panels-wrap{
          display:flex; flex:1;
          height:calc(100vh - 58px);
        }
        @media(max-width:767px){
          .panels-wrap{
            flex-direction:column;
            height:auto; overflow-y:auto;
          }
        }

        .fp{
          flex:1; position:relative; cursor:pointer; overflow:hidden;
          min-width:56px;
          /* No transition — panels stay equal width always */
        }
        /* .fp:hover{ flex:2.5; } — REMOVED: no expansion on hover */
        @media(max-width:767px){
          .fp{ flex:none !important; height:200px; min-width:unset; }
        }
        @media(min-width:768px) and (max-width:1024px){
          .fp{ min-width:44px; }
        }

        .fp-bg{
          position:absolute; inset:0; background-size:cover; background-position:center;
          transition:transform .5s ease; overflow:hidden;
        }
        .fp:hover .fp-bg{ transform:scale(1.06); }
        .fp:hover .panel-gif{ transform:scale(1.08); }
        @media(max-width:767px){
          .fp:hover .fp-bg{ transform:none; }
        }

        .fp-overlay{ position:absolute; inset:0; }
        .fp-content{
          position:absolute; bottom:0; left:0; right:0;
          padding:22px 18px;
          display:flex; flex-direction:column; gap:8px;
        }
        @media(max-width:767px){
          .fp-content{ padding:16px 18px; gap:5px; }
        }

        .fp-icon{
          width:50px; height:50px; border-radius:13px;
          display:flex; align-items:center; justify-content:center; font-size:1.5rem;
          background:rgba(0,0,0,.5); backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,.2); margin-bottom:2px;
          transition:box-shadow .3s;
        }
        /* .fp:hover .fp-icon{ transform:scale(1.1); } — REMOVED: no icon scale */
        @media(max-width:767px){
          .fp-icon{ width:40px; height:40px; font-size:1.2rem; border-radius:10px; }
        }

        .fp-title{
          font-size:1.45rem; font-weight:900; color:#fff;
          letter-spacing:1.5px; text-transform:uppercase;
          white-space:pre-line; line-height:1.15;
          /* No font-size transition — stays consistent */
        }
        /* .fp:hover .fp-title{ font-size:1.65rem; } — REMOVED: no title size change */
        @media(max-width:767px){
          .fp-title{ font-size:1.15rem !important; white-space:normal; }
        }

        .fp-desc{
          font-size:.82rem; color:rgba(255,255,255,.85); line-height:1.5;
          max-width:240px; opacity:0; transform:translateY(10px);
          transition:all .3s .04s;
        }
        .fp:hover .fp-desc{ opacity:1; transform:translateY(0); }
        @media(max-width:767px){
          .fp-desc{ opacity:1; transform:none; font-size:.78rem; max-width:none; }
        }

        .fp-cta{
          display:inline-flex; align-items:center; gap:5px;
          padding:7px 16px; border-radius:20px; font-size:.73rem;
          font-weight:700; text-transform:uppercase; letter-spacing:.8px;
          background:rgba(0,0,0,.5); color:#fff;
          border:1px solid rgba(255,255,255,.3);
          opacity:0; transform:translateY(10px);
          transition:all .3s .08s; cursor:pointer;
          width:fit-content; margin-top:2px;
        }
        .fp:hover .fp-cta{ opacity:1; transform:translateY(0); }
        @media(max-width:767px){
          .fp-cta{ opacity:1; transform:none; font-size:.7rem; padding:5px 12px; }
        }

        /* border glow */
        .fp::after{
          content:''; position:absolute; inset:0;
          border:3px solid transparent; pointer-events:none; z-index:10;
          transition:border-color .3s;
        }
        .fp:hover::after{ border-color:var(--pc); box-shadow:inset 0 0 20px rgba(255,255,255,.04); }
        @media(max-width:767px){ .fp::after{ display:none; } }

        /* chart bars */
        .chart-bars{
          position:absolute; bottom:0; left:0; right:0; height:56px;
          display:flex; align-items:flex-end; gap:3px; padding:0 8px;
          opacity:.22; pointer-events:none;
        }
        .cb{ flex:1; background:#fbbf24; border-radius:2px 2px 0 0; }

        /* particles */
        .particle{
          position:absolute; border-radius:50%; opacity:.55;
          animation:floatP 2.5s ease-in-out infinite alternate;
        }
        @keyframes floatP{
          from{ transform:translateY(0) scale(1); }
          to{ transform:translateY(-22px) scale(1.25); }
        }
        @keyframes spin{ to{ transform:rotate(360deg); } }

        /* rain drops */
        .rdrop{ position:absolute; width:2px; border-radius:0 0 2px 2px;
          animation:rfloat linear infinite; }
        @keyframes rfloat{
          from{ transform:translateY(-20px) rotate(10deg); opacity:.85; }
          to{ transform:translateY(300px) rotate(10deg); opacity:0; }
        }

        /* mobile bottom hint */
        .mobile-hint{
          display:none; text-align:center; padding:10px;
          color:rgba(255,255,255,.4); font-size:.72rem; letter-spacing:.5px;
          background:#0a0a0a;
        }
        @media(max-width:767px){ .mobile-hint{ display:block; } }

        /* breadcrumb / section header */
        .section-header{
          display:flex; align-items:center; gap:10px;
          padding:12px 20px;
          background:#0d0d0d;
          border-bottom:1px solid rgba(57,255,20,.1);
          font-size:.85rem; color:rgba(255,255,255,.6);
          flex-shrink:0;
        }
        .section-header button{
          background:none; border:none; color:rgba(57,255,20,.8);
          cursor:pointer; font-family:'Poppins',sans-serif;
          font-size:.85rem; font-weight:600; padding:0;
          transition:color .2s;
        }
        .section-header button:hover{ color:#39ff14; }
        .section-header .sep{ opacity:.4; }
        .section-header .current{ color:#fff; font-weight:600; }
      `}</style>

      <div className="agro-root">
        {/* ── SIDEBAR OVERLAY (mobile) ── */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside ref={overlayRef} className={`agro-sidebar${sidebarOpen ? ' open' : ''}`}>
          <WeatherWidget />
          <nav className="agro-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.label}
                className={`nav-item${activeSection === item.section && !item.path ? ' active' : ''}`}
                onClick={() => handleNav(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="nav-logout-btn">
            <button onClick={handleLogout}>
              <span className="nav-icon">🚪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="agro-content">
          {/* Top Header */}
          <header className="agro-header">
            {/* Hamburger (mobile only) */}
            <button
              id="sidebar-toggle"
              className="hamburger"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>

            <div className="header-logo">
              <span className="leaf">🌿</span>
              <span>AI Agro Assistant</span>
            </div>

            <div className="header-right">
              {activeSection && (
                <button
                  className="hbtn"
                  onClick={() => setActiveSection(null)}
                >
                  🏠 Home
                </button>
              )}
              {/* Language button removed */}
              <span className="h-name">{name}</span>
              <div
                className="h-avatar"
                onClick={() => {
                  const route = userProfile?.role === 'seller' ? '/seller/profile' : '/profile';
                  navigate(route);
                  setSidebarOpen(false);
                }}
                title="View / Edit Profile"
                style={{ cursor: 'pointer' }}
              >
                {userProfile?.profileImageUrl
                  ? <img src={userProfile.profileImageUrl} alt="profile" />
                  : initials}
              </div>
            </div>
          </header>

          {/* ── CONTENT AREA ── */}
          {activeSection === null ? (
            /* ── DASHBOARD HOME — 5 expanding panels ── */
            <>
              <div className="panels-wrap">
                {PANELS.map((p) => (
                  <div
                    key={p.id}
                    className="fp"
                    style={{ '--pc': p.color }}
                    onClick={() => setActiveSection(p.section)}
                    onMouseEnter={() => setHoveredPanel(p.id)}
                    onMouseLeave={() => setHoveredPanel(null)}
                  >
                    {/* BG GIF — must use <img> for animated GIFs to work (CSS background freezes GIFs) */}
                    <div className="fp-bg">
                      <img
                        src={p.bg}
                        alt={p.title}
                        style={{
                          width: '100%', height: '100%',
                          objectFit: 'cover', objectPosition: 'center',
                          transition: 'transform 0.5s ease',
                          display: 'block',
                        }}
                        className="panel-gif"
                      />
                    </div>
                    {/* Overlay */}
                    <div className="fp-overlay" style={{ background: p.grad }} />

                    {/* Decorative animations */}
                    {p.id === 'prices' && (
                      <div className="chart-bars">
                        {BARS.map((h, j) => (
                          <div key={j} className="cb" style={{
                            height: h + 'px',
                            animation: `none`,
                            opacity: hoveredPanel === p.id ? 0.35 : 0.18,
                            transition: 'height .4s, opacity .3s',
                          }} />
                        ))}
                      </div>
                    )}
                    {(p.id === 'planner' || p.id === 'crop') && Array.from({length:8}).map((_, j) => (
                      <div key={j} className="particle" style={{
                        left: (j*13+5) + '%',
                        top: (j%3 * 30 + 10) + '%',
                        width: (j%3+4) + 'px',
                        height: (j%3+4) + 'px',
                        background: p.color,
                        boxShadow: `0 0 8px ${p.color}`,
                        animationDuration: (2 + j*0.3) + 's',
                        animationDelay: (j*0.2) + 's',
                        opacity: hoveredPanel === p.id ? 0.7 : 0.3,
                      }} />
                    ))}
                    {p.id === 'weather' && hoveredPanel === p.id && Array.from({length:15}).map((_, j) => (
                      <div key={j} className="rdrop" style={{
                        left: (j*7) + '%',
                        top: '-5%',
                        height: (Math.random()*50+25) + 'px',
                        background: 'linear-gradient(to bottom,transparent,rgba(147,197,253,.7))',
                        animationDuration: (Math.random()*.6+.5) + 's',
                        animationDelay: (Math.random()*1.5) + 's',
                      }} />
                    ))}

                    {/* Content */}
                    <div className="fp-content">
                      <div className="fp-icon" style={{ color: p.color }}>{p.icon}</div>
                      <h2 className="fp-title">{p.title}</h2>
                      <p className="fp-desc">{p.desc}</p>
                      <button
                        className="fp-cta"
                        style={hoveredPanel === p.id
                          ? { background: p.color, color: '#000', borderColor: 'transparent' }
                          : {}}
                        onClick={(e) => { e.stopPropagation(); setActiveSection(p.section); }}
                      >
                        Explore →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Mobile scroll hint */}
              <div className="mobile-hint">↕ Scroll to explore all features</div>
            </>
          ) : (
            /* ── FEATURE CONTENT — renders inside the shell ── */
            <div style={{display:'flex', flexDirection:'column', flex:1, overflow:'hidden'}}>
              {/* Breadcrumb nav */}
              <div className="section-header">
                <button onClick={() => setActiveSection(null)}>🏠 Dashboard</button>
                <span className="sep">›</span>
                <span className="current">
                  {NAV_ITEMS.find(n => n.section === activeSection)?.icon}{' '}
                  {NAV_ITEMS.find(n => n.section === activeSection)?.label}
                </span>
              </div>

              {/* Feature component — inner sidebar suppressed by CSS */}
              <div className="feature-content-wrapper">
                <Suspense fallback={<LoadingSpinner />}>
                  {ActiveComponent && <ActiveComponent />}
                </Suspense>
              </div>
            </div>
          )}
        </div>

        {/* ── Floating Chat Button & Widget ── */}
        <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-24 right-6 z-50 p-4 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          title={isChatOpen ? "Close AI Chat" : "Open AI Chat"}
        >
          {isChatOpen ? (
            <X size={28} className="text-white" />
          ) : (
            <MessageCircle size={28} className="fill-white" />
          )}
        </button>
      </div>
    </>
  );
}
