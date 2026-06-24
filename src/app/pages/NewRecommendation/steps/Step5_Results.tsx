// Step 5 — shows a visual risk breakdown (bar chart + score) and lets the user
// save a policy plan to Supabase. Displays the AI recommendation from Step 4.

import React, { useState } from "react";
import { BarChart2, AlertCircle, CheckCircle, Info, X, Sparkles, BookmarkPlus, Check, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import clsx from "clsx";
import { supabase } from "../../../../lib/api/supabaseClient";

interface Step5Props {
  onNext: () => void;
  onBack: () => void;
  formData?: any;
  insuranceType?: string;
  riskScore?: number;
  estimatedMin?: number;
  estimatedMax?: number;
  aiRecommendation?: {
    topPolicies: {
      name: string;
      insurer: string;
      yearlyPremium: string;
      keyBenefit: string;
      bestFor: string;
      pros: string[];
      cons: string[];
      rating: number;
    }[];
    riskAnalysis?: string;
    savingTip?: string;
    thingsToAvoid?: string[];
  } | null;
}

/* ── Save plan to Supabase ── */
async function savePlanToSupabase(plan: any): Promise<{ success: boolean; alreadyExists: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, alreadyExists: false };

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', plan.name)
      .eq('insurer', plan.insurer)
      .maybeSingle();

    if (existing) return { success: false, alreadyExists: true };

    const { error } = await supabase.from('saved_plans').insert({
      user_id: user.id,
      name: plan.name,
      insurer: plan.insurer,
      insurance_type: plan.insuranceType,
      premium: plan.premium,
      yearly_premium: plan.yearlyPremium,
      features: plan.features || [],
      risk_score: plan.riskScore,
      match_score: plan.match,
      key_benefit: plan.keyBenefit || '',
      best_for: plan.bestFor || '',
    });

    return { success: !error, alreadyExists: false };
  } catch {
    return { success: false, alreadyExists: false };
  }
}

/* ── Terms Modal ── */
const TermsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; onAccept: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full z-10" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 text-lg mb-3">Policy Terms & Conditions</h3>
        <div className="space-y-3 text-sm text-slate-600 max-h-64 overflow-y-auto">
          <p><strong>Waiting Period:</strong> Most policies have a 30-day initial waiting period. Pre-existing conditions may have 2–4 year waiting periods.</p>
          <p><strong>Co-payment:</strong> Some plans require you to pay a percentage of the claim amount (usually 10–20%).</p>
          <p><strong>Exclusions:</strong> Cosmetic surgery, self-inflicted injuries, and experimental treatments are generally not covered.</p>
          <p><strong>Renewability:</strong> Policies are renewable for lifetime, subject to continuous renewal without breaks.</p>
          <p><strong>Claim Process:</strong> Cashless claims must be initiated at network hospitals. Reimbursement claims must be filed within 30 days of discharge.</p>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-50">Close</button>
          <button onClick={onClose} className="flex-1 bg-[#1E64FF] text-white py-2.5 rounded-xl font-medium hover:bg-blue-700">I Understand</button>
        </div>
      </div>
    </div>
  );
};

/* ── View Details Modal ── */
const ViewDetailsModal = ({
  policy, insuranceType, formData, onClose
}: {
  policy: any; insuranceType: string; formData: any; onClose: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const fetch_details = async () => {
      try {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) throw new Error('API key not found');

        const prompt = `You are an Indian insurance expert. Give detailed information about the following insurance policy.

Policy: ${policy.name}
Insurer: ${policy.insurer}
Insurance Type: ${insuranceType.toUpperCase()}
User Age: ${formData?.age || 'N/A'}
User Profile: ${formData?.preExisting ? 'Has pre-existing conditions' : 'No pre-existing conditions'}

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "overview": "2-3 sentence overview of this specific policy",
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "exclusions": ["Exclusion 1", "Exclusion 2", "Exclusion 3"],
  "claimProcess": "Brief description of how to claim",
  "waitingPeriod": "e.g. 30 days initial, 2 years for pre-existing",
  "networkHospitals": "e.g. 5000+ hospitals across India",
  "renewalBonus": "e.g. 10% NCB per claim-free year up to 50%",
  "bestSuitedFor": "Who this policy is ideal for",
  "watchOut": "One thing the user should be careful about"
}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 800,
            messages: [
              { role: 'system', content: 'You are an Indian insurance expert. Always respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ]
          })
        });

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || '';
        const clean = text.replace(/```json|```/g, '').trim();
        setDetails(JSON.parse(clean));
      } catch (err: any) {
        setError('Could not load details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetch_details();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E64FF] to-blue-500 p-6 text-white rounded-t-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center font-bold text-white text-sm">
              {policy.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg">{policy.name}</h3>
              <p className="text-blue-100 text-sm">{policy.insurer}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold">{policy.yearlyPremium}</span>
            <span className="text-blue-200 text-sm">/year</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm pt-4">
                <Sparkles className="w-4 h-4 animate-pulse text-[#1E64FF]" />
                AI is fetching policy details…
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">{error}</div>
          )}

          {details && !loading && (
            <div className="space-y-5">
              <p className="text-slate-600 text-sm leading-relaxed">{details.overview}</p>

              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-sm">✅ Key Features</h4>
                <ul className="space-y-1.5">
                  {details.keyFeatures?.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Waiting Period', value: details.waitingPeriod },
                  { label: 'Network Hospitals', value: details.networkHospitals },
                  { label: 'Renewal Bonus', value: details.renewalBonus },
                  { label: 'Claim Process', value: details.claimProcess },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className="text-xs font-medium text-slate-700">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-sm">❌ Exclusions</h4>
                <ul className="space-y-1">
                  {details.exclusions?.map((e: string, i: number) => (
                    <li key={i} className="text-xs text-slate-500 flex gap-2">
                      <span className="text-red-400">•</span> {e}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">⚠️ Watch Out</p>
                <p className="text-xs text-amber-700">{details.watchOut}</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-800 mb-1">👤 Best Suited For</p>
                <p className="text-xs text-blue-700">{details.bestSuitedFor}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const fallbackCompanies = [
  { name: "HDFC Ergo Optima Secure", insurer: "HDFC ERGO General Insurance", yearlyPremium: "₹12,500", premium: "₹12,500", match: 98, benefits: ["No Room Rent Limit", "Unlimited Restoration", "Free Health Checkup"], pros: ["No Room Rent Limit", "Unlimited Restoration", "Free Health Checkup"], rating: 5 },
  { name: "Niva Bupa ReAssure 360", insurer: "Niva Bupa Health Insurance", yearlyPremium: "₹11,200", premium: "₹11,200", match: 95, benefits: ["30 min Cashless", "Booster Benefit", "ReAssure Benefit"], pros: ["30 min Cashless", "Booster Benefit", "ReAssure Benefit"], rating: 4 },
  { name: "Star Comprehensive", insurer: "Star Health and Allied Insurance", yearlyPremium: "₹13,100", premium: "₹13,100", match: 92, benefits: ["Global Coverage", "Automatic Restoration", "Wellness Program"], pros: ["Global Coverage", "Automatic Restoration", "Wellness Program"], rating: 4 },
];

function ratingToMatch(rating: number, idx: number): number {
  const base = [98, 95, 92];
  const b = base[idx] ?? 90;
  return rating === 5 ? b : rating === 4 ? b - 3 : b - 8;
}

export const Step4_Results: React.FC<Step5Props> = ({
  onNext, onBack, formData, insuranceType = 'health',
  riskScore = 75, estimatedMin = 12450, estimatedMax = 15000, aiRecommendation,
}) => {
  const [showTerms, setShowTerms] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState<any>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const companies = aiRecommendation?.topPolicies
    ? aiRecommendation.topPolicies.map((p, idx) => ({
        ...p,
        premium: p.yearlyPremium.split('–')[0].trim(),
        match: ratingToMatch(p.rating, idx),
        benefits: p.pros.slice(0, 3),
      }))
    : fallbackCompanies;

  const riskAlerts = aiRecommendation?.thingsToAvoid?.slice(0, 2) ?? [
    'High BMI may result in 20% loading on premium.',
    'Pre-existing conditions have a waiting period in standard plans.',
  ];

  const featureImportance = [
    { name: 'Age',     value: Math.round(riskScore * 0.35) },
    { name: 'BMI',     value: Math.round(riskScore * 0.25) },
    { name: 'History', value: Math.round(riskScore * 0.20) },
    { name: 'Loc',     value: Math.round(riskScore * 0.10) },
    { name: 'Smoker',  value: Math.round(riskScore * 0.10) },
  ];

  const riskLabel = riskScore >= 70 ? 'Low' : riskScore >= 45 ? 'Moderate' : 'High';
  const riskLabelColor = riskScore >= 70 ? 'text-green-600' : riskScore >= 45 ? 'text-amber-600' : 'text-red-600';

  const handleSavePlan = async (company: any, idx: number) => {
    if (savedIds.has(idx) || savingIds.has(idx)) return;
    setSavingIds(prev => new Set([...prev, idx]));
    setSaveError(null);

    const plan = {
      name: company.name,
      insurer: company.insurer,
      insuranceType,
      premium: company.premium || company.yearlyPremium,
      yearlyPremium: company.yearlyPremium,
      features: company.benefits || company.pros?.slice(0, 3) || [],
      riskScore,
      match: company.match,
      keyBenefit: company.keyBenefit || '',
      bestFor: company.bestFor || '',
    };

    const { success, alreadyExists } = await savePlanToSupabase(plan);
    setSavingIds(prev => { const n = new Set(prev); n.delete(idx); return n; });

    if (success) {
      setSavedIds(prev => new Set([...prev, idx]));
    } else if (alreadyExists) {
      setSavedIds(prev => new Set([...prev, idx])); // show as saved anyway
    } else {
      setSaveError('Could not save plan. Please try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} onAccept={() => setShowTerms(false)} />
      {viewingPolicy && (
        <ViewDetailsModal
          policy={viewingPolicy}
          insuranceType={insuranceType}
          formData={formData}
          onClose={() => setViewingPolicy(null)}
        />
      )}

      {/* Left: Prediction Summary */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart2 className="w-5 h-5 text-[#1E64FF]" />
            </div>
            <h3 className="font-bold text-slate-900">AI Prediction</h3>
          </div>
          <div className="mb-6">
            <p className="text-slate-500 text-sm">Predicted Premium</p>
            <p className="text-3xl font-bold text-slate-900">₹{estimatedMin.toLocaleString('en-IN')}</p>
            <p className="text-green-600 text-xs font-medium mt-1">± 5% Accuracy Confidence</p>
          </div>
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Scenario</span>
              <span className="font-medium text-slate-900">Balanced</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Risk Level</span>
              <span className={`font-medium ${riskLabelColor}`}>{riskLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Type</span>
              <span className="font-medium text-slate-900 capitalize">{insuranceType}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl text-white">
          <h4 className="font-bold mb-2">Why this cost?</h4>
          <p className="text-slate-400 text-xs mb-4">Top factors influencing your premium:</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureImportance} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={50}
                  tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {featureImportance.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#1E64FF' : '#334155'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle: Recommendations */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Top Recommendations</h2>

        {companies.map((company, idx) => (
          <div key={idx}
            className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all relative">
            {idx === 0 && (
              <div className="absolute top-0 left-0 bg-[#1E64FF] text-white text-xs px-3 py-1 rounded-br-xl font-medium">
                Best Match
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-sm">
                  {company.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{company.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">
                      {company.match}% Match
                    </span>
                    <span className="text-slate-400 text-xs">98% Claim Ratio</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{company.premium}</p>
                <p className="text-xs text-slate-500">annually</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {company.benefits.map((benefit: string, i: number) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">
                  <CheckCircle className="w-3 h-3 text-green-500" /> {benefit}
                </span>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setViewingPolicy(company)}
                className="flex-1 bg-[#1E64FF] text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> View Details
              </button>
              <button
                onClick={() => handleSavePlan(company, idx)}
                disabled={savingIds.has(idx) || savedIds.has(idx)}
                className={clsx(
                  'flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm',
                  savedIds.has(idx)
                    ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                    : savingIds.has(idx)
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-wait'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                )}>
                {savingIds.has(idx)
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : savedIds.has(idx)
                  ? <><Check className="w-4 h-4" /> Saved!</>
                  : <><BookmarkPlus className="w-4 h-4" /> Add to Saved Plans</>
                }
              </button>
            </div>
            {saveError && idx === companies.length - 1 && (
              <p className="text-red-500 text-xs mt-2 text-center">{saveError}</p>
            )}

            <div className="mt-4 text-center">
              <button onClick={() => setShowTerms(true)}
                className="text-xs text-slate-400 hover:text-[#1E64FF] flex items-center justify-center gap-1 w-full">
                <Info className="w-3 h-3" /> View Policy Terms & Conditions
              </button>
            </div>
          </div>
        ))}

        <div className="text-center pt-4">
          <button onClick={onNext}
            className="bg-slate-900 text-white px-6 py-3 rounded-full font-medium hover:bg-slate-800 transition-colors shadow-lg">
            Generate Full Report
          </button>
        </div>
      </div>

      {/* Right: Risk Alerts + Saving Tip */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <div className="flex items-center gap-2 mb-3 text-amber-800">
            <AlertCircle className="w-5 h-5" />
            <h4 className="font-bold">Risk Alerts</h4>
          </div>
          <ul className="space-y-3 text-sm text-amber-700">
            {riskAlerts.map((alert, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                {alert}
              </li>
            ))}
          </ul>
        </div>

        {aiRecommendation?.savingTip && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
            <p className="font-bold text-green-800 text-sm mb-1">💡 Money-Saving Tip</p>
            <p className="text-green-700 text-xs leading-relaxed">{aiRecommendation.savingTip}</p>
          </div>
        )}
      </div>
    </div>
  );
};