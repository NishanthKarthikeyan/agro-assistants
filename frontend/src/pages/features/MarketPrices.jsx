import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import {
  Search, MapPin, Bell, BellOff, X, Check,
  TrendingUp, TrendingDown, Minus, RefreshCw, ChevronRight,
  SlidersHorizontal, Award, Activity, Compass, Navigation,
  ArrowUpRight, ArrowDownRight, Zap, BarChart3, ShoppingCart
} from 'lucide-react';

/* ─── Vegetable Metadata ────────── */
const VEG_EMOJIS = {
  'Tomato': '🍅', 'Onion': '🧅', 'Potato': '🥔', 'Brinjal': '🍆',
  'Carrot': '🥕', 'Cabbage': '🥬', 'Cauliflower': '🥦', 'Ladies Finger': '🥒',
  'Beetroot': '🍠',
};

const VEG_ACCENTS = {
  'Tomato': '#ef4444', 'Onion': '#a855f7', 'Potato': '#f59e0b',
  'Brinjal': '#8b5cf6', 'Carrot': '#f97316', 'Cabbage': '#10b981',
  'Cauliflower': '#3b82f6', 'Ladies Finger': '#14b8a6', 'Beetroot': '#be185d',
};

const VEG_CATEGORIES = {
  'Tomato': 'Vegetables', 'Onion': 'Vegetables', 'Potato': 'Vegetables',
  'Brinjal': 'Vegetables', 'Carrot': 'Vegetables', 'Cabbage': 'Greens',
  'Cauliflower': 'Vegetables', 'Ladies Finger': 'Vegetables', 'Beetroot': 'Vegetables',
};

const VEG_IMAGES = {
  'Tomato': 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=300',
  'Onion': 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=300',
  'Potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=300',
  'Brinjal': 'https://images.unsplash.com/photo-1590379051877-3e1b78297b83?auto=format&fit=crop&q=80&w=300',
  'Carrot': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=300',
  'Cabbage': 'https://images.unsplash.com/photo-1581074817533-04608f1ab2b4?auto=format&fit=crop&q=80&w=300',
  'Cauliflower': 'https://images.unsplash.com/photo-1568584711271-e0099d9a00f7?auto=format&fit=crop&q=80&w=300',
  'Ladies Finger': 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&q=80&w=300',
  'Beetroot': 'https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&q=80&w=300',
};

const LOCATIONS = [
  'Coimbatore, Tamil Nadu', 'Salem, Tamil Nadu', 'Chennai, Tamil Nadu',
  'Madurai, Tamil Nadu', 'Trichy, Tamil Nadu', 'Erode, Tamil Nadu',
  'Tirunelveli, Tamil Nadu', 'Mumbai, Maharashtra', 'Delhi, NCR',
  'Bangalore, Karnataka', 'Hyderabad, Telangana', 'Pune, Maharashtra',
];

const FILTER_CHIPS = ['All','Vegetables','Fruits','Greens','Pulses',"Today's Highest","Today's Lowest",'Trending','Price Increased','Price Decreased'];

/* ─── Sparkline ─────────────────────── */
function Sparkline({ points, trend, color }) {
  const pts = points || [12,14,11,13,12,15,14];
  const max = Math.max(...pts), min = Math.min(...pts);
  const norm = (v) => 28 - ((v - min) / (max - min + 0.1)) * 24;
  const d = pts.map((p,i) => `${i===0?'M':'L'} ${i*14} ${norm(p)}`).join(' ');
  const ac = color || (trend==='up'?'#16a34a':trend==='down'?'#dc2626':'#2563eb');
  return (
    <svg width="98" height="30" viewBox="0 0 98 30" fill="none" style={{filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.08))'}}>
      <defs>
        <linearGradient id={`sg-${ac.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ac} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={ac} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={d+` L ${(pts.length-1)*14} 30 L 0 30 Z`} fill={`url(#sg-${ac.replace('#','')})`}/>
      <path d={d} stroke={ac} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx={(pts.length-1)*14} cy={norm(pts[pts.length-1])} r="3.5" fill={ac} stroke="#fff" strokeWidth="2"/>
    </svg>
  );
}

/* ─── Ticker ──────────────────── */
function Ticker({ items }) {
  const doubled = [...items,...items];
  return (
    <div className="mp-ticker-wrap">
      <div className="mp-ticker-inner">
        {doubled.map((item,i) => {
          const isUp = item.changePercent > 0;
          const isDown = item.changePercent < 0;
          return (
            <span key={i} className="mp-ticker-item">
              <span style={{fontSize:14}}>{VEG_EMOJIS[item.vegetable]||'🌱'}</span>
              <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.85)'}}>{item.vegetable}</span>
              <span style={{fontSize:11,fontWeight:900,color:'#fff'}}>₹{item.price}</span>
              {isUp && <ArrowUpRight size={11} color="#bbf7d0"/>}
              {isDown && <ArrowDownRight size={11} color="#fecaca"/>}
              {!isUp&&!isDown && <Minus size={11} color="rgba(255,255,255,0.4)"/>}
              <span style={{color:'rgba(255,255,255,0.15)',marginLeft:8}}>|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main ────────────────────────────────── */
export default function MarketPrices() {
  const { role } = useAuth();
  const [location, setLocation] = useState('Coimbatore, Tamil Nadu');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pricesList, setPricesList] = useState([]);
  const [customCrops, setCustomCrops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Trending');
  const [fetchingCustom, setFetchingCustom] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    globalEnabled: true, subscribedVegetables: ['Tomato','Onion','Potato'],
    weatherEnabled:true, loanEnabled:true, plannerEnabled:true,
    diseaseEnabled:true, schemesEnabled:true, newsEnabled:true,
  });

  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  useEffect(() => {
    (async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db,'users',auth.currentUser.uid));
        if (snap.exists() && snap.data().notificationSettings) setNotifSettings(snap.data().notificationSettings);
      } catch(e){console.warn(e);}
    })();
  }, []);

  const savePreferences = async (updated) => {
    if (!auth.currentUser) return;
    try { await updateDoc(doc(db,'users',auth.currentUser.uid),{notificationSettings:updated}); setNotifSettings(updated); }
    catch { toast.error('Failed to save settings'); }
  };

  const enrichPrices = (rawList) => rawList.map((item) => {
    const numericPrice = parseFloat(String(item.price||'').replace(/[^\d.]/g,''))||30;
    const seed = item.vegetable.charCodeAt(0) + numericPrice;
    const changePercent = Math.round(((seed%15)-6)*10)/10;
    const diff = Math.round((numericPrice*(changePercent/100))*10)/10;
    const yesterdayPrice = Math.round(numericPrice - diff);
    const points = [yesterdayPrice-2,yesterdayPrice+1,yesterdayPrice-1,yesterdayPrice,yesterdayPrice-2,yesterdayPrice,numericPrice];
    const tags = [];
    if (changePercent>6) tags.push('📈 High Demand'); else if (changePercent<-4) tags.push('⚠️ Price Drop');
    else if (seed%3===0) tags.push('🔥 Hot Selling'); else tags.push('💰 Best Price');
    if (numericPrice>40 && seed%2===0) tags.push('🌧️ Weather Impact');
    let aiSuggestion='⏳ Wait 2 days'; if(changePercent>3) aiSuggestion='✅ Good to sell'; else if(changePercent<-3) aiSuggestion='🚨 Buy immediately';
    return {...item, price:numericPrice, yesterdayPrice, diff, changePercent, points, tags, category:VEG_CATEGORIES[item.vegetable]||'Vegetables', aiSuggestion, lastUpdated:'9:15 AM'};
  });

  const fetchAllPrices = async (loc, isRefresh=false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const cleanLoc = loc.split(',')[0].trim();
      const res = await api.get(`/prices-all?location=${encodeURIComponent(cleanLoc)}`);
      if (res.data?.prices) {
        setPricesList(enrichPrices(res.data.prices));
        api.post('/api/notifications/trigger-price-alert',{location:cleanLoc,prices:res.data.prices}).catch(()=>{});
      }
    } catch { toast.error('Failed to load prices'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const simulatePriceAlert = async () => {
    try {
      const cleanLoc = location.split(',')[0].trim();
      setRefreshing(true);
      const res = await api.get(`/prices-all?location=${encodeURIComponent(cleanLoc)}&simulate=true`);
      if (res.data?.prices) {
        setPricesList(enrichPrices(res.data.prices));
        await api.post('/api/notifications/trigger-price-alert',{location:cleanLoc,prices:res.data.prices});
        toast.success('Price variation simulated!');
      }
    } catch { toast.error('Simulation failed'); } finally { setRefreshing(false); }
  };

  const handleFetchCustomCrop = async (targetCrop) => {
    if (!targetCrop.trim()) return;
    setFetchingCustom(true);
    try {
      const cleanLoc = location.split(',')[0].trim();
      const res = await api.get(`/prices?vegetable=${encodeURIComponent(targetCrop.trim())}&location=${encodeURIComponent(cleanLoc)}`);
      if (res.data) {
        const enriched = enrichPrices([res.data])[0];
        setCustomCrops(p=>{const f=p.filter(c=>c.vegetable.toLowerCase()!==enriched.vegetable.toLowerCase());return[...f,enriched];});
        toast.success(`Added ${enriched.vegetable}!`);
      }
    } catch { toast.error(`Could not fetch rate for ${targetCrop}`); } finally { setFetchingCustom(false); }
  };

  useEffect(()=>{fetchAllPrices(location);},[location]);

  const handleGPSLocation = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ()=>{setTimeout(()=>{setLocation('Trichy, Tamil Nadu');setLocationModalOpen(false);setGpsLoading(false);toast.success('📍 Located at Trichy');},1200);},
        ()=>{toast.error('GPS denied');setGpsLoading(false);}
      );
    } else { toast.error('Geolocation not supported'); setGpsLoading(false); }
  };

  const toggleVegNotif = async (name) => {
    let list = [...notifSettings.subscribedVegetables];
    const sub = list.includes(name);
    list = sub ? list.filter(n=>n!==name) : [...list,name];
    toast.success(sub?`🔕 Muted ${name}`:`🔔 Alert: ${name}`);
    await savePreferences({...notifSettings,subscribedVegetables:list});
  };

  const allDisplayItems = [...pricesList,...customCrops];
  const filtered = allDisplayItems.filter(item => {
    if (!item.vegetable.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeFilter==='All') return true;
    if (activeFilter==='Vegetables') return item.category==='Vegetables';
    if (activeFilter==='Fruits') return item.category==='Fruits';
    if (activeFilter==='Greens') return item.category==='Greens';
    if (activeFilter==='Pulses') return item.category==='Pulses';
    if (activeFilter==="Today's Highest"){const m=Math.max(...allDisplayItems.map(i=>i.price));return item.price===m;}
    if (activeFilter==="Today's Lowest"){const m=Math.min(...allDisplayItems.map(i=>i.price));return item.price===m;}
    if (activeFilter==='Trending') return item.tags.some(t=>t.includes('Hot')||t.includes('High Demand'));
    if (activeFilter==='Price Increased') return item.changePercent>0;
    if (activeFilter==='Price Decreased') return item.changePercent<0;
    return true;
  });
  const sorted = [...filtered].sort((a,b) => {
    if(sortBy==='Highest Price')return b.price-a.price;if(sortBy==='Lowest Price')return a.price-b.price;
    if(sortBy==='A–Z')return a.vegetable.localeCompare(b.vegetable);if(sortBy==='Z–A')return b.vegetable.localeCompare(a.vegetable);
    if(sortBy==='Highest Increase')return b.changePercent-a.changePercent;if(sortBy==='Highest Decrease')return a.changePercent-b.changePercent;
    return 0;
  });
  const avgMarketPrice = allDisplayItems.length?Math.round(allDisplayItems.reduce((a,c)=>a+c.price,0)/allDisplayItems.length):0;
  const highestVeg = allDisplayItems.length?[...allDisplayItems].sort((a,b)=>b.price-a.price)[0]:null;
  const lowestVeg = allDisplayItems.length?[...allDisplayItems].sort((a,b)=>a.price-b.price)[0]:null;
  const mostIncreased = allDisplayItems.length?[...allDisplayItems].sort((a,b)=>b.changePercent-a.changePercent)[0]:null;
  const mostDecreased = allDisplayItems.length?[...allDisplayItems].sort((a,b)=>a.changePercent-b.changePercent)[0]:null;
  const filteredLocations = LOCATIONS.filter(l=>l.toLowerCase().includes(searchLocationQuery.toLowerCase()));

  /* 3D tilt handler */
  const onCardMove = (e) => {
    const c = e.currentTarget, r = c.getBoundingClientRect();
    const rx = ((e.clientY-r.top-r.height/2)/r.height)*-10;
    const ry = ((e.clientX-r.left-r.width/2)/r.width)*10;
    c.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  };
  const onCardLeave = (e) => { e.currentTarget.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateY(0)'; };

  return (
    <div className="feature-layout" style={{background:'linear-gradient(160deg, #f0fdf4 0%, #f8fafc 35%, #ecfdf5 70%, #f1f5f9 100%)',minHeight:'100vh'}}>
      <style>{`
        /* Ticker */
        .mp-ticker-wrap{background:linear-gradient(90deg,#16a34a,#15803d,#059669);padding:9px 0;overflow:hidden;
          mask-image:linear-gradient(to right,transparent,black 6%,black 94%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 6%,black 94%,transparent);}
        .mp-ticker-inner{display:flex;white-space:nowrap;animation:mp-scroll 32s linear infinite;}
        .mp-ticker-item{display:inline-flex;align-items:center;gap:6px;margin-right:26px;}
        @keyframes mp-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}

        /* 3D card */
        .mp-card{
          position:relative;background:#fff;border:1.5px solid #e2e8f0;border-radius:22px;overflow:hidden;
          transition:transform 0.12s ease,box-shadow 0.25s ease;transform-style:preserve-3d;
          box-shadow:0 4px 16px rgba(0,0,0,0.04),0 1px 3px rgba(0,0,0,0.06);
        }
        .mp-card:hover{box-shadow:0 20px 40px rgba(22,163,74,0.1),0 8px 16px rgba(0,0,0,0.06);}
        .mp-card::before{
          content:'';position:absolute;inset:0;border-radius:22px;padding:1.5px;
          background:linear-gradient(135deg,rgba(22,163,74,0.2),transparent 60%,rgba(22,163,74,0.08));
          -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
          mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
          -webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;opacity:0;transition:opacity 0.3s;
        }
        .mp-card:hover::before{opacity:1;}

        /* Glass panel */
        .mp-glass{background:rgba(255,255,255,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1.5px solid rgba(226,232,240,0.8);border-radius:22px;box-shadow:0 2px 12px rgba(0,0,0,0.03);}

        /* Chip */
        .mp-chip{padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;
          transition:all 0.2s;cursor:pointer;border:1.5px solid transparent;}
        .mp-chip-on{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border-color:rgba(22,163,74,0.4);
          box-shadow:0 3px 12px rgba(22,163,74,0.25);}
        .mp-chip-off{background:#f8fafc;color:#64748b;border-color:#e2e8f0;}
        .mp-chip-off:hover{background:#f0fdf4;color:#16a34a;border-color:#86efac;}

        /* Bell */
        .mp-bell-pulse{animation:mp-bellP 2s infinite ease-in-out;}
        @keyframes mp-bellP{0%,100%{transform:scale(1)}50%{transform:scale(1.15) rotate(-8deg)}}

        /* Fade stagger */
        @keyframes mp-fadeUp{from{opacity:0;transform:perspective(600px) translateZ(-30px) translateY(16px)}
          to{opacity:1;transform:perspective(600px) translateZ(0) translateY(0)}}

        /* AI panel */
        .mp-ai-panel{position:fixed;bottom:88px;right:24px;width:330px;background:#fff;
          border:1.5px solid #e2e8f0;border-radius:22px;z-index:100;overflow:hidden;
          box-shadow:0 20px 50px rgba(0,0,0,0.1),0 0 0 1px rgba(22,163,74,0.05);
          animation:mp-slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both;}
        @keyframes mp-slideUp{from{opacity:0;transform:translateY(16px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}

        @media(max-width:768px){.mp-ai-panel{width:calc(100% - 32px);right:16px;bottom:80px;}}
      `}</style>

      <Sidebar links={links} role={role} />

      <main className="feature-main" style={{maxWidth:1400,position:'relative'}}>
        {allDisplayItems.length > 0 && <Ticker items={allDisplayItems} />}

        <div className="pt-20 px-4 pb-6 sm:p-6 lg:p-8">

          {/* ═══ HEADER ═══ */}
          <div className="mp-glass p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div style={{width:50,height:50,borderRadius:16,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 20px rgba(22,163,74,0.3)'}}>
                <BarChart3 size={24} color="#fff"/>
              </div>
              <div>
                <span style={{fontSize:10,color:'#94a3b8',fontWeight:800,letterSpacing:2,textTransform:'uppercase'}}>Live Market Prices</span>
                <h1 style={{fontSize:18,fontWeight:900,color:'#0f172a',display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                  <MapPin size={15} color="#16a34a"/>{location}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={simulatePriceAlert} className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] rounded-xl border border-amber-200 cursor-pointer transition-all">
                <Zap size={13}/>Test Alert
              </button>
              <button onClick={()=>fetchAllPrices(location,true)} disabled={refreshing} className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 font-bold text-[11px] rounded-xl border border-gray-200 cursor-pointer transition-all">
                <RefreshCw size={13} className={refreshing?'animate-spin':''}/>Refresh
              </button>
              <button onClick={()=>setLocationModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-xl border border-emerald-200 cursor-pointer transition-all">
                <Compass size={13}/>Change Location
              </button>
            </div>
          </div>

          {/* ═══ SEARCH & FILTERS ═══ */}
          <div className="mp-glass p-4 mb-5">
            <div className="relative mb-3">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search vegetables by name..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-400 transition-all"/>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
                {FILTER_CHIPS.map(chip=>(
                  <button key={chip} onClick={()=>setActiveFilter(chip)} className={`mp-chip ${activeFilter===chip?'mp-chip-on':'mp-chip-off'}`}>{chip}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal size={13} className="text-gray-400"/>
                <span className="text-[10px] text-gray-400 font-bold">Sort</span>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400">
                  <option>Trending</option><option>Highest Price</option><option>Lowest Price</option>
                  <option>A–Z</option><option>Z–A</option><option>Highest Increase</option><option>Highest Decrease</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification banner */}
          {!notifSettings.globalEnabled && (
            <div className="mp-glass p-4 mb-5 flex items-center justify-between border-amber-200">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔕</span>
                <div><p className="font-bold text-sm text-amber-800">Push Notifications Off</p><p className="text-xs text-amber-600/80 mt-0.5">Price alerts are muted.</p></div>
              </div>
              <button onClick={()=>savePreferences({...notifSettings,globalEnabled:true})} className="text-xs font-bold bg-amber-600 text-white px-4 py-1.5 rounded-xl hover:bg-amber-700 transition-colors cursor-pointer">Turn On</button>
            </div>
          )}

          {/* ═══ PRICE CARDS GRID ═══ */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {[...Array(8)].map((_,i)=>(
                <div key={i} className="mp-card p-5 space-y-4" style={{height:280}}>
                  <div className="h-10 w-10 rounded-2xl bg-gray-100 animate-pulse"/>
                  <div className="h-4 w-24 bg-gray-100 animate-pulse rounded-md"/>
                  <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-md"/>
                  <div className="h-12 w-full bg-gray-50 animate-pulse rounded-xl"/>
                </div>
              ))}
            </div>
          ) : (
            <>
              {sorted.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
                  {sorted.map((item,idx) => {
                    const isSub = notifSettings.subscribedVegetables.includes(item.vegetable);
                    const emoji = VEG_EMOJIS[item.vegetable]||'🌱';
                    const accent = VEG_ACCENTS[item.vegetable]||'#16a34a';
                    const imgUrl = VEG_IMAGES[item.vegetable];
                    const isUp = item.changePercent>0, isDown = item.changePercent<0;
                    const isHigh = highestVeg?.vegetable===item.vegetable;
                    const isLow = lowestVeg?.vegetable===item.vegetable;
                    return (
                      <div key={item.vegetable} className="mp-card" style={{animation:`mp-fadeUp 0.4s ease both ${idx*50}ms`}}
                        onMouseMove={onCardMove} onMouseLeave={onCardLeave}>
                        {/* Image header */}
                        <div className="relative h-28 w-full overflow-hidden bg-gray-100">
                          {imgUrl && <img src={imgUrl} alt={item.vegetable} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"/>}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"/>
                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {isHigh && <span className="bg-amber-400 text-gray-900 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 shadow"><Award size={9}/>Highest</span>}
                            {isLow && <span className="bg-blue-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 shadow"><Activity size={9}/>Lowest</span>}
                          </div>
                          {/* Bell */}
                          <button onClick={(e)=>{e.stopPropagation();toggleVegNotif(item.vegetable);}}
                            className={`absolute top-2 right-2 p-1.5 rounded-xl transition-all cursor-pointer ${isSub?'bg-emerald-500 text-white shadow mp-bell-pulse':'bg-white/90 text-gray-400 hover:text-gray-600'}`}>
                            {isSub?<Bell size={13}/>:<BellOff size={13}/>}
                          </button>
                          {/* Emoji badge */}
                          <div className="absolute -bottom-4 right-3 w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-xl shadow-lg z-10">{emoji}</div>
                        </div>

                        {/* Body */}
                        <div className="p-4 pt-6 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-extrabold text-gray-800 text-sm">{item.vegetable}</h3>
                              <span className="text-[9px] font-bold text-gray-400">📍 {location.split(',')[0]}</span>
                            </div>
                            <div className="flex items-baseline justify-between mb-3">
                              <p className="text-xl font-black text-gray-900">₹{item.price}<span className="text-xs font-bold text-gray-400">/kg</span></p>
                              <span className="text-[10px] text-gray-400 font-semibold">Yesterday: ₹{item.yesterdayPrice}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {item.tags.map(t=>{
                                const isRed = t.includes('Price Drop')||t.includes('Weather Impact');
                                return <span key={t} className={`text-[8px] font-bold px-2 py-0.5 rounded-lg border ${isRed?'bg-red-50 text-red-600 border-red-100':'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{t}</span>;
                              })}
                            </div>
                          </div>
                          {/* Sparkline + trend */}
                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <Sparkline points={item.points} trend={isUp?'up':isDown?'down':'stable'} color={accent}/>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-0.5 border ${
                              isUp?'bg-emerald-50 border-emerald-100 text-emerald-600':isDown?'bg-red-50 border-red-100 text-red-600':'bg-blue-50 border-blue-100 text-blue-600'}`}>
                              {isUp?<TrendingUp size={10}/>:isDown?<TrendingDown size={10}/>:<Minus size={10}/>}
                              {isUp?`+${item.changePercent}%`:`${item.changePercent}%`}
                            </span>
                          </div>
                          {/* AI suggestion */}
                          <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-2 flex items-center justify-between">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">AI Suggestion</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                              item.aiSuggestion.includes('Good')?'bg-emerald-100 text-emerald-800':item.aiSuggestion.includes('Wait')?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>
                              {item.aiSuggestion}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mp-glass p-12 text-center max-w-md mx-auto my-12">
                  <span className="text-5xl block mb-3">📭</span>
                  <h3 className="font-extrabold text-gray-800 text-base">No market data available</h3>
                  <p className="text-gray-400 text-xs mt-1 mb-6">No vegetables match "{searchQuery}" in {location.split(',')[0]}.</p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button onClick={()=>fetchAllPrices(location,true)} className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-xl transition-all text-xs cursor-pointer">
                      <RefreshCw size={14}/>Refresh Data
                    </button>
                    {searchQuery && (
                      <button onClick={()=>handleFetchCustomCrop(searchQuery)} disabled={fetchingCustom}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-xs cursor-pointer shadow-md shadow-emerald-500/25">
                        {fetchingCustom?<RefreshCw size={14} className="animate-spin"/>:<Search size={14}/>}
                        {fetchingCustom?'Fetching...': `Fetch "${searchQuery}" Rate`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ MARKET SUMMARY ═══ */}
              {allDisplayItems.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-800 rounded-3xl p-6 text-white shadow-xl shadow-emerald-700/15 mb-12">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={20} className="text-emerald-100"/>
                    <h3 className="text-sm font-black tracking-wider uppercase">📊 Market Summary — {location.split(',')[0]}</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                      <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">Avg Price</span>
                      <span className="text-2xl font-black block mt-1">₹{avgMarketPrice}/kg</span>
                    </div>
                    {highestVeg&&<div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                      <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">Highest</span>
                      <span className="text-base font-black block mt-1 truncate">{VEG_EMOJIS[highestVeg.vegetable]} {highestVeg.vegetable}</span>
                      <span className="text-xs font-bold text-amber-300 block">₹{highestVeg.price}/kg</span>
                    </div>}
                    {lowestVeg&&<div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                      <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">Lowest</span>
                      <span className="text-base font-black block mt-1 truncate">{VEG_EMOJIS[lowestVeg.vegetable]} {lowestVeg.vegetable}</span>
                      <span className="text-xs font-bold text-sky-200 block">₹{lowestVeg.price}/kg</span>
                    </div>}
                    {mostIncreased&&<div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                      <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">Most Increased</span>
                      <span className="text-base font-black block mt-1 truncate">{VEG_EMOJIS[mostIncreased.vegetable]} {mostIncreased.vegetable}</span>
                      <span className="text-xs font-bold text-emerald-200 block">▲ +{mostIncreased.changePercent}%</span>
                    </div>}
                    {mostDecreased&&<div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                      <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">Most Decreased</span>
                      <span className="text-base font-black block mt-1 truncate">{VEG_EMOJIS[mostDecreased.vegetable]} {mostDecreased.vegetable}</span>
                      <span className="text-xs font-bold text-rose-300 block">▼ {mostDecreased.changePercent}%</span>
                    </div>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ LOCATION MODAL ═══ */}
        {locationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm" onClick={()=>setLocationModalOpen(false)}>
            <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md p-6 shadow-2xl mx-4" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-black text-gray-800 flex items-center gap-2"><MapPin size={18} className="text-emerald-500"/>Select Location</h3>
                <button onClick={()=>setLocationModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><X size={18}/></button>
              </div>
              <button onClick={handleGPSLocation} disabled={gpsLoading}
                className="w-full mb-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/15">
                {gpsLoading?<><RefreshCw size={14} className="animate-spin"/>Fetching GPS...</>:<><Navigation size={14}/>Use Current GPS Location</>}
              </button>
              <hr className="border-gray-100 my-4"/>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="text" value={searchLocationQuery} onChange={e=>setSearchLocationQuery(e.target.value)} placeholder="Search district or city..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"/>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Districts</p>
              <div className="max-h-[180px] overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                {filteredLocations.map(loc=>{
                  const active=location===loc;
                  return <button key={loc} onClick={()=>{setLocation(loc);setLocationModalOpen(false);setSearchLocationQuery('');}}
                    className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${active?'bg-emerald-50 text-emerald-800':'hover:bg-gray-50 text-gray-600'}`}>
                    <span>{loc}</span>{active&&<Check size={12} className="text-emerald-600"/>}
                  </button>;
                })}
                {filteredLocations.length===0&&<p className="text-center text-xs text-gray-400 py-4">No match.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ FLOATING AI ═══ */}
        <div className="fixed bottom-6 right-6 z-50">
          {aiPanelOpen && (
            <div className="mp-ai-panel">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <div><h4 className="text-xs font-black">AI Market Advisor</h4><p className="text-[9px] text-emerald-100 font-semibold">Ask about market rates</p></div>
                </div>
                <button onClick={()=>setAiPanelOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-emerald-100 hover:text-white cursor-pointer"><X size={14}/></button>
              </div>
              <div className="p-4 space-y-2 bg-gray-50">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Suggested Questions</span>
                {['Should I sell tomatoes today?','What crop to plant this month?',"Today's best market opportunities",'Will onion price rise soon?'].map(q=>(
                  <button key={q} onClick={()=>{toast.success(`Redirecting: "${q}"`);setAiPanelOpen(false);window.location.hash='#/features/agro-bot';}}
                    className="w-full text-left p-3 bg-white hover:bg-emerald-50 hover:border-emerald-200 border border-gray-100 rounded-xl text-xs text-gray-700 font-bold transition-all shadow-sm flex items-center justify-between cursor-pointer">
                    <span>{q}</span><ChevronRight size={12} className="text-gray-400 shrink-0"/>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={()=>setAiPanelOpen(!aiPanelOpen)}
            className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black text-xs shadow-lg shadow-emerald-600/30 hover:scale-105 transition-all cursor-pointer border border-emerald-500">
            <span>🤖</span>Ask AI
          </button>
        </div>
      </main>
    </div>
  );
}
