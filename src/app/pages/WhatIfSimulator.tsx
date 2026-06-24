// What-If Simulator — lets users tweak sliders (age, BMI, smoking, coverage, etc.)
// and see how the estimated premium changes in real time.
// AI can explain the impact of each change when prompted.

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal, RotateCcw, Save, Zap, TrendingDown, Info,
  Sparkles, Loader2, ChevronDown, AlertCircle, CheckCircle2,
  IndianRupee, Shield, TrendingUp, Activity, Download
} from 'lucide-react';
import { supabase } from '../../lib/api/supabaseClient';

/* ── Types ── */
type SavedPlan = {
  id: string;
  name: string;
  insurer: string;
  insurance_type: string;
  premium: string;
  yearly_premium?: string;
  features: string[];
  risk_score?: number;
  match_score?: number;
  key_benefit?: string;
  best_for?: string;
  created_at: string;
};

type SimResult = {
  estimatedPremium: string;
  premiumRange: string;
  riskScore: number;
  riskLevel: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  multiplier: string;
  costDrivers: { name: string; impact: number; type: 'positive' | 'negative' | 'neutral'; explanation: string }[];
  scenarioAnalysis: string;
  whatChanged: string;
  recommendations: { title: string; saving: string; description: string; actionable: string }[];
  savingTip: string;
  riskWarnings: string[];
  bestCase: string;
  worstCase: string;
  taxBenefit: string;
  fiveYearCost: string;
  comparedToCurrent: string;
};

type FormState = {
  planId: string;
  age: number;
  gender: string;
  city: string;
  cityType: string;
  annualIncome: number;
  coverageAmount: number;
  policyTerm: number;
  smoker: boolean;
  alcohol: string;
  bmi: string;
  preExisting: boolean;
  diseases: string[];
  familyHistory: string;
  activityLevel: string;
  occupation: string;
  claimsHistory: string;
  paymentFrequency: string;
  addOns: string[];
  // Vehicle specific
  vehicleAge: number;
  vehicleValue: number;
  parkingType: string;
  // Home specific
  propertyAge: number;
  propertyValue: number;
  floodZone: string;
  // Life specific
  dependants: number;
  outstandingLoans: string;
  // Travel specific
  destination: string;
  travelDays: number;
};

const defaultForm: FormState = {
  planId: '', age: 30, gender: 'male', city: '', cityType: 'metro',
  annualIncome: 600000, coverageAmount: 5, policyTerm: 10,
  smoker: false, alcohol: 'never', bmi: 'normal', preExisting: false,
  diseases: [], familyHistory: 'none', activityLevel: 'moderate',
  occupation: 'salaried', claimsHistory: 'none', paymentFrequency: 'annual',
  addOns: [], vehicleAge: 0, vehicleValue: 600000, parkingType: 'garage',
  propertyAge: 0, propertyValue: 3000000, floodZone: 'no',
  dependants: 2, outstandingLoans: 'none', destination: 'domestic', travelDays: 7,
};

const formatPremium = (val: string) =>
  (val || '—').replace(/^Rs\.?\s*/i, '₹').replace(/^INR\s*/i, '₹');

const typeColors: Record<string, string> = {
  health: 'bg-blue-50 text-blue-700', life: 'bg-purple-50 text-purple-700',
  vehicle: 'bg-orange-50 text-orange-700', travel: 'bg-cyan-50 text-cyan-700',
  home: 'bg-green-50 text-green-700', business: 'bg-rose-50 text-rose-700',
  accident: 'bg-red-50 text-red-700', critical: 'bg-pink-50 text-pink-700',
  education: 'bg-indigo-50 text-indigo-700', crop: 'bg-lime-50 text-lime-700',
  gadget: 'bg-yellow-50 text-yellow-700', pet: 'bg-teal-50 text-teal-700',
};

const addOnsByType: Record<string, string[]> = {
  health: ['Critical Illness Cover', 'Personal Accident', 'Room Rent Waiver', 'Maternity Cover', 'OPD Cover'],
  life: ['Accidental Death Benefit', 'Waiver of Premium', 'Terminal Illness Rider', 'Critical Illness Rider'],
  vehicle: ['Zero Depreciation', 'Roadside Assistance', 'Engine Protection', 'Return to Invoice', 'Consumables Cover'],
  travel: ['Trip Cancellation', 'Baggage Loss', 'Adventure Sports Cover', 'Emergency Medical Evacuation'],
  home: ['Earthquake Cover', 'Flood Protection', 'Theft Cover', 'Temporary Living Expenses'],
  business: ['Business Interruption', 'Cyber Risk Cover', 'Professional Indemnity', 'Employee Liability'],
  accident: ['Hospital Cash Benefit', 'Fracture Cover', 'Permanent Disability Cover'],
  critical: ['Second Medical Opinion', 'Home Care Treatment', 'Wellness Benefits'],
  education: ['Waiver of Fee on Death', 'Disability Benefit'],
  crop: ['Flood & Drought Cover', 'Pest & Disease Cover', 'Post-Harvest Loss'],
  gadget: ['Accidental Damage', 'Liquid Damage', 'Theft Cover', 'Extended Warranty'],
  pet: ['Emergency Vet Cover', 'Dental Treatment', 'Alternative Therapy'],
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

/* ── Groq AI simulation ── */
async function runAISimulation(form: FormState, plan: SavedPlan): Promise<SimResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set');

  const insuranceType = plan.insurance_type;
  const currentPremium = parseInt((plan.premium || '0').replace(/[^0-9]/g, '')) || 0;

  const lines: string[] = [
    'You are PolicyWise AI, an expert Indian insurance actuary.',
    'Run a detailed what-if simulation for this insurance scenario and give a comprehensive analysis.',
    '',
    'BASE POLICY (from user saved plans):',
    'Policy Name: ' + plan.name,
    'Insurer: ' + plan.insurer,
    'Insurance Type: ' + insuranceType.toUpperCase(),
    'Current Annual Premium: Rs ' + currentPremium,
    'Current Risk Score: ' + (plan.risk_score ?? 'unknown') + '/100',
    'Current Match Score: ' + (plan.match_score ?? 'unknown') + '%',
    'Key Benefit: ' + (plan.key_benefit || 'N/A'),
    '',
    'SIMULATION PARAMETERS (what the user wants to test):',
    'Age: ' + form.age,
    'Gender: ' + form.gender,
    'City Type: ' + form.cityType + (form.city ? ' (' + form.city + ')' : ''),
    'Annual Income: Rs ' + form.annualIncome,
    'Desired Coverage: Rs ' + form.coverageAmount + ' Lakhs',
    'Policy Term: ' + form.policyTerm + ' years',
    'Payment Frequency: ' + form.paymentFrequency,
    '',
    'HEALTH & LIFESTYLE:',
    'Smoker: ' + (form.smoker ? 'Yes' : 'No'),
    'Alcohol: ' + form.alcohol,
    'BMI Category: ' + form.bmi,
    'Physical Activity: ' + form.activityLevel,
    'Occupation: ' + form.occupation,
    'Pre-existing Conditions: ' + (form.preExisting ? form.diseases.join(', ') || 'Yes (unspecified)' : 'None'),
    'Family Medical History: ' + form.familyHistory,
    'Claims History: ' + form.claimsHistory,
  ];

  if (insuranceType === 'vehicle') {
    lines.push('Vehicle Age: ' + form.vehicleAge + ' years');
    lines.push('Vehicle Value: Rs ' + form.vehicleValue);
    lines.push('Parking: ' + form.parkingType);
  }
  if (insuranceType === 'home') {
    lines.push('Property Age: ' + form.propertyAge + ' years');
    lines.push('Property Value: Rs ' + form.propertyValue);
    lines.push('Flood Zone: ' + form.floodZone);
  }
  if (insuranceType === 'life') {
    lines.push('Financial Dependants: ' + form.dependants);
    lines.push('Outstanding Loans: ' + form.outstandingLoans);
  }
  if (insuranceType === 'travel') {
    lines.push('Destination: ' + form.destination);
    lines.push('Trip Duration: ' + form.travelDays + ' days');
  }

  if (form.addOns.length > 0) {
    lines.push('Selected Add-ons: ' + form.addOns.join(', '));
  }

  lines.push('');
  lines.push('Current plan premium (before simulation): Rs ' + currentPremium);
  lines.push('');
  lines.push('TASK: Simulate what the premium would be with these parameters applied to ' + plan.name + '.');
  lines.push('Use real Indian insurance actuarial logic. Be specific with numbers. Compare against the current premium of Rs ' + currentPremium + '.');
  lines.push('');
  lines.push('Respond ONLY with valid JSON, no markdown, no backticks:');
  lines.push('{');
  lines.push('  "estimatedPremium": "₹XX,XXX (realistic amount for this specific policy and parameters)",');
  lines.push('  "premiumRange": "₹XX,XXX – ₹XX,XXX",');
  lines.push('  "riskScore": 72,');
  lines.push('  "riskLevel": "Low or Moderate or High or Very Low or Very High",');
  lines.push('  "multiplier": "1.2x (how much higher/lower vs base rate)",');
  lines.push('  "scenarioAnalysis": "3-4 sentences: what this simulation reveals about premium vs current, key factors, what changed",');
  lines.push('  "whatChanged": "Compared to current plan premium of Rs ' + currentPremium + ', explain the difference and why",');
  lines.push('  "comparedToCurrent": "e.g. Rs 2,500 higher than current / Rs 1,800 lower than current",');
  lines.push('  "costDrivers": [');
  lines.push('    { "name": "Factor name", "impact": 25, "type": "negative or positive or neutral", "explanation": "Why this factor raises/lowers premium" }');
  lines.push('  ],');
  lines.push('  "recommendations": [');
  lines.push('    { "title": "Actionable title", "saving": "e.g. Save ₹2,400/yr", "description": "What to do", "actionable": "Specific step to take" }');
  lines.push('  ],');
  lines.push('  "riskWarnings": ["Warning specific to their profile", "Warning 2"],');
  lines.push('  "savingTip": "Specific money-saving tip for this exact scenario",');
  lines.push('  "bestCase": "Best case premium if they improve key factors",');
  lines.push('  "worstCase": "Worst case if situation worsens",');
  lines.push('  "taxBenefit": "Tax deduction available under Section 80D/80C for this insurance type and their income",');
  lines.push('  "fiveYearCost": "Total 5-year cost estimate including expected renewals"');
  lines.push('}');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: 'You are PolicyWise AI, an expert Indian insurance actuary. Always respond with valid JSON only. No text outside JSON.' },
        { role: 'user', content: lines.join('\n') },
      ],
    }),
  });

  if (!response.ok) throw new Error('API error ' + response.status);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

/* ── Slider component ── */
const SliderInput = ({ label, value, min, max, step = 1, unit = '', color = 'blue', onChange }: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; color?: string; onChange: (v: number) => void;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <span className="text-sm font-bold text-[#1E64FF]">{unit === '₹' ? `₹${value.toLocaleString('en-IN')}` : `${value}${unit}`}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#1E64FF]" />
    <div className="flex justify-between text-xs text-slate-400">
      <span>{unit === '₹' ? `₹${min.toLocaleString('en-IN')}` : `${min}${unit}`}</span>
      <span>{unit === '₹' ? `₹${max.toLocaleString('en-IN')}` : `${max}${unit}`}</span>
    </div>
  </div>
);

/* ── Toggle ── */
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-[#1E64FF]' : 'bg-slate-200'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

/* ── Select ── */
const Sel = ({ value, onChange, children, className = '' }: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className={`w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1E64FF] outline-none ${className}`}>
    {children}
  </select>
);

/* ── Main Component ── */
export const WhatIfSimulator = () => {
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'age' | 'coverage'>('age');

  const set = (key: keyof FormState) => (val: any) => setForm(prev => ({ ...prev, [key]: val }));

  /* ── Load saved plans ── */
  useEffect(() => {
    const load = async () => {
      setPlansLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPlansLoading(false); return; }
      const { data, error } = await supabase
        .from('saved_plans').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setSavedPlans(data);
      setPlansLoading(false);
    };
    load();
  }, []);

  const selectedPlan = savedPlans.find(p => p.id === form.planId) || null;
  const insuranceType = selectedPlan?.insurance_type || '';
  const availableAddOns = addOnsByType[insuranceType] || [];
  const diseases = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Ailment', 'Kidney Disease'];

  const handleRun = async () => {
    if (!selectedPlan) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await runAISimulation(form, selectedPlan);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => { setForm(defaultForm); setResult(null); setError(null); };

  const toggleAddon = (addon: string) => {
    setForm(prev => ({
      ...prev,
      addOns: prev.addOns.includes(addon) ? prev.addOns.filter(a => a !== addon) : [...prev.addOns, addon],
    }));
  };

  const toggleDisease = (d: string) => {
    setForm(prev => ({
      ...prev,
      diseases: prev.diseases.includes(d) ? prev.diseases.filter(x => x !== d) : [...prev.diseases, d],
    }));
  };

  const riskBarColor = (level: string) =>
    level === 'Very Low' || level === 'Low' ? 'bg-green-500' :
    level === 'Moderate' ? 'bg-amber-500' : 'bg-red-500';

  const riskBadgeColor = (level: string) =>
    level === 'Very Low' || level === 'Low' ? 'bg-green-50 text-green-700 border-green-200' :
    level === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-red-50 text-red-700 border-red-200';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <span>Home</span> / <span className="text-slate-700">What-if Simulator</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">What-if Simulator</h1>
          <p className="text-slate-500 mt-1">Test scenarios on your saved plans and see AI-powered premium predictions.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 text-sm">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          {result && (
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1E64FF] text-white rounded-xl font-medium hover:bg-blue-700 text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Inputs ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Plan Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3 text-sm">Select Your Saved Plan</h3>
            {plansLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : savedPlans.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-sm">
                No saved plans yet. Get a recommendation first.
              </div>
            ) : (
              <Sel value={form.planId} onChange={val => { set('planId')(val); setResult(null); }}>
                <option value="">— Choose a plan —</option>
                {savedPlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.insurance_type}) · {formatPremium(p.premium)}/yr
                  </option>
                ))}
              </Sel>
            )}

            {selectedPlan && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedPlan.name}</p>
                    <p className="text-xs text-slate-500">{selectedPlan.insurer}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${typeColors[selectedPlan.insurance_type] || 'bg-slate-100 text-slate-600'}`}>
                    {selectedPlan.insurance_type}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="bg-white rounded-lg p-2 border border-slate-100">
                    <p className="text-slate-400">Premium</p>
                    <p className="font-bold text-slate-800">{formatPremium(selectedPlan.premium)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-100">
                    <p className="text-slate-400">Risk</p>
                    <p className="font-bold text-slate-800">{selectedPlan.risk_score ?? 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-100">
                    <p className="text-slate-400">Match</p>
                    <p className="font-bold text-slate-800">{selectedPlan.match_score ?? 'N/A'}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personal Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Personal Profile</h3>

            <SliderInput label="Age" value={form.age} min={18} max={75} unit=" yrs" onChange={set('age')} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                <Sel value={form.gender} onChange={set('gender')}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Sel>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City Type</label>
                <Sel value={form.cityType} onChange={set('cityType')}>
                  <option value="metro">Metro</option>
                  <option value="tier2">Tier 2</option>
                  <option value="rural">Rural</option>
                </Sel>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City / Town</label>
              <input type="text" value={form.city} onChange={e => set('city')(e.target.value)}
                placeholder="e.g. Mumbai, Pune"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Occupation</label>
              <Sel value={form.occupation} onChange={set('occupation')}>
                <option value="salaried">Salaried (Private)</option>
                <option value="govt">Government Employee</option>
                <option value="selfemployed">Self-Employed</option>
                <option value="business">Business Owner</option>
                <option value="freelancer">Freelancer</option>
                <option value="homemaker">Homemaker</option>
                <option value="student">Student</option>
              </Sel>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Annual Income (₹)</label>
              <input type="number" value={form.annualIncome} onChange={e => set('annualIncome')(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none"
                placeholder="e.g. 600000" />
            </div>
          </div>

          {/* Coverage Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Coverage Settings</h3>
            <SliderInput label="Coverage Amount" value={form.coverageAmount} min={1} max={100} unit=" L" onChange={set('coverageAmount')} />
            <SliderInput label="Policy Term" value={form.policyTerm} min={1} max={30} unit=" yrs" onChange={set('policyTerm')} />
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Payment Frequency</label>
              <Sel value={form.paymentFrequency} onChange={set('paymentFrequency')}>
                <option value="annual">Annual (best rates)</option>
                <option value="halfyearly">Half-Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly (+3-5% loading)</option>
              </Sel>
            </div>
          </div>

          {/* Health & Lifestyle */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Health & Lifestyle</h3>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Smoker / Tobacco user</p>
                <p className="text-xs text-slate-400">Adds 20-40% premium loading</p>
              </div>
              <Toggle checked={form.smoker} onChange={set('smoker')} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Alcohol Consumption</label>
              <Sel value={form.alcohol} onChange={set('alcohol')}>
                <option value="never">Never</option>
                <option value="occasional">Occasional (social)</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy / Daily</option>
              </Sel>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">BMI Category</label>
              <Sel value={form.bmi} onChange={set('bmi')}>
                <option value="underweight">Underweight (below 18.5)</option>
                <option value="normal">Normal (18.5–24.9) ✅</option>
                <option value="overweight">Overweight (25–29.9)</option>
                <option value="obese">Obese (30+)</option>
              </Sel>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Physical Activity</label>
              <Sel value={form.activityLevel} onChange={set('activityLevel')}>
                <option value="sedentary">Sedentary (desk job, no exercise)</option>
                <option value="light">Light (walk 30 min/day)</option>
                <option value="moderate">Moderate (gym 3x/week)</option>
                <option value="active">Very Active (daily intense workout)</option>
              </Sel>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Family Medical History</label>
              <Sel value={form.familyHistory} onChange={set('familyHistory')}>
                <option value="none">No major illness in family</option>
                <option value="diabetes">Diabetes in family</option>
                <option value="heart">Heart disease in family</option>
                <option value="cancer">Cancer in family</option>
                <option value="multiple">Multiple conditions</option>
              </Sel>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Claims History</label>
              <Sel value={form.claimsHistory} onChange={set('claimsHistory')}>
                <option value="none">No claims (get NCB discount)</option>
                <option value="one">1 claim in last 3 years</option>
                <option value="multiple">2+ claims in last 3 years</option>
              </Sel>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-800">Pre-existing Conditions?</p>
                <Toggle checked={form.preExisting} onChange={set('preExisting')} />
              </div>
              {form.preExisting && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {diseases.map(d => (
                    <label key={d} className={`flex items-center gap-2 text-xs p-2 rounded-lg cursor-pointer border transition-colors ${form.diseases.includes(d) ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={form.diseases.includes(d)} onChange={() => toggleDisease(d)} className="hidden" />
                      {form.diseases.includes(d) ? '✓' : '+'} {d}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Insurance-type specific fields */}
          {insuranceType === 'vehicle' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">🚗 Vehicle Details</h3>
              <SliderInput label="Vehicle Age" value={form.vehicleAge} min={0} max={20} unit=" yrs" onChange={set('vehicleAge')} />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle Value (₹)</label>
                <input type="number" value={form.vehicleValue} onChange={e => set('vehicleValue')(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" placeholder="e.g. 800000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Parking</label>
                <Sel value={form.parkingType} onChange={set('parkingType')}>
                  <option value="garage">Covered Garage ✅</option>
                  <option value="society">Society Parking</option>
                  <option value="roadside">Open / Roadside</option>
                </Sel>
              </div>
            </div>
          )}

          {insuranceType === 'home' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">🏠 Property Details</h3>
              <SliderInput label="Property Age" value={form.propertyAge} min={0} max={50} unit=" yrs" onChange={set('propertyAge')} />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Property Value (₹)</label>
                <input type="number" value={form.propertyValue} onChange={e => set('propertyValue')(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E64FF] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Flood Zone</label>
                <Sel value={form.floodZone} onChange={set('floodZone')}>
                  <option value="no">No ✅</option>
                  <option value="partial">Partially prone</option>
                  <option value="yes">Yes ⚠️</option>
                </Sel>
              </div>
            </div>
          )}

          {insuranceType === 'life' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">👨‍👩‍👧 Life Insurance Details</h3>
              <SliderInput label="Number of Dependants" value={form.dependants} min={0} max={8} unit="" onChange={set('dependants')} />
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Outstanding Loans</label>
                <Sel value={form.outstandingLoans} onChange={set('outstandingLoans')}>
                  <option value="none">No loans</option>
                  <option value="home">Home loan</option>
                  <option value="car">Car / Vehicle loan</option>
                  <option value="multiple">Multiple loans</option>
                </Sel>
              </div>
            </div>
          )}

          {insuranceType === 'travel' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">✈️ Travel Details</h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Destination</label>
                <Sel value={form.destination} onChange={set('destination')}>
                  <option value="domestic">Within India</option>
                  <option value="asia">Asia (Thailand, UAE, Singapore)</option>
                  <option value="international">International</option>
                  <option value="schengen">Schengen / Europe</option>
                  <option value="usa">USA / Canada</option>
                </Sel>
              </div>
              <SliderInput label="Trip Duration" value={form.travelDays} min={1} max={90} unit=" days" onChange={set('travelDays')} />
            </div>
          )}

          {/* Add-ons */}
          {selectedPlan && availableAddOns.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Add-on Riders</h3>
              <div className="space-y-2">
                {availableAddOns.map(addon => (
                  <label key={addon} className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition-colors ${form.addOns.includes(addon) ? 'border-[#1E64FF] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="text-sm text-slate-700">{addon}</span>
                    <input type="checkbox" checked={form.addOns.includes(addon)} onChange={() => toggleAddon(addon)}
                      className="w-4 h-4 accent-[#1E64FF]" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Run Button */}
          <button onClick={handleRun} disabled={!selectedPlan || running}
            className="w-full py-3.5 bg-[#1E64FF] text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/20">
            {running
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulating with AI…</>
              : <><Sparkles className="w-4 h-4" /> Run AI Simulation</>
            }
          </button>
        </div>

        {/* ── Right: Results ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Empty state */}
          {!result && !running && !error && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center min-h-96 p-12 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <SlidersHorizontal className="w-8 h-8 text-[#1E64FF]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Simulate</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                {savedPlans.length === 0
                  ? 'Save a plan from your recommendations first, then run a simulation.'
                  : 'Select a saved plan, adjust parameters on the left, and click Run AI Simulation.'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700">Simulation failed</p>
                <p className="text-sm text-red-500">{error}</p>
                <button onClick={handleRun} className="mt-3 text-sm bg-red-100 text-red-700 px-4 py-1.5 rounded-lg hover:bg-red-200">
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {running && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-16 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-48 w-full" />
              <div className="text-center text-slate-400 text-sm flex items-center justify-center gap-2 pt-2">
                <Sparkles className="w-4 h-4 animate-pulse text-[#1E64FF]" />
                AI is running your scenario…
              </div>
            </div>
          )}

          {/* Results */}
          {result && !running && selectedPlan && (
            <div className="space-y-5">

              {/* Main premium result */}
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Simulated Annual Premium</p>
                    <p className="text-4xl font-bold text-slate-900">{result.estimatedPremium}</p>
                    <p className="text-sm text-slate-400 mt-1">Range: {result.premiumRange}</p>
                    <p className={`text-sm font-medium mt-2 ${result.comparedToCurrent?.includes('higher') ? 'text-red-600' : 'text-green-600'}`}>
                      {result.comparedToCurrent}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full border ${riskBadgeColor(result.riskLevel)}`}>
                      {result.riskLevel} Risk
                    </span>
                    <div>
                      <p className="text-xs text-slate-400">Risk Score</p>
                      <p className="text-2xl font-bold text-slate-900">{result.riskScore}<span className="text-slate-400 text-sm">/100</span></p>
                    </div>
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${riskBarColor(result.riskLevel)}`} style={{ width: result.riskScore + '%' }} />
                    </div>
                  </div>
                </div>

                {/* Trend mini chart */}
                <div className="mt-6 pt-4 border-t border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">Trend Analysis</p>
                    <div className="flex gap-1">
                      {(['age', 'coverage'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors capitalize ${activeTab === tab ? 'bg-[#1E64FF] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          vs {tab === 'age' ? 'Age' : 'Coverage'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-32 flex items-end gap-1">
                    {activeTab === 'age'
                      ? [30, 38, 46, 56, 68, 82, 100].map((h, i) => (
                          <div key={i} className={`flex-1 rounded-t transition-all ${i === 3 ? 'bg-[#1E64FF]' : 'bg-blue-200'}`}
                            style={{ height: h + '%' }} title={`Age ${18 + i * 8}`} />
                        ))
                      : [20, 32, 44, 58, 72, 88, 100].map((h, i) => (
                          <div key={i} className={`flex-1 rounded-t transition-all ${i === 3 ? 'bg-[#1E64FF]' : 'bg-teal-200'}`}
                            style={{ height: h + '%' }} title={`${(i + 1) * 10}L`} />
                        ))
                    }
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{activeTab === 'age' ? '18y' : '5L'}</span>
                    <span className="text-[#1E64FF] font-medium">Current</span>
                    <span>{activeTab === 'age' ? '70y' : '70L'}</span>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: '5-Year Total Cost', value: result.fiveYearCost, icon: IndianRupee, color: 'bg-slate-50 border-slate-200' },
                  { label: 'Best Case Premium', value: result.bestCase, icon: TrendingDown, color: 'bg-green-50 border-green-100' },
                  { label: 'Worst Case Premium', value: result.worstCase, icon: TrendingUp, color: 'bg-red-50 border-red-100' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className={`rounded-2xl border p-4 ${color}`}>
                    <Icon className="w-4 h-4 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="font-bold text-slate-900 text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Scenario analysis */}
              <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                  <h3 className="font-bold">AI Scenario Analysis</h3>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed mb-3">{result.scenarioAnalysis}</p>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-blue-200 text-xs font-bold uppercase tracking-wide mb-1">vs Your Current Plan</p>
                  <p className="text-white text-sm">{result.whatChanged}</p>
                </div>
              </div>

              {/* Cost Drivers */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Key Cost Drivers
                </h3>
                <div className="space-y-4">
                  {result.costDrivers.map((driver, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{driver.name}</p>
                          <p className="text-xs text-slate-400">{driver.explanation}</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ml-4 ${driver.type === 'positive' ? 'text-green-600' : driver.type === 'negative' ? 'text-red-500' : 'text-slate-500'}`}>
                          {driver.type === 'negative' ? '+' : driver.type === 'positive' ? '-' : ''}{Math.abs(driver.impact)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${driver.type === 'positive' ? 'bg-green-400' : driver.type === 'negative' ? 'bg-red-400' : 'bg-slate-300'}`}
                          style={{ width: `${Math.min(100, Math.abs(driver.impact) * 2)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Warnings */}
              {result.riskWarnings?.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                  <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" /> Risk Warnings for Your Profile
                  </h3>
                  <ul className="space-y-2">
                    {result.riskWarnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 text-sm">💡 How to Reduce Your Premium</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-slate-900 text-sm">{rec.title}</p>
                        <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full shrink-0 ml-2 font-medium">{rec.saving}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{rec.description}</p>
                      <p className="text-xs text-[#1E64FF] font-medium">→ {rec.actionable}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Saving Tip
                  </p>
                  <p className="text-green-800 text-sm leading-relaxed">{result.savingTip}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-indigo-800 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tax Benefit
                  </p>
                  <p className="text-indigo-800 text-sm leading-relaxed">{result.taxBenefit}</p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};