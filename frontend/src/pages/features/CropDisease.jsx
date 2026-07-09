import { useState, useRef, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { triggerNotification } from '../../utils/notifications';
import {
  Upload, Camera, Leaf, AlertTriangle, CheckCircle,
  Volume2, VolumeX, Languages, MessageSquare, Send, X,
  MapPin, Phone, Clock, Navigation, Store, Pill, ChevronDown, ChevronUp,
  ExternalLink, ShieldCheck, Beaker, Sprout
} from 'lucide-react';

const LANGUAGE_OPTIONS = [
  { value: 'English', label: '🇬🇧 English' },
  { value: 'Tamil',   label: '🌸 Tamil' },
  { value: 'Hindi',   label: '🇮🇳 Hindi' },
];

const TYPE_ICONS = {
  'Chemical': { icon: Beaker, color: '#ef4444', bg: '#fef2f2' },
  'Organic': { icon: Sprout, color: '#22c55e', bg: '#f0fdf4' },
  'Bio-fungicide': { icon: ShieldCheck, color: '#8b5cf6', bg: '#f5f3ff' },
};

export default function CropDisease() {
  const { userProfile } = useAuth();
  const role  = userProfile?.role || 'buyer';
  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  const [image,       setImage]       = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [resultText,  setResultText]  = useState('');    // raw text from /predict
  const [loading,     setLoading]     = useState(false);
  const [translating, setTranslating] = useState(false);
  const [language,    setLanguage]    = useState('English');
  const [speaking,    setSpeaking]    = useState(false);
  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatMsg,     setChatMsg]     = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isBrief,     setIsBrief]     = useState(false);
  const [useCamera,   setUseCamera]   = useState(false);

  // Nearby shops state
  const [nearbyShops, setNearbyShops] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsExpanded, setShopsExpanded] = useState(true);
  const [medsExpanded, setMedsExpanded] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  const fileRef    = useRef(null);
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const canvasRef  = useRef(null);
  const shopsRef   = useRef(null);

  const isHealthy = resultText?.toLowerCase().includes('healthy') &&
                    !resultText?.toLowerCase().includes('disease detected');

  const handleFile = (file) => {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResultText('');
    setChatHistory([]);
    setNearbyShops([]);
    setMedicines([]);
  };

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); };

  // ── Extract disease name from result text ────────────────────────────────
  const extractDiseaseName = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('disease name:') || lower.includes('disease name :')) {
        return line.split(':').slice(1).join(':').trim().replace(/[*_#]/g, '');
      }
      if (lower.startsWith('- disease name')) {
        return line.split(':').slice(1).join(':').trim().replace(/[*_#]/g, '');
      }
    }
    // Fallback: look in DISEASE ANALYSIS section
    for (const line of lines) {
      if (line.toLowerCase().includes('disease') && line.includes(':') && !line.toLowerCase().includes('disease detected')) {
        const val = line.split(':').slice(1).join(':').trim().replace(/[*_#]/g, '');
        if (val.length > 2 && val.length < 60 && val.toLowerCase() !== 'none') return val;
      }
    }
    return '';
  };

  // ── Get user location ────────────────────────────────────────────────────
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(`Location error: ${err.message}`),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // ── Fetch nearby shops ───────────────────────────────────────────────────
  const fetchNearbyShops = async (diseaseName) => {
    setShopsLoading(true);
    setLocationError('');
    try {
      const loc = await getUserLocation();
      setUserLocation(loc);

      const res = await api.get('/nearby-agri-shops', {
        params: {
          lat: loc.lat,
          lon: loc.lon,
          radius: 10000, // 10km radius
          disease: diseaseName
        }
      });

      setNearbyShops(res.data.shops || []);
      setMedicines(res.data.medicines || []);

      if (res.data.shops?.length > 0) {
        toast.success(`Found ${res.data.shops.length} nearby agricultural shops!`);
      } else {
        toast('No agricultural shops found within 10km. Try expanding your search area.', { icon: '📍' });
      }

      // Scroll to shops section
      setTimeout(() => {
        shopsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

    } catch (err) {
      console.error('Nearby shops error:', err);
      if (typeof err === 'string') {
        setLocationError(err);
        toast.error(err);
      } else {
        toast.error('Failed to fetch nearby shops. Please try again.');
      }
    } finally {
      setShopsLoading(false);
    }
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setUseCamera(true);
    } catch {
      toast.error('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setUseCamera(false);
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
      handleFile(file);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  // ── Predict ───────────────────────────────────────────────────────────────
  const handlePredict = async () => {
    if (!image) { toast.error('Please upload a crop leaf image first'); return; }
    setLoading(true);
    setResultText('');
    setChatHistory([]);
    setNearbyShops([]);
    setMedicines([]);
    try {
      const fd = new FormData();
      fd.append('leaf', image);           // ← correct field name (Flask expects 'leaf')
      fd.append('source', 'upload');
      fd.append('brief', isBrief ? 'true' : 'false');
      const res = await api.post('/predict', fd);
      const predictionText = res.data.prediction_text || res.data.text || JSON.stringify(res.data);
      setResultText(predictionText);
      setLanguage('English');

      // Trigger success push and toast notifications
      triggerNotification('Crop Disease Analysis', '🔬 Predicted Successfully!');

      // Auto-fetch nearby shops if disease is detected
      const disease = extractDiseaseName(predictionText);
      if (disease && !predictionText.toLowerCase().includes('healthy')) {
        fetchNearbyShops(disease);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Prediction failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Translate ─────────────────────────────────────────────────────────────
  const handleTranslate = async (lang) => {
    if (!resultText || lang === 'English') return;
    setTranslating(true);
    try {
      const res = await api.post('/translate-report', { text: resultText, language: lang });
      setResultText(res.data.translated_text);
    } catch { toast.error('Translation failed'); }
    finally { setTranslating(false); }
  };

  const onLangChange = (lang) => {
    setLanguage(lang);
    handleTranslate(lang);
  };

  // ── Text-to-Speech ────────────────────────────────────────────────────────
  const handleSpeak = () => {
    if (!resultText) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utter = new SpeechSynthesisUtterance(resultText.slice(0, 2000));
    utter.lang  = language === 'Tamil' ? 'ta-IN' : language === 'Hindi' ? 'hi-IN' : 'en-IN';
    utter.rate  = 0.9;
    utter.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  // ── Follow-up Chat ────────────────────────────────────────────────────────
  const handleChat = async () => {
    if (!chatMsg.trim() || !resultText) return;
    const userMsg = chatMsg.trim();
    setChatHistory(h => [...h, { role: 'user', text: userMsg }]);
    setChatMsg('');
    setChatLoading(true);
    try {
      const res = await api.post('/ask-leaf-followup', { question: userMsg, report: resultText });
      setChatHistory(h => [...h, { role: 'ai', text: res.data.answer }]);
    } catch { setChatHistory(h => [...h, { role: 'ai', text: 'Sorry, could not get an answer right now.' }]); }
    finally { setChatLoading(false); }
  };

  // ── Format plain text result into readable sections ───────────────────────
  const formatResult = (text) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
      const isHeader = /^[A-Z][A-Z &]+$/.test(line.trim()) ||
                       /^(CROP|LEAF|DISEASE|PRIORITY|WHY|KEY|TREATMENT|DO NOT|RECOVERY|FINAL)/.test(line.trim());
      if (isHeader) return (
        <h3 key={i} className="font-bold text-gray-800 mt-4 mb-1 text-sm uppercase tracking-wide border-b border-gray-100 pb-1">{line}</h3>
      );
      const isStatus = line.includes('🟢') || line.includes('🟡') || line.includes('🔴');
      return (
        <p key={i} className={`text-sm leading-relaxed mb-0.5 ${
          isStatus ? 'font-semibold text-base' :
          line.startsWith('-') || line.startsWith('•') ? 'text-gray-600 ml-2' : 'text-gray-700'
        }`}>{line}</p>
      );
    });
  };

  // ── Open Google Maps Directions ──────────────────────────────────────────
  const openDirections = (shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lon}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex min-h-screen" style={{background:'linear-gradient(160deg, #f0fdf4 0%, #f8fafc 35%, #ecfdf5 70%, #f1f5f9 100%)'}}>
      <style>{`
        .cd-glass{background:rgba(255,255,255,0.85);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1.5px solid rgba(226,232,240,0.8);border-radius:22px;box-shadow:0 4px 20px rgba(0,0,0,0.04);}
        .cd-upload-zone{border:2.5px dashed #86efac;border-radius:24px;padding:40px;text-align:center;cursor:pointer;
          transition:all 0.35s cubic-bezier(0.4,0,0.2,1);background:linear-gradient(135deg,#f0fdf4,#fff);position:relative;overflow:hidden;}
        .cd-upload-zone:hover{border-color:#16a34a;background:linear-gradient(135deg,#dcfce7,#f0fdf4);
          transform:translateY(-3px);box-shadow:0 12px 30px rgba(22,163,74,0.1);}
        .cd-upload-zone::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;
          background:radial-gradient(circle,rgba(22,163,74,0.04) 0%,transparent 70%);pointer-events:none;}
        .cd-result-card{background:#fff;border-radius:22px;padding:24px;border:1.5px solid #e2e8f0;
          box-shadow:0 4px 16px rgba(0,0,0,0.04);animation:cd-fadeIn 0.5s ease both;}
        .cd-btn-primary{padding:14px 24px;border-radius:16px;font-size:14px;font-weight:800;
          background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
          box-shadow:0 4px 14px rgba(22,163,74,0.3);transition:all 0.2s;}
        .cd-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(22,163,74,0.35);}
        .cd-btn-primary:disabled{opacity:0.5;cursor:default;transform:none;}
        .cd-btn-secondary{padding:14px 20px;border-radius:16px;font-size:14px;font-weight:700;
          background:#f0fdf4;color:#16a34a;border:1.5px solid #86efac;cursor:pointer;
          display:flex;align-items:center;gap:8px;transition:all 0.2s;}
        .cd-btn-secondary:hover{background:#dcfce7;}
        @keyframes cd-fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .cd-hero-icon{width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,#16a34a,#15803d);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 20px rgba(22,163,74,0.3);}
      `}</style>
      <Sidebar links={links} role={role} />
      <main className="flex-1 ml-[220px] pt-20 px-4 pb-8 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="cd-glass p-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" style={{animation:'cd-fadeIn 0.4s ease both'}}>
            <div className="flex items-center gap-4">
              <div className="cd-hero-icon">
                <span style={{fontSize:26}}>🔬</span>
              </div>
              <div>
                <span style={{fontSize:10,color:'#94a3b8',fontWeight:800,letterSpacing:2,textTransform:'uppercase'}}>AI-Powered Analysis</span>
                <h1 style={{fontSize:22,fontWeight:900,color:'#0f172a',margin:'4px 0 0'}}>Crop Disease Detection</h1>
                <p style={{fontSize:12,color:'#64748b',margin:'4px 0 0'}}>Upload a leaf image — AI identifies diseases, suggests remedies & finds shops</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer" style={{background:'#f0fdf4',padding:'8px 16px',borderRadius:14,border:'1.5px solid #86efac'}}>
              <span style={{fontSize:12,fontWeight:700,color:'#16a34a'}}>Brief Mode</span>
              <div
                onClick={() => setIsBrief(b => !b)}
                style={{width:42,height:22,borderRadius:11,position:'relative',transition:'background 0.2s',background:isBrief?'#16a34a':'#cbd5e1',cursor:'pointer'}}
              >
                <div style={{position:'absolute',top:2,left:isBrief?22:2,width:18,height:18,background:'#fff',borderRadius:'50%',boxShadow:'0 2px 4px rgba(0,0,0,0.15)',transition:'left 0.2s'}}/>
              </div>
            </label>
          </div>

          {/* Camera / Upload Card */}
          <div className="cd-result-card mb-6">
            {useCamera ? (
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-3 mt-3">
                  <button onClick={capturePhoto} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Camera size={18} /> Capture Photo
                  </button>
                  <button onClick={stopCamera} className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="cd-upload-zone group"
                >
                  {preview ? (
                    <div className="flex flex-col items-center gap-4">
                      <img src={preview} alt="Uploaded" className="max-h-64 rounded-2xl shadow-xl object-contain" style={{border:'3px solid #86efac'}}/>
                      <p style={{color:'#16a34a',fontWeight:700,fontSize:13,marginTop:8}}>Click to change image</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-gray-400 group-hover:text-emerald-500 transition-colors">
                      <div style={{width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#dcfce7,#f0fdf4)',border:'2px solid #86efac',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Upload size={32} strokeWidth={1.5} color="#16a34a"/>
                      </div>
                      <div>
                        <p style={{fontWeight:800,fontSize:15,color:'#374151'}}>Drop an image here or click to upload</p>
                        <p style={{fontSize:12,color:'#94a3b8',marginTop:4}}>JPG, PNG, WEBP • Max 10 MB</p>
                      </div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
                </div>

                <div className="flex gap-3 mt-4">
                  <button onClick={handlePredict} disabled={!image || loading} className="cd-btn-primary flex-1">
                    {loading ? (
                      <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Analyzing with AI...</>
                    ) : (
                      <><Leaf size={18} /> Detect Disease</>
                    )}
                  </button>
                  <button onClick={startCamera} className="cd-btn-secondary">
                    <Camera size={18} /> Camera
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Result */}
          {resultText && (
            <div className="cd-result-card" style={{borderColor:isHealthy?'#86efac':'#fca5a5',borderWidth:2}}>
              {/* Result header + controls */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {isHealthy
                    ? <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
                    : <AlertTriangle size={24} className="text-red-600 flex-shrink-0" />
                  }
                  <h2 className={`font-extrabold text-lg ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>
                    {isHealthy ? '✅ Plant Appears Healthy' : '⚠️ Issue Detected'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Language selector */}
                  <select
                    value={language}
                    onChange={e => onLangChange(e.target.value)}
                    disabled={translating}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
                  >
                    {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  {/* TTS Button */}
                  <button
                    onClick={handleSpeak}
                    className={`p-2 rounded-xl transition-colors ${speaking ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={speaking ? 'Stop' : 'Read aloud'}
                  >
                    {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  {/* Chat Button */}
                  <button
                    onClick={() => setChatOpen(o => !o)}
                    className="p-2 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    title="Ask follow-up questions"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>

              {translating && (
                <div className="flex items-center gap-2 text-primary-600 text-sm mb-3">
                  <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                  Translating...
                </div>
              )}

              {/* Formatted result text */}
              <div style={{background:'linear-gradient(135deg,#f8fafc,#f0fdf4)',borderRadius:18,padding:20,maxHeight:500,overflowY:'auto',border:'1px solid #e2e8f0'}}>
                {formatResult(resultText)}
              </div>

              {/* Follow-up Chat Panel */}
              {chatOpen && (
                <div className="mt-4 border border-blue-100 rounded-2xl overflow-hidden animate-slide-up">
                  <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                    <p className="text-blue-800 font-semibold text-sm flex items-center gap-2">
                      <MessageSquare size={15} /> Ask a Follow-up Question
                    </p>
                    <button onClick={() => setChatOpen(false)}><X size={15} className="text-blue-500" /></button>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-3 space-y-2 bg-white">
                    {chatHistory.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 px-3 py-2 rounded-2xl text-sm text-gray-500 animate-pulse">Thinking...</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white">
                    <input
                      value={chatMsg}
                      onChange={e => setChatMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleChat()}
                      placeholder="Ask about treatment, prevention..."
                      className="input text-sm py-2 flex-1"
                    />
                    <button onClick={handleChat} disabled={!chatMsg.trim() || chatLoading} className="btn-primary p-2.5">
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MEDICINE RECOMMENDATIONS + NEARBY SHOPS SECTION
              ═══════════════════════════════════════════════════════════════════ */}
          {resultText && !isHealthy && (
            <div ref={shopsRef} className="mt-6 space-y-6 animate-fade-in">

              {/* Manual trigger button if shops haven't been loaded yet */}
              {nearbyShops.length === 0 && medicines.length === 0 && !shopsLoading && (
                <button
                  onClick={() => fetchNearbyShops(extractDiseaseName(resultText))}
                  className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-all group cursor-pointer flex items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                    <MapPin size={24} className="text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-emerald-800 text-base">Find Nearby Medicine Shops</p>
                    <p className="text-emerald-600 text-xs">Uses your GPS to locate agricultural stores within 10km</p>
                  </div>
                  <Navigation size={20} className="text-emerald-500 ml-auto group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {/* Loading state */}
              {shopsLoading && (
                <div className="card text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                  <p className="font-semibold text-gray-700 text-base">Finding nearby shops...</p>
                  <p className="text-gray-400 text-sm mt-1">Searching agricultural stores & generating medicine recommendations</p>
                </div>
              )}

              {/* Location error */}
              {locationError && (
                <div className="card bg-red-50 border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-500" />
                    <div>
                      <p className="font-semibold text-red-800 text-sm">{locationError}</p>
                      <p className="text-red-600 text-xs mt-0.5">Please enable location access in your browser settings and try again.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Medicine Recommendations ─────────────────────────────────── */}
              {medicines.length > 0 && (
                <div className="card border border-purple-100 overflow-hidden">
                  <button
                    onClick={() => setMedsExpanded(e => !e)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Pill size={20} className="text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-800 text-base">Recommended Medicines</h3>
                        <p className="text-gray-400 text-xs">{medicines.length} treatments recommended for detected disease</p>
                      </div>
                    </div>
                    {medsExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </button>

                  {medsExpanded && (
                    <div className="mt-4 space-y-3">
                      {medicines.map((med, i) => {
                        const typeInfo = TYPE_ICONS[med.type] || TYPE_ICONS['Chemical'];
                        const TypeIcon = typeInfo.icon;
                        return (
                          <div key={i} className="rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all hover:border-gray-200 bg-white">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeInfo.bg }}>
                                    <TypeIcon size={14} style={{ color: typeInfo.color }} />
                                  </div>
                                  <h4 className="font-bold text-gray-800 text-sm">{med.name}</h4>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}>
                                    {med.type}
                                  </span>
                                </div>
                                <p className="text-gray-500 text-xs mb-1.5">{med.generic}</p>
                                <p className="text-gray-600 text-xs leading-relaxed">
                                  <span className="font-medium text-gray-700">Dosage:</span> {med.dosage}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-emerald-700 text-sm">{med.price_range}</p>
                                <div className="flex items-center gap-1 mt-1 justify-end">
                                  <span className="text-[10px] text-gray-400">Effectiveness:</span>
                                  <span className={`text-[10px] font-bold ${
                                    med.effectiveness === 'High' ? 'text-green-600' :
                                    med.effectiveness === 'Medium' ? 'text-yellow-600' : 'text-red-500'
                                  }`}>{med.effectiveness}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Nearby Shops Grid ────────────────────────────────────────── */}
              {nearbyShops.length > 0 && (
                <div className="card border border-emerald-100 overflow-hidden">
                  <button
                    onClick={() => setShopsExpanded(e => !e)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <Store size={20} className="text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-800 text-base">Nearby Agricultural Shops</h3>
                        <p className="text-gray-400 text-xs">{nearbyShops.length} shops found within 10km of your location</p>
                      </div>
                    </div>
                    {shopsExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </button>

                  {shopsExpanded && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {nearbyShops.map((shop, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 p-4 hover:shadow-lg transition-all hover:border-emerald-200 bg-white group">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-800 text-sm truncate">{shop.name}</h4>
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                                <MapPin size={10} /> {shop.distance_km} km away
                              </span>
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                              <Store size={16} className="text-emerald-600" />
                            </div>
                          </div>

                          {shop.address && shop.address !== 'Nearby location' && (
                            <p className="text-gray-500 text-xs flex items-start gap-1.5 mb-1.5">
                              <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{shop.address}</span>
                            </p>
                          )}

                          {shop.phone && (
                            <a href={`tel:${shop.phone}`} className="text-blue-600 text-xs flex items-center gap-1.5 mb-1.5 hover:underline">
                              <Phone size={12} /> {shop.phone}
                            </a>
                          )}

                          {shop.opening_hours && (
                            <p className="text-gray-400 text-xs flex items-center gap-1.5 mb-2">
                              <Clock size={12} /> {shop.opening_hours}
                            </p>
                          )}

                          <button
                            onClick={() => openDirections(shop)}
                            className="w-full mt-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all hover:from-emerald-600 hover:to-teal-700"
                          >
                            <Navigation size={14} /> Get Directions
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state for shops (after loading) */}
              {!shopsLoading && nearbyShops.length === 0 && medicines.length > 0 && (
                <div className="card bg-amber-50 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 text-sm">No agricultural shops found nearby</p>
                      <p className="text-amber-600 text-xs mt-0.5">
                        OpenStreetMap data may not cover your area fully. Try searching for "agricultural shop" or "pesticide shop" on Google Maps for your area.
                      </p>
                      <button
                        onClick={() => window.open(`https://www.google.com/maps/search/agricultural+shop+near+me/@${userLocation?.lat},${userLocation?.lon},14z`, '_blank')}
                        className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 underline"
                      >
                        <ExternalLink size={12} /> Search on Google Maps instead
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          {!resultText && (
            <div className="cd-glass" style={{padding:24,animation:'cd-fadeIn 0.5s ease both 0.2s',background:'linear-gradient(135deg,#fffbeb,#fef9c3)',border:'1.5px solid #fde68a'}}>
              <h3 style={{fontWeight:800,fontSize:15,color:'#92400e',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>📸 Tips for better results</h3>
              <ul style={{color:'#a16207',fontSize:13,lineHeight:1.8}}>
                <li>• Use clear, well-lit photos of the affected leaf</li>
                <li>• Try to fill the frame with the leaf</li>
                <li>• Supported crops: Tomato, Potato, Corn, Rice, Wheat, and many more</li>
                <li>• Avoid blurry or dark images — use the camera button for live capture</li>
                <li>• Enable <strong>Brief Mode</strong> for a quick summary only</li>
                <li>• After detection, AI will recommend <strong>medicines</strong> and find <strong>nearby shops</strong> automatically!</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
