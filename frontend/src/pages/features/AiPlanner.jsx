import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import {
  Sprout, MapPin, Layers, Droplets, Zap, Wind, Sun,
  ChevronDown, ChevronRight, RefreshCw, Search,
  TrendingUp, Leaf, BarChart3, Clock, FlaskConical, Info,
  DollarSign, Calendar, Sparkles, Check
} from 'lucide-react';

const LAND_UNITS = ['Acres', 'Hectares', 'Cents', 'Bigha'];

const LEVEL_COLORS = {
  'Very Low': '#ef4444', 'Low': '#f97316', 'Low–Medium': '#f59e0b',
  'Medium': '#3b82f6', 'Medium–High': '#10b981', 'High': '#16a34a', 'Very High': '#15803d',
};
const LEVEL_WIDTH = {
  'Very Low': '12%', 'Low': '25%', 'Low–Medium': '38%',
  'Medium': '52%', 'Medium–High': '68%', 'High': '84%', 'Very High': '100%',
};

function NutrientBar({ label, level }) {
  const color = LEVEL_COLORS[level] || '#6b7280';
  const width = LEVEL_WIDTH[level] || '50%';
  return (
    <div>
      <div style={{ display: 'flex', justifycontent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{level}</span>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width, background: color, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function SoilCard({ soil, location }) {
  return (
    <div className="ap-soil-card">
      <style>{`
        @keyframes ap-fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .ap-soil-card {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1.5px solid #86efac;
          border-radius: 20px;
          padding: 20px;
          animation: ap-fadeUp 0.4s ease;
          margin-bottom: 20px;
        }
        .ap-soil-header { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .ap-soil-icon { width:44px; height:44px; background:#16a34a; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ap-soil-title { font-size:16px; font-weight:900; color:#14532d; margin:0; }
        .ap-soil-sub   { font-size:12px; color:#16a34a; margin:2px 0 0; font-weight:600; }
        .ap-soil-grid  { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
        .ap-soil-stat  { background:rgba(255,255,255,0.7); border:1px solid #bbf7d0; border-radius:12px; padding:10px 12px; }
        .ap-soil-stat-label { font-size:10px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
        .ap-soil-stat-val   { font-size:14px; font-weight:800; color:#14532d; margin-top:2px; }
        .ap-crops-row  { display:flex; flex-wrap:wrap; gap:7px; margin-top:4px; }
        .ap-crop-chip  { padding:4px 10px; background:#16a34a; color:#fff; border-radius:20px; font-size:11px; font-weight:700; }
        .ap-source-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px; }
        .ap-nutrients { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
        @media(max-width:600px) { .ap-soil-grid { grid-template-columns:1fr; } }
      `}</style>

      {/* Header */}
      <div className="ap-soil-header">
        <div className="ap-soil-icon">
          <Layers size={22} color="white" />
        </div>
        <div>
          <p className="ap-soil-title">🌍 Soil Profile — {soil.location || location}</p>
          <p className="ap-soil-sub">{soil.type}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span
            className="ap-source-badge"
            style={{
              background: soil.source === 'knowledge_base' ? '#dcfce7' : '#eff6ff',
              color: soil.source === 'knowledge_base' ? '#15803d' : '#1d4ed8',
              border: `1px solid ${soil.source === 'knowledge_base' ? '#86efac' : '#bfdbfe'}`,
            }}
          >
            {soil.source === 'knowledge_base' ? '✅ Verified Data' : soil.source === 'ai_generated' ? '🤖 AI Generated' : '📊 Estimated'}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="ap-soil-grid">
        <div className="ap-soil-stat">
          <div className="ap-soil-stat-label">🧪 Soil pH</div>
          <div className="ap-soil-stat-val">{soil.ph}</div>
        </div>
        <div className="ap-soil-stat">
          <div className="ap-soil-stat-label">🌧️ Rainfall</div>
          <div className="ap-soil-stat-val">{soil.rainfall_mm} mm/yr</div>
        </div>
        <div className="ap-soil-stat">
          <div className="ap-soil-stat-label">🌡️ Climate</div>
          <div className="ap-soil-stat-val" style={{ fontSize: 12 }}>{soil.climate}</div>
        </div>
        <div className="ap-soil-stat">
          <div className="ap-soil-stat-label">💧 Drainage</div>
          <div className="ap-soil-stat-val" style={{ fontSize: 12 }}>{soil.drainage}</div>
        </div>
      </div>

      {/* Nutrient bars */}
      <div className="ap-nutrients">
        <NutrientBar label="Nitrogen (N)" level={soil.nitrogen} />
        <NutrientBar label="Phosphorus (P)" level={soil.phosphorus} />
        <NutrientBar label="Potassium (K)" level={soil.potassium} />
        <NutrientBar label="Organic Matter" level={soil.organic_matter} />
      </div>

      {/* Best crops */}
      {soil.best_crops?.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            🌾 Locally Proven Crops
          </p>
          <div className="ap-crops-row">
            {soil.best_crops.map(c => <span key={c} className="ap-crop-chip">{c}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiPlanner() {
  const { userProfile } = useAuth();
  const [form, setForm] = useState({ land: '', unit: 'Acres', location: '', crop_name: '' });
  const [loading, setLoading]             = useState(false);
  const [soilLoading, setSoilLoading]     = useState(false);
  const [result, setResult]               = useState(null);
  const [soilData, setSoilData]           = useState(null);
  const [locationInput, setLocationInput] = useState('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const role  = userProfile?.role || 'buyer';
  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Confirm Location & load Soil Profile
  const handleLocationConfirm = async () => {
    if (!locationInput.trim()) { toast.error('Enter a location first'); return; }
    setSoilLoading(true);
    setSoilData(null);
    setResult(null);
    setLocationConfirmed(false);
    try {
      const res = await api.get(`/soil-data?location=${encodeURIComponent(locationInput.trim())}`);
      setSoilData(res.data);
      setForm(f => ({ ...f, location: locationInput.trim() }));
      setLocationConfirmed(true);
      toast.success(`🌍 Soil data loaded for ${locationInput.trim()}`);
    } catch (e) {
      toast.error('Could not fetch soil data. You can still generate a plan.');
      setForm(f => ({ ...f, location: locationInput.trim() }));
      setLocationConfirmed(true);
    } finally {
      setSoilLoading(false);
    }
  };

  const handlePlan = async () => {
    if (!form.land) { toast.error('Enter land area'); return; }
    if (!form.crop_name) { toast.error('Enter crop / vegetable name'); return; }
    setLoading(true);
    try {
      const payload = { ...form, soil_profile: soilData || {} };
      const res = await api.post('/planner', payload);
      setResult(res.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'AI Planner is currently unavailable. Please verify backend is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feature-layout" style={{background:'linear-gradient(160deg, #f0fdf4 0%, #f8fafc 35%, #ecfdf5 70%, #f1f5f9 100%)',minHeight:'100vh'}}>
      <style>{`
        @keyframes ap-fadeUp  { from{opacity:0;transform:perspective(600px) translateZ(-20px) translateY(18px)} to{opacity:1;transform:perspective(600px) translateZ(0) translateY(0)} }
        @keyframes ap-spin    { to{transform:rotate(360deg)} }
        @keyframes ap-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

        .ap-page { max-width: 860px; margin: 0 auto; }

        /* Hero */
        .ap-hero {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%);
          border: 1.5px solid #86efac;
          border-radius: 24px;
          padding: 28px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
          animation: ap-fadeUp 0.4s ease;
        }
        .ap-hero::before {
          content:''; position:absolute; top:-40px; right:-40px;
          width:180px; height:180px; border-radius:50%;
          background: radial-gradient(circle, rgba(22,163,74,0.12), transparent);
          pointer-events:none;
        }
        .ap-hero-inner { display:flex; align-items:center; gap:18px; }
        .ap-hero-icon  { width:60px; height:60px; background:#16a34a; border-radius:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 6px 20px rgba(22,163,74,0.35); }
        .ap-hero-title { font-size:24px; font-weight:900; color:#14532d; margin:0 0 4px; }
        .ap-hero-sub   { font-size:14px; color:#16a34a; margin:0; }
        .ap-steps      { display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; }
        .ap-step       { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:#15803d; background:rgba(255,255,255,0.7); border:1px solid #bbf7d0; padding:6px 12px; border-radius:20px; }
        .ap-step-num   { width:20px; height:20px; background:#16a34a; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; flex-shrink:0; }

        /* Step card */
        .ap-card {
          background:rgba(255,255,255,0.9);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1.5px solid rgba(226,232,240,0.8);border-radius:22px;
          padding:24px;margin-bottom:20px;
          box-shadow:0 4px 20px rgba(0,0,0,0.04);
          animation:ap-fadeUp 0.45s ease;
          transition:transform 0.2s ease,box-shadow 0.2s ease;
        }
        .ap-card:hover{box-shadow:0 8px 30px rgba(22,163,74,0.08);}
        .ap-card-title { font-size:15px; font-weight:800; color:#111827; margin:0 0 16px; display:flex; align-items:center; gap:8px; }

        /* Location step */
        .ap-loc-wrap  { display:flex; gap:10px; align-items:flex-end; }
        .ap-loc-input { flex:1; padding:12px 14px 12px 42px; border:1.5px solid #e5e7eb; border-radius:14px; font-size:14px; color:#111827; transition:all .2s; }
        .ap-loc-input:focus { outline:none; border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,0.1); }
        .ap-loc-btn {
          padding:12px 20px; border-radius:14px; font-size:14px; font-weight:700;
          background:linear-gradient(135deg,#16a34a,#15803d); color:#fff;
          border:none; cursor:pointer; white-space:nowrap;
          box-shadow:0 3px 10px rgba(22,163,74,0.3); transition:all .2s;
          display:flex; align-items:center; gap:8px;
        }
        .ap-loc-btn:hover   { transform:translateY(-1px); box-shadow:0 5px 14px rgba(22,163,74,0.4); }
        .ap-loc-btn:disabled { opacity:.6; cursor:default; transform:none; }
        .ap-spin { animation: ap-spin 0.7s linear infinite; }

        /* Form grid */
        .ap-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .ap-label { font-size:12px; font-weight:700; color:#374151; margin-bottom:5px; display:block; }
        .ap-input {
          width:100%; padding:11px 14px; border:1.5px solid #e5e7eb; border-radius:12px;
          font-size:14px; color:#111827; background:#fff; transition:all .2s;
          box-sizing: border-box;
        }
        .ap-input:focus { outline:none; border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,0.1); }
        .ap-input-prefix { position:relative; }

        /* Generate button */
        .ap-gen-btn {
          width:100%; padding:15px; border-radius:16px; font-size:15px; font-weight:800;
          background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:10px;
          box-shadow:0 4px 14px rgba(22,163,74,0.4); transition:all .2s; margin-top:6px;
        }
        .ap-gen-btn:hover   { transform:translateY(-3px); box-shadow:0 10px 25px rgba(22,163,74,0.4); }
        .ap-gen-btn:disabled { opacity:.6; cursor:default; transform:none; }

        /* Shimmer skeleton */
        .ap-shimmer { background:linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%); background-size:300% 100%; animation:ap-shimmer 1.4s infinite; border-radius:18px; }

        /* Scorecard layouts */
        .ap-scorecard-grid { display:grid; grid-template-columns:1fr 1.2fr; gap:16px; margin-bottom:16px; }
        .ap-score-card { background:rgba(255,255,255,0.9);backdrop-filter:blur(12px);border:1.5px solid rgba(226,232,240,0.8);border-radius:22px;padding:20px;
          box-shadow:0 4px 16px rgba(0,0,0,0.03);transition:all 0.2s; }
        .ap-score-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(22,163,74,0.08);}
        .ap-financial-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f3f4f6; font-size:13px; }
        .ap-financial-row:last-child { border-bottom:none; }
        .ap-financial-label { color:#6b7280; font-weight:600; }
        .ap-financial-val { color:#111827; font-weight:800; }
        
        .ap-summary-large { font-size:24px; font-weight:900; color:#16a34a; }
        
        /* Timeline style */
        .ap-timeline-item { display:flex; gap:12px; margin-bottom:14px; position:relative; }
        .ap-timeline-item:last-child { margin-bottom:0; }
        .ap-timeline-item::after { content:''; position:absolute; left:12px; top:24px; bottom:-14px; width:2px; background:#e5e7eb; }
        .ap-timeline-item:last-child::after { display:none; }
        .ap-timeline-dot { width:26px; height:26px; border-radius:50%; background:#dcfce7; border:2px solid #86efac; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:10; font-size:11px; font-weight:800; color:#15803d; }
        .ap-timeline-body { flex:1; background:#f9fafb; padding:10px 14px; border-radius:14px; border:1px solid #e5e7eb; }
        .ap-timeline-stage { font-size:12px; font-weight:800; color:#111827; }
        .ap-timeline-action { font-size:12px; color:#4b5563; margin-top:2px; }

        @media(max-width:768px) {
          .ap-scorecard-grid { grid-template-columns:1fr; }
          .ap-form-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <Sidebar links={links} role={role} />

      <main className="feature-main">
        <div className="ap-page">

          {/* Hero */}
          <div className="ap-hero">
            <div className="ap-hero-inner">
              <div className="ap-hero-icon">
                <Sprout size={30} color="white" />
              </div>
              <div>
                <h1 className="ap-hero-title">🌱 AI Crop Planting Estimator</h1>
                <p className="ap-hero-sub">Soil suitability & cost breakdown calculator powered by Gemini AI</p>
              </div>
            </div>
            <div className="ap-steps">
              <div className="ap-step"><div className="ap-step-num">1</div> City / Location</div>
              <div className="ap-step"><div className="ap-step-num">2</div> Crop & Land Size</div>
              <div className="ap-step"><div className="ap-step-num">3</div> AI Cost Breakdown</div>
            </div>
          </div>

          {/* Step 1: Location selection */}
          <div className="ap-card">
            <p className="ap-card-title">
              <MapPin size={17} color="#16a34a" />
              Step 1 — Enter City / District
            </p>
            <div className="ap-loc-wrap" style={{ position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  className="ap-loc-input"
                  type="text"
                  value={locationInput}
                  onChange={e => { setLocationInput(e.target.value); setLocationConfirmed(false); setSoilData(null); setResult(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLocationConfirm(); }}
                  placeholder="e.g. Coimbatore, Salem, Madurai, Trichy…"
                />
              </div>
              <button className="ap-loc-btn" onClick={handleLocationConfirm} disabled={soilLoading || !locationInput.trim()}>
                {soilLoading
                  ? <><RefreshCw size={15} className="ap-spin" /> Querying Soil Data…</>
                  : <><Search size={15} /> Fetch Soil Profile</>}
              </button>
            </div>
            {locationConfirmed && !soilData && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                ⚠️ Soil profile details not found for this district. Proceeding with estimates.
              </p>
            )}
          </div>

          {/* Soil data profile card */}
          {soilLoading && <div className="ap-shimmer" style={{ height: 280, marginBottom: 20 }} />}
          {soilData && <SoilCard soil={soilData} location={locationInput} />}

          {/* Step 2: Farm Specifications & Target Crop */}
          {locationConfirmed && (
            <div className="ap-card">
              <p className="ap-card-title">
                <Layers size={17} color="#16a34a" />
                Step 2 — Tell Us About What You Want to Plant
              </p>

              <div className="ap-form-grid" style={{ marginBottom: 14 }}>
                {/* Land area */}
                <div>
                  <label className="ap-label">Land Area *</label>
                  <input name="land" value={form.land} onChange={handleChange} type="number" min="0.1" step="0.1" placeholder="e.g. 2.5" className="ap-input" />
                </div>
                <div>
                  <label className="ap-label">Unit</label>
                  <select name="unit" value={form.unit} onChange={handleChange} className="ap-input">
                    {LAND_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>

                {/* Target Crop Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="ap-label">Target Vegetable / Crop Name *</label>
                  <div style={{ position: 'relative' }}>
                    <Leaf size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input name="crop_name" value={form.crop_name} onChange={handleChange} placeholder="e.g. Tomato, Onion, Potato, Cotton, Paddy…" className="ap-input" style={{ paddingLeft: 34 }} />
                  </div>
                </div>
              </div>

              {soilData && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>The AI will cross-reference <strong>{form.crop_name || 'your crop'}</strong> suitability with <strong>{soilData.type}</strong>.</span>
                </div>
              )}

              <button className="ap-gen-btn" onClick={handlePlan} disabled={loading || !form.land || !form.crop_name}>
                {loading
                  ? <><RefreshCw size={18} className="ap-spin" /> Calculating Planting Costs…</>
                  : <><Sprout size={18} /> Calculate Planting Cost & Yield</>}
              </button>
            </div>
          )}

          {/* Results Scorecards */}
          {loading && (
            <div className="space-y-4">
              <div className="ap-shimmer" style={{ height: 180 }} />
              <div className="ap-shimmer" style={{ height: 260 }} />
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'ap-fadeUp 0.4s ease' }} className="space-y-4">
              
              {/* Suitability text */}
              <div className="ap-card bg-emerald-50 border border-emerald-100 p-5">
                <p className="ap-card-title" style={{ color: '#14532d' }}>
                  <Sparkles size={17} color="#16a34a" />
                  Soil Suitability for {result.crop_name}
                </p>
                <p style={{ fontSize: 13.5, color: '#166534', lineHeight: 1.6, margin: 0 }}>
                  {result.soil_suitability}
                </p>
              </div>

              {/* Financial Dashboard & Profit card */}
              <div className="ap-scorecard-grid">
                
                {/* Cost Breakdown Column */}
                <div className="ap-score-card">
                  <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-slate-400" />
                    Estimated Cultivation Costs
                  </h3>
                  
                  <div className="ap-financial-row">
                    <span className="ap-financial-label">🌱 Seed / Seedlings</span>
                    <span className="ap-financial-val">{result.financials?.seed_cost}</span>
                  </div>
                  <div className="ap-financial-row">
                    <span className="ap-financial-label">🚜 Land Prep & Ploughing</span>
                    <span className="ap-financial-val">{result.financials?.land_preparation}</span>
                  </div>
                  <div className="ap-financial-row">
                    <span className="ap-financial-label">🧪 Fertilizers & Pesticides</span>
                    <span className="ap-financial-val">{result.financials?.fertilizer_pesticide}</span>
                  </div>
                  <div className="ap-financial-row">
                    <span className="ap-financial-label">💧 Irrigation / Water</span>
                    <span className="ap-financial-val">{result.financials?.irrigation}</span>
                  </div>
                  <div className="ap-financial-row">
                    <span className="ap-financial-label">👷 Labor Cost</span>
                    <span className="ap-financial-val">{result.financials?.labor}</span>
                  </div>
                  <hr style={{ border: 'none', height: 1, background: '#e5e7eb', margin: '6px 0' }} />
                  <div className="ap-financial-row font-bold text-sm">
                    <span className="ap-financial-label text-slate-800">Total Cultivation Cost</span>
                    <span className="ap-financial-val text-emerald-600 text-sm">{result.financials?.total_cost}</span>
                  </div>
                </div>

                {/* Returns Summary Column */}
                <div className="ap-score-card flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                      <BarChart3 size={16} className="text-slate-400" />
                      Expected Returns Analysis
                    </h3>
                    
                    <div className="ap-financial-row">
                      <span className="ap-financial-label">🌾 Expected Yield</span>
                      <span className="ap-financial-val text-emerald-600">{result.financials?.expected_yield}</span>
                    </div>
                    <div className="ap-financial-row">
                      <span className="ap-financial-label">💰 Estimated Revenue</span>
                      <span className="ap-financial-val text-slate-800">{result.financials?.expected_revenue}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-4">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest block">Net Expected Profit</span>
                    <span className="ap-summary-large mt-1 block">{result.financials?.net_profit}</span>
                  </div>
                </div>

              </div>

              {/* Step-by-Step schedule timeline */}
              {result.timeline?.length > 0 && (
                <div className="ap-card">
                  <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    Planting & Maintenance Timeline
                  </h3>
                  <div className="pl-2">
                    {result.timeline.map((step, idx) => (
                      <div key={idx} className="ap-timeline-item">
                        <div className="ap-timeline-dot">{idx + 1}</div>
                        <div className="ap-timeline-body">
                          <p className="ap-timeline-stage">{step.stage}</p>
                          <p className="ap-timeline-action">{step.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutrients & Water recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {result.nutrient_recommendation && (
                  <div className="ap-score-card">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FlaskConical size={14} className="text-purple-500" /> Soil Nutrient Recommendations
                    </h4>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>
                      {result.nutrient_recommendation}
                    </p>
                  </div>
                )}

                {result.irrigation_recommendation && (
                  <div className="ap-score-card">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Droplets size={14} className="text-sky-500" /> Irrigation Guidelines
                    </h4>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>
                      {result.irrigation_recommendation}
                    </p>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* Initial guide info */}
          {!locationConfirmed && !soilLoading && (
            <div className="ap-info">
              <p className="ap-info-title">🌾 How the AI Crop Planner works</p>
              <ul className="ap-info-list">
                <li><span>📍</span> Enter your district/city — we auto-fetch verified soil data</li>
                <li><span>🧪</span> See your soil's pH, nitrogen, phosphorus, drainage & climate</li>
                <li><span>🌿</span> Specify your target vegetable / crop name and land size</li>
                <li><span>💰</span> Get cultivation cost calculations (seeds, labor, prep)</li>
                <li><span>📈</span> See expected yield, revenue, and net profit calculations</li>
              </ul>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
