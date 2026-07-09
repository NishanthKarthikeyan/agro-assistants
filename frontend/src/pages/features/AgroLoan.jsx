import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { SIDEBAR_LINKS } from '../../config/sidebarLinks';
import { Upload, CheckCircle, ChevronRight, ChevronLeft, FileText, User, CreditCard, Banknote } from 'lucide-react';
import api from '../../utils/api';

const LOAN_TYPES = [
  { id: 'kisan_credit', label: 'Kisan Credit Card', desc: 'Short-term crop loans at low interest', rate: '4%', max: '₹3,00,000' },
  { id: 'term_loan', label: 'Agriculture Term Loan', desc: 'For equipment, irrigation, land development', rate: '7%', max: '₹10,00,000' },
  { id: 'gold_loan', label: 'Gold/Jewel Loan', desc: 'Against gold ornaments — quick disbursement', rate: '8.5%', max: '₹20,00,000' },
  { id: 'pm_kisan', label: 'PM-KISAN Scheme', desc: 'Government income support ₹6,000/year', rate: '0%', max: '₹6,000/year' },
  { id: 'warhehouse', label: 'Warehouse Receipt Loan', desc: 'Against stored produce', rate: '6%', max: '₹5,00,000' },
];

const STEPS = [
  { id: 1, icon: <User size={18} />, label: 'Personal Info' },
  { id: 2, icon: <CreditCard size={18} />, label: 'Loan Details' },
  { id: 3, icon: <FileText size={18} />, label: 'Documents' },
  { id: 4, icon: <CheckCircle size={18} />, label: 'Review & Submit' },
];

export default function AgroLoan() {
  const { user, userProfile } = useAuth();
  const role = userProfile?.role || 'buyer';
  const links = SIDEBAR_LINKS[role] || SIDEBAR_LINKS.buyer;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [panFile, setPanFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);

  const [form, setForm] = useState({
    fullName: userProfile?.displayName || '',
    phone: userProfile?.phone || '',
    aadhar: '',
    address: '',
    city: userProfile?.address?.city || '',
    state: userProfile?.address?.state || '',
    pincode: userProfile?.address?.pincode || '',
    landArea: '',
    landUnit: 'Acres',
    farmType: 'Own',
    loanType: 'kisan_credit',
    loanAmount: '',
    purpose: '',
    repaymentPeriod: '12',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    agree: false,
  });

  const selected = LOAN_TYPES.find(l => l.id === form.loanType);

  const handleChange = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [e.target.name]: val }));
  };

  const monthlyEmi = () => {
    const p = parseFloat(form.loanAmount) || 0;
    const r = parseFloat(selected?.rate) / 100 / 12;
    const n = parseInt(form.repaymentPeriod);
    if (!p || !r || !n) return 0;
    return Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  };

  const handleSubmit = async () => {
    if (!form.agree) { toast.error('Please accept the terms'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/buyer/loans', {
        fullName: form.fullName,
        phone: form.phone,
        aadhar: form.aadhar,
        address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
        landArea: `${form.landArea} ${form.landUnit}`,
        farmType: form.farmType,
        loanType: selected?.label,
        loanAmount: form.loanAmount,
        purpose: form.purpose,
        repaymentPeriod: form.repaymentPeriod + ' months',
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        estimatedEmi: monthlyEmi(),
      });
      setSubmitted(true);
      toast.success('Loan application submitted! 🎉');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Submission failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar links={links} role={role} />
        <main className="flex-1 ml-[220px] pt-20 px-4 pb-8 md:p-8 flex items-center justify-center">
          <div className="card text-center max-w-md">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 mb-2">Your loan application for <span className="font-bold text-primary-600">{selected?.label}</span> has been received.</p>
            <p className="text-gray-400 text-sm mb-6">Expected EMI: <span className="font-bold text-gray-700">₹{monthlyEmi().toLocaleString('en-IN')}/month</span></p>
            <div className="bg-green-50 rounded-2xl p-4 text-left text-sm text-green-700 mb-5 space-y-1">
              <p>• Our team will contact you within 2-3 working days</p>
              <p>• Keep your Aadhar, PAN, and bank documents ready</p>
              <p>• Interest rate: {selected?.rate} per annum</p>
            </div>
            <button onClick={() => { setSubmitted(false); setStep(1); }} className="btn-secondary">Apply for Another Loan</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={links} role={role} />
      <main className="flex-1 ml-[220px] pt-20 px-4 pb-8 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="page-header mb-1 flex items-center gap-3">
              <span className="text-4xl">🏦</span> Agri Loan Application
            </h1>
            <p className="text-gray-400 text-sm">Apply for government and bank agricultural loan schemes</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${step >= s.id ? 'text-primary-600' : 'text-gray-300'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                    step > s.id ? 'bg-primary-600 text-white' : step === s.id ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step > s.id ? <CheckCircle size={16} /> : s.icon}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${step >= s.id ? 'text-primary-700' : 'text-gray-400'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? 'bg-primary-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="card space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">👤 Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} className="input" required />
                </div>
                <div>
                  <label className="label">Mobile Number *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} type="tel" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Aadhar Number *</label>
                <input name="aadhar" value={form.aadhar} onChange={handleChange} placeholder="XXXX XXXX XXXX" maxLength={14} className="input" />
              </div>
              <div>
                <label className="label">Address *</label>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Street / Village" className="input" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">City</label>
                  <input name="city" value={form.city} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="label">State</label>
                  <input name="state" value={form.state} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="label">PIN Code</label>
                  <input name="pincode" value={form.pincode} onChange={handleChange} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Land Area</label>
                  <input name="landArea" value={form.landArea} onChange={handleChange} type="number" min="0.1" className="input" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select name="landUnit" value={form.landUnit} onChange={handleChange} className="input">
                    {['Acres','Hectares','Cents','Bigha'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Farm Ownership</label>
                  <select name="farmType" value={form.farmType} onChange={handleChange} className="input">
                    {['Own','Leased','Shared'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Loan Details */}
          {step === 2 && (
            <div className="card space-y-5">
              <h2 className="font-bold text-gray-900 text-lg">💰 Loan Details</h2>
              <div>
                <label className="label">Loan Scheme *</label>
                <div className="grid gap-3 mt-1">
                  {LOAN_TYPES.map(lt => (
                    <button
                      key={lt.id}
                      onClick={() => setForm(f => ({ ...f, loanType: lt.id }))}
                      className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        form.loanType === lt.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${form.loanType === lt.id ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`} />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{lt.label}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{lt.desc}</p>
                        <div className="flex gap-3 mt-1 text-xs">
                          <span className="text-primary-600 font-medium">Rate: {lt.rate}</span>
                          <span className="text-gray-400">Max: {lt.max}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Loan Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input name="loanAmount" value={form.loanAmount} onChange={handleChange} type="number" min="1000" className="input pl-8" placeholder="50000" />
                  </div>
                </div>
                <div>
                  <label className="label">Repayment Period</label>
                  <select name="repaymentPeriod" value={form.repaymentPeriod} onChange={handleChange} className="input">
                    {['6','12','18','24','36','48','60'].map(m => <option key={m} value={m}>{m} months</option>)}
                  </select>
                </div>
              </div>
              {form.loanAmount && (
                <div className="bg-primary-50 rounded-2xl p-4">
                  <p className="text-sm text-primary-700 font-medium">💡 Estimated Monthly EMI</p>
                  <p className="text-3xl font-black text-primary-700 mt-1">₹{monthlyEmi().toLocaleString('en-IN')}</p>
                  <p className="text-xs text-primary-500">at {selected?.rate} per annum for {form.repaymentPeriod} months</p>
                </div>
              )}
              <div>
                <label className="label">Purpose of Loan *</label>
                <textarea name="purpose" value={form.purpose} onChange={handleChange} rows={3} placeholder="e.g. Purchase of seeds and fertilizers for Kharif season, drip irrigation setup..." className="input resize-none" />
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="card space-y-5">
              <h2 className="font-bold text-gray-900 text-lg">📄 Upload Documents</h2>
              {[
                { key: 'pan', label: 'PAN Card', state: panFile, setState: setPanFile, desc: 'Upload PAN card image/PDF (required for loans above ₹50,000)' },
                { key: 'bank', label: 'Bank Statement', state: bankFile, setState: setBankFile, desc: 'Last 3-6 months bank statement (PDF/image)' },
              ].map(doc => (
                <div key={doc.key} className="border-2 border-dashed border-gray-200 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.state ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {doc.state ? <CheckCircle size={20} className="text-green-600" /> : <Upload size={20} className="text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{doc.label}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{doc.desc}</p>
                      {doc.state && <p className="text-green-600 text-xs mt-1 font-medium">✓ {doc.state.name}</p>}
                    </div>
                    <label className="btn-secondary text-sm py-2 cursor-pointer">
                      {doc.state ? 'Change' : 'Upload'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => doc.setState(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              ))}
              <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-700">
                <p className="font-semibold mb-1">📋 Documents Required</p>
                <ul className="space-y-0.5 text-xs">
                  <li>• Aadhar Card (original + copy)</li>
                  <li>• PAN Card</li>
                  <li>• Land ownership / lease documents</li>
                  <li>• Latest 3-month bank statement</li>
                  <li>• Passport size photograph</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="card space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">✅ Review Application</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Applicant', value: form.fullName },
                  { label: 'Phone', value: form.phone },
                  { label: 'Aadhar', value: form.aadhar },
                  { label: 'Location', value: `${form.city}, ${form.state}` },
                  { label: 'Land Area', value: `${form.landArea} ${form.landUnit}` },
                  { label: 'Loan Scheme', value: selected?.label },
                  { label: 'Amount', value: `₹${parseInt(form.loanAmount || 0).toLocaleString('en-IN')}` },
                  { label: 'Tenure', value: form.repaymentPeriod + ' months' },
                  { label: 'Est. EMI', value: `₹${monthlyEmi().toLocaleString('en-IN')}/month` },
                  { label: 'Interest Rate', value: selected?.rate },
                ].map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs">{r.label}</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{r.value || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 text-xs">Purpose</p>
                <p className="text-gray-800 text-sm mt-0.5">{form.purpose || '—'}</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} className="mt-1 w-4 h-4 rounded accent-primary-600" />
                <span className="text-gray-600 text-sm leading-relaxed">
                  I confirm all information is accurate. I agree to the terms and authorize verification of documents. The interest rate shown is indicative at <strong>{selected?.rate}</strong> per annum.
                </span>
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary flex items-center gap-2">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !form.agree} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle size={16} /> Submit Application</>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
