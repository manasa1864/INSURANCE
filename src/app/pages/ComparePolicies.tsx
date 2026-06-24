// Compare Policies page — loads the user's saved plans and lets them pick
// 2–3 to compare side-by-side. AI generates a comparison summary via Groq.

import React, { useState, useEffect } from 'react';
import {
  Scale, Download, ArrowRightLeft, Check, X,
  AlertCircle, FileText, Sparkles, RefreshCw,
  TrendingUp, IndianRupee, Shield, Loader2, ChevronDown
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

type AIComparison = {
  scenario: 'same_type' | 'different_type';
  verdict: string;
  winner?: 'A' | 'B' | 'tie';
  winnerReason?: string;
  urgencyRanking?: { type: string; urgency: string; reason: string }[];
  recommendation: string;
  keyDifferences: { feature: string; planA: string; planB: string; better: 'A' | 'B' | 'equal' }[];
  savingTip: string;
  riskInsight: string;
  finalAdvice: string;
};

const formatPremium = (val: string) =>
  (val || '—').replace(/^Rs\.?\s*/i, '₹').replace(/^INR\s*/i, '₹');

const parsePremiumNum = (val: string): number => {
  const cleaned = (val || '0').replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
};

const typeColors: Record<string, string> = {
  health: 'bg-blue-50 text-blue-700', life: 'bg-purple-50 text-purple-700',
  vehicle: 'bg-orange-50 text-orange-700', travel: 'bg-cyan-50 text-cyan-700',
  home: 'bg-green-50 text-green-700', business: 'bg-rose-50 text-rose-700',
  accident: 'bg-red-50 text-red-700', critical: 'bg-pink-50 text-pink-700',
  education: 'bg-indigo-50 text-indigo-700', crop: 'bg-lime-50 text-lime-700',
  gadget: 'bg-yellow-50 text-yellow-700', pet: 'bg-teal-50 text-teal-700',
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

/* ── Groq AI comparison ── */
async function fetchAIComparison(planA: SavedPlan, planB: SavedPlan): Promise<AIComparison> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('API key not found');

  const isSameType = planA.insurance_type === planB.insurance_type;

  const lines: string[] = [
    'You are PolicyWise AI, an expert Indian insurance advisor.',
    'Compare these two insurance policies and give a detailed, actionable recommendation.',
    '',
    'POLICY A:',
    'Name: ' + planA.name,
    'Insurer: ' + planA.insurer,
    'Type: ' + planA.insurance_type,
    'Annual Premium: ' + planA.premium,
    'Risk Score: ' + (planA.risk_score ?? 'N/A') + '/100',
    'Match Score: ' + (planA.match_score ?? 'N/A') + '%',
    'Key Benefit: ' + (planA.key_benefit || 'N/A'),
    'Best For: ' + (planA.best_for || 'N/A'),
    'Features: ' + (planA.features || []).join(', '),
    '',
    'POLICY B:',
    'Name: ' + planB.name,
    'Insurer: ' + planB.insurer,
    'Type: ' + planB.insurance_type,
    'Annual Premium: ' + planB.premium,
    'Risk Score: ' + (planB.risk_score ?? 'N/A') + '/100',
    'Match Score: ' + (planB.match_score ?? 'N/A') + '%',
    'Key Benefit: ' + (planB.key_benefit || 'N/A'),
    'Best For: ' + (planB.best_for || 'N/A'),
    'Features: ' + (planB.features || []).join(', '),
    '',
  ];

  if (isSameType) {
    lines.push('SCENARIO: Same insurance type comparison (' + planA.insurance_type + ')');
    lines.push('Focus on: premium value, features, insurer credibility, risk scores, match scores.');
    lines.push('Declare a clear winner or tie based on overall value for the user.');
  } else {
    lines.push('SCENARIO: Different insurance types comparison (' + planA.insurance_type + ' vs ' + planB.insurance_type + ')');
    lines.push('Focus on: which type is MORE URGENT for the user based on risk scores and insurance type priority.');
    lines.push('Indian insurance priority order (highest to lowest urgency): health > life > critical > accident > vehicle > home > business > travel > education > crop > gadget > pet');
    lines.push('Consider the risk scores — higher risk score means lower risk (better profile). Lower risk score means higher risk (more urgent need).');
  }

  lines.push('');
  lines.push('Respond ONLY with valid JSON, no markdown, no backticks:');
  lines.push('{');
  lines.push('  "scenario": "' + (isSameType ? 'same_type' : 'different_type') + '",');
  lines.push('  "verdict": "1-2 sentence overall verdict on this comparison",');

  if (isSameType) {
    lines.push('  "winner": "A or B or tie",');
    lines.push('  "winnerReason": "Why the winner is better — specific to these policies",');
  } else {
    lines.push('  "urgencyRanking": [');
    lines.push('    { "type": "insurance type name", "urgency": "High/Medium/Low", "reason": "why this urgency level" },');
    lines.push('    { "type": "insurance type name", "urgency": "High/Medium/Low", "reason": "why this urgency level" }');
    lines.push('  ],');
  }

  lines.push('  "recommendation": "Clear actionable recommendation for the user — what should they do right now",');
  lines.push('  "keyDifferences": [');
  lines.push('    { "feature": "Feature name", "planA": "Plan A value", "planB": "Plan B value", "better": "A or B or equal" }');
  lines.push('  ],');
  lines.push('  "savingTip": "Specific money-saving tip related to these policies",');
  lines.push('  "riskInsight": "Insight about the risk scores and what they mean for the user",');
  lines.push('  "finalAdvice": "One sentence final advice"');
  lines.push('}');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: 'You are PolicyWise AI. Respond with valid JSON only. No markdown, no backticks, no text outside JSON.' },
        { role: 'user', content: lines.join('\n') },
      ],
    }),
  });

  if (!response.ok) throw new Error('API error ' + response.status);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

/* ── Plan Selector Component ── */
const PlanSelector = ({
  label, color, plan, plans, loading, onChange,
}: {
  label: string; color: 'blue' | 'teal';
  plan: SavedPlan | null; plans: SavedPlan[];
  loading: boolean; onChange: (p: SavedPlan | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const borderColor = color === 'blue' ? 'border-blue-100 bg-blue-50/50' : 'border-teal-100 bg-teal-50/50';
  const badgeColor = color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700';
  const ringColor = color === 'blue' ? 'focus:ring-blue-400' : 'focus:ring-teal-400';

  return (
    <div className={`p-4 rounded-xl border ${borderColor} space-y-3`}>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
        Policy {label}
      </span>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : plans.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No saved plans yet. <br />
          <span className="text-[#1E64FF] font-medium">Add plans from recommendations first.</span>
        </p>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={`w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-sm hover:border-slate-300 transition-colors ${ringColor}`}>
            {plan ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                  {plan.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-medium text-slate-900 truncate">{plan.name}</p>
                  <p className="text-xs text-slate-400 truncate">{plan.insurer} · {formatPremium(plan.premium)}/yr</p>
                </div>
              </div>
            ) : (
              <span className="text-slate-400">Select a saved plan…</span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100">
                Clear selection
              </button>
              {plans.map(p => (
                <button key={p.id}
                  onClick={() => { onChange(p); setOpen(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 ${plan?.id === p.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.insurer}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#1E64FF]">{formatPremium(p.premium)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${typeColors[p.insurance_type] || 'bg-slate-100 text-slate-500'}`}>
                        {p.insurance_type}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected plan details */}
      {plan && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { label: 'Type', value: plan.insurance_type },
            { label: 'Risk Score', value: plan.risk_score ? `${plan.risk_score}/100` : 'N/A' },
            { label: 'Match', value: plan.match_score ? `${plan.match_score}%` : 'N/A' },
            { label: 'Premium', value: formatPremium(plan.premium) },
          ].map(({ label: l, value: v }) => (
            <div key={l} className="bg-white rounded-lg p-2 border border-white/80">
              <p className="text-xs text-slate-400">{l}</p>
              <p className="text-sm font-medium text-slate-800 capitalize truncate">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main Component ── */
export const ComparePolicies = () => {
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planA, setPlanA] = useState<SavedPlan | null>(null);
  const [planB, setPlanB] = useState<SavedPlan | null>(null);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [aiResult, setAiResult] = useState<AIComparison | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /* ── Load saved plans from Supabase ── */
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

  const handleCompare = async () => {
    if (!planA || !planB) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const result = await fetchAIComparison(planA, planB);
      setAiResult(result);
    } catch (err: any) {
      setAiError(err.message || 'Could not generate comparison. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSwap = () => {
    const tmp = planA;
    setPlanA(planB);
    setPlanB(tmp);
    setAiResult(null);
  };

  const handleDownload = () => {
    if (!planA || !planB || !aiResult) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>PolicyWise — Policy Comparison</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1e293b}
h1{color:#1E64FF}h2{color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th{background:#f8fafc;text-align:left;padding:10px;font-size:13px;color:#64748b}
td{padding:10px;border-bottom:1px solid #f1f5f9;font-size:14px}
.green{color:#15803d}.blue{color:#1E64FF}.footer{margin-top:40px;font-size:12px;color:#94a3b8;text-align:center}</style>
</head><body>
<h1>🛡️ PolicyWise — Policy Comparison Report</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
<h2>Policies Compared</h2>
<table><thead><tr><th>Feature</th><th class="blue">Policy A — ${planA.name}</th><th class="green">Policy B — ${planB.name}</th></tr></thead>
<tbody>
<tr><td>Insurer</td><td>${planA.insurer}</td><td>${planB.insurer}</td></tr>
<tr><td>Type</td><td>${planA.insurance_type}</td><td>${planB.insurance_type}</td></tr>
<tr><td>Annual Premium</td><td>${planA.premium}</td><td>${planB.premium}</td></tr>
<tr><td>Risk Score</td><td>${planA.risk_score ?? 'N/A'}/100</td><td>${planB.risk_score ?? 'N/A'}/100</td></tr>
<tr><td>Match Score</td><td>${planA.match_score ?? 'N/A'}%</td><td>${planB.match_score ?? 'N/A'}%</td></tr>
${(aiResult.keyDifferences || []).map(d => `<tr><td>${d.feature}</td><td>${d.planA}</td><td>${d.planB}</td></tr>`).join('')}
</tbody></table>
<h2>AI Recommendation</h2>
<p>${aiResult.verdict}</p>
<p><strong>Recommendation:</strong> ${aiResult.recommendation}</p>
<p><strong>💡 Saving Tip:</strong> ${aiResult.savingTip}</p>
<p><strong>Final Advice:</strong> ${aiResult.finalAdvice}</p>
<div class="footer">Generated by PolicyWise AI · For informational purposes only</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'PolicyWise_Comparison.html'; a.click();
    URL.revokeObjectURL(url);
  };

  const isSameType = planA && planB && planA.insurance_type === planB.insurance_type;
  const canCompare = planA && planB && planA.id !== planB.id;

  const displayedDifferences = showDiffOnly
    ? (aiResult?.keyDifferences || []).filter(d => d.better !== 'equal')
    : (aiResult?.keyDifferences || []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <span>Home</span> / <span className="text-slate-700">Compare Policies</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compare Policies</h1>
          <p className="text-slate-500 mt-1">Compare your saved plans side-by-side with AI-powered insights.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} disabled={!aiResult}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E64FF] text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
            <Download className="w-4 h-4" /> Download Report
          </button>
        </div>
      </div>

      {/* Selector Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">

          {/* Swap button */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button onClick={handleSwap} title="Swap policies"
              className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition-colors">
              <ArrowRightLeft className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <PlanSelector label="A" color="blue" plan={planA} plans={savedPlans}
            loading={plansLoading} onChange={p => { setPlanA(p); setAiResult(null); }} />
          <PlanSelector label="B" color="teal" plan={planB} plans={savedPlans}
            loading={plansLoading} onChange={p => { setPlanB(p); setAiResult(null); }} />
        </div>

        {/* Same plan warning */}
        {planA && planB && planA.id === planB.id && (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Please select two different plans to compare.
          </div>
        )}

        {/* Type indicator */}
        {planA && planB && planA.id !== planB.id && (
          <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
            isSameType
              ? 'bg-blue-50 border-blue-100 text-blue-700'
              : 'bg-purple-50 border-purple-100 text-purple-700'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            {isSameType
              ? `Same type comparison (${planA.insurance_type}) — AI will recommend the better value policy`
              : `Different types (${planA.insurance_type} vs ${planB.insurance_type}) — AI will rank by urgency based on your risk scores`
            }
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-5 border-t border-slate-100 gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              onClick={() => setShowDiffOnly(!showDiffOnly)}
              className={`w-11 h-6 rounded-full relative transition-colors ${showDiffOnly ? 'bg-[#1E64FF]' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showDiffOnly ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-slate-600">Show only differences</span>
          </label>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={handleSwap}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 text-sm">
              Swap Policies
            </button>
            <button onClick={handleCompare} disabled={!canCompare || aiLoading}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1E64FF] text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2">
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</> : <><Sparkles className="w-4 h-4" /> Compare Now</>}
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!aiResult && !aiLoading && !aiError && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <Scale className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-bold text-slate-900 text-lg mb-1">No comparison yet</h3>
          <p className="text-slate-400 text-sm">Select two saved plans above and click "Compare Now"</p>
        </div>
      )}

      {/* Error state */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">Comparison failed</p>
            <p className="text-sm text-red-500 mt-0.5">{aiError}</p>
            <button onClick={handleCompare} className="mt-3 text-sm bg-red-100 text-red-700 px-4 py-1.5 rounded-lg hover:bg-red-200">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {aiLoading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
          <div className="text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-pulse text-[#1E64FF]" />
            AI is analysing your policies…
          </div>
        </div>
      )}

      {/* Results */}
      {aiResult && !aiLoading && planA && planB && (
        <div className="space-y-6">

          {/* ── Scenario: Same Type ── */}
          {aiResult.scenario === 'same_type' && (
            <>
              {/* Winner banner */}
              <div className={`rounded-2xl p-6 border ${
                aiResult.winner === 'A' ? 'bg-blue-50 border-blue-200' :
                aiResult.winner === 'B' ? 'bg-teal-50 border-teal-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    aiResult.winner === 'A' ? 'bg-blue-100' :
                    aiResult.winner === 'B' ? 'bg-teal-100' : 'bg-slate-100'
                  }`}>
                    <TrendingUp className={`w-6 h-6 ${
                      aiResult.winner === 'A' ? 'text-blue-600' :
                      aiResult.winner === 'B' ? 'text-teal-600' : 'text-slate-500'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-lg">
                        {aiResult.winner === 'tie' ? '🤝 It\'s a Tie' :
                         aiResult.winner === 'A' ? `🏆 Policy A Wins — ${planA.name}` :
                         `🏆 Policy B Wins — ${planB.name}`}
                      </h3>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{aiResult.winnerReason}</p>
                  </div>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: IndianRupee, label: 'Premium Difference',
                    value: (() => {
                      const diff = Math.abs(parsePremiumNum(planA.premium) - parsePremiumNum(planB.premium));
                      const cheaper = parsePremiumNum(planA.premium) < parsePremiumNum(planB.premium) ? 'A' : 'B';
                      return diff > 0 ? `Policy ${cheaper} saves ₹${diff.toLocaleString('en-IN')}/yr` : 'Same premium';
                    })(),
                    bg: 'bg-green-50 border-green-100', iconBg: 'bg-green-100', iconColor: 'text-green-600',
                  },
                  {
                    icon: Shield, label: 'Better Match Score',
                    value: (() => {
                      const a = planA.match_score ?? 0; const b = planB.match_score ?? 0;
                      if (a > b) return `Policy A — ${a}%`;
                      if (b > a) return `Policy B — ${b}%`;
                      return `Both — ${a}%`;
                    })(),
                    bg: 'bg-blue-50 border-blue-100', iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
                  },
                  {
                    icon: TrendingUp, label: 'Better Risk Score',
                    value: (() => {
                      const a = planA.risk_score ?? 0; const b = planB.risk_score ?? 0;
                      if (a > b) return `Policy A — ${a}/100`;
                      if (b > a) return `Policy B — ${b}/100`;
                      return `Both — ${a}/100`;
                    })(),
                    bg: 'bg-purple-50 border-purple-100', iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
                  },
                ].map(({ icon: Icon, label, value, bg, iconBg, iconColor }) => (
                  <div key={label} className={`rounded-2xl border p-4 flex items-start gap-3 ${bg}`}>
                    <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <p className="font-bold text-slate-900 text-sm">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Scenario: Different Types ── */}
          {aiResult.scenario === 'different_type' && aiResult.urgencyRanking && (
            <>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-900">Urgency Ranking</h3>
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Based on your risk scores</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {aiResult.urgencyRanking.map((item, idx) => {
                    const plan = idx === 0 ? planA : planB;
                    const urgencyColor =
                      item.urgency === 'High' ? 'bg-red-100 text-red-700 border-red-200' :
                      item.urgency === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-green-100 text-green-700 border-green-200';
                    const rankLabel = idx === 0 ? '1st Priority' : '2nd Priority';
                    return (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${urgencyColor}`}>
                            {item.urgency} Urgency
                          </span>
                          <span className="text-xs text-slate-400">{rankLabel}</span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm mb-0.5 capitalize">{plan?.name}</p>
                        <p className="text-xs text-slate-500 capitalize mb-2">{item.type} Insurance</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.reason}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* AI Verdict */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-300" />
              <h3 className="font-bold">AI Analysis</h3>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed mb-3">{aiResult.verdict}</p>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Recommendation</p>
              <p className="text-white text-sm leading-relaxed">{aiResult.recommendation}</p>
            </div>
          </div>

          {/* Side-by-side comparison table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Detailed Comparison</h3>
              <span className="text-xs text-slate-400">{displayedDifferences.length} features</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-5 text-slate-500 font-medium w-40">Feature</th>
                    <th className="py-3 px-4 text-center text-blue-700 font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        Policy A — {planA.name.split(' ').slice(0,3).join(' ')}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center text-teal-700 font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 bg-teal-400 rounded-full" />
                        Policy B — {planB.name.split(' ').slice(0,3).join(' ')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Static rows from plan data */}
                  {[
                    { feature: 'Insurer', planA: planA.insurer, planB: planB.insurer, better: 'equal' as const },
                    { feature: 'Type', planA: planA.insurance_type, planB: planB.insurance_type, better: 'equal' as const },
                    { feature: 'Annual Premium', planA: formatPremium(planA.premium), planB: formatPremium(planB.premium),
                      better: parsePremiumNum(planA.premium) < parsePremiumNum(planB.premium) ? 'A' as const : parsePremiumNum(planA.premium) > parsePremiumNum(planB.premium) ? 'B' as const : 'equal' as const },
                    { feature: 'Risk Score', planA: `${planA.risk_score ?? 'N/A'}/100`, planB: `${planB.risk_score ?? 'N/A'}/100`,
                      better: (planA.risk_score ?? 0) > (planB.risk_score ?? 0) ? 'A' as const : (planA.risk_score ?? 0) < (planB.risk_score ?? 0) ? 'B' as const : 'equal' as const },
                    { feature: 'Match Score', planA: `${planA.match_score ?? 'N/A'}%`, planB: `${planB.match_score ?? 'N/A'}%`,
                      better: (planA.match_score ?? 0) > (planB.match_score ?? 0) ? 'A' as const : (planA.match_score ?? 0) < (planB.match_score ?? 0) ? 'B' as const : 'equal' as const },
                    ...displayedDifferences,
                  ].filter(row => !showDiffOnly || row.better !== 'equal').map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 font-medium text-slate-700">{row.feature}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-700 capitalize">{row.planA}</span>
                          {row.better === 'A' && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Best ✓</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-700 capitalize">{row.planB}</span>
                          {row.better === 'B' && (
                            <span className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">Best ✓</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Features side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { plan: planA, label: 'Policy A', color: 'border-blue-200 bg-blue-50/30', tagBg: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
              { plan: planB, label: 'Policy B', color: 'border-teal-200 bg-teal-50/30', tagBg: 'bg-teal-100 text-teal-700', dot: 'bg-teal-400' },
            ].map(({ plan, label, color, tagBg, dot }) => (
              <div key={label} className={`bg-white rounded-2xl border p-5 ${color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  <h4 className="font-bold text-slate-900 text-sm">{label} — {plan.name}</h4>
                </div>
                {plan.key_benefit && (
                  <div className="bg-white rounded-lg p-3 mb-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-0.5">Key Benefit</p>
                    <p className="text-sm font-medium text-slate-800">{plan.key_benefit}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(plan.features || []).map((f, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-md ${tagBg}`}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Insights row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-green-800 mb-1.5 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Saving Tip
              </p>
              <p className="text-green-800 text-sm leading-relaxed">{aiResult.savingTip}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-blue-800 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Risk Insight
              </p>
              <p className="text-blue-800 text-sm leading-relaxed">{aiResult.riskInsight}</p>
            </div>
          </div>

          {/* Final advice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm mb-1">Final Advice</p>
              <p className="text-amber-800 text-sm leading-relaxed">{aiResult.finalAdvice}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};