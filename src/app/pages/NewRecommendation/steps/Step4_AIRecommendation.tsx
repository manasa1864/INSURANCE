import React, { useEffect, useState } from 'react';
import {
  Sparkles, AlertCircle, RefreshCw, ShieldCheck, TrendingUp,
  IndianRupee, CheckCircle2, XCircle, Star, Clock, Building2,
  Phone, Globe, Award, AlertTriangle, Info
} from 'lucide-react';
import clsx from 'clsx';

interface Step4Props {
  formData: any;
  insuranceType: string;
  riskScore: number;
  estimatedMin: number;
  estimatedMax: number;
  onNext: (recommendation?: any) => void;
  onBack: () => void;
}

interface PolicyDetail {
  name: string;
  insurer: string;
  insurerShortName: string;
  yearlyPremium: string;
  monthlyPremium: string;
  claimSettlementRatio: string;
  networkSize: string;
  keyBenefit: string;
  bestFor: string;
  coverageHighlights: string[];
  pros: string[];
  cons: string[];
  waitingPeriod: string;
  renewalBonus: string;
  coPayment: string;
  policyTerm: string;
  entryAge: string;
  specialFeature: string;
  iraiRating: string;
  rating: number;
  matchScore: number;
  whyRecommended: string;
}

interface AIRecommendation {
  summary: string;
  riskAnalysis: string;
  keyRiskFactors: string[];
  recommendedCoverAmount: string;
  coverageJustification: string;
  topPolicies: PolicyDetail[];
  comparisonInsight: string;
  addOnsToConsider: { name: string; benefit: string; estimatedCost: string }[];
  thingsToAvoid: string[];
  commonMistakes: string[];
  savingTip: string;
  taxBenefit: string;
  claimTips: string[];
  nextSteps: string[];
}

const formatCurrency = (val: number) =>
  val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${(val / 1000).toFixed(0)}k`;

const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx('animate-pulse bg-slate-200 rounded-lg', className)} />
);

const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => (
  <div className="flex gap-0.5 items-center">
    {[1,2,3,4,5].map(s => (
      <Star key={s} className={clsx(
        size === 'md' ? 'w-4 h-4' : 'w-3 h-3',
        s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
      )} />
    ))}
    <span className="text-xs text-slate-500 ml-1">{rating}.0/5</span>
  </div>
);

const MatchBadge = ({ score }: { score: number }) => (
  <span className={clsx(
    'text-xs font-bold px-2.5 py-1 rounded-full',
    score >= 95 ? 'bg-green-100 text-green-700' :
    score >= 85 ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
  )}>
    {score}% Match
  </span>
);

export const Step4_AIRecommendation: React.FC<Step4Props> = ({
  formData, insuranceType, riskScore, estimatedMin, estimatedMax, onNext, onBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [expandedPolicy, setExpandedPolicy] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'compare'>('overview');

  const fetchRecommendation = async () => {
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('Groq API key not found. Add VITE_GROQ_API_KEY to your .env file.');

      const riskCategory = riskScore >= 70 ? 'LOW' : riskScore >= 45 ? 'MODERATE' : 'HIGH';

      const profileDetails = Object.entries(formData)
        .filter(([k, v]) => !k.startsWith('_') && v !== '' && v !== false && v !== null && v !== undefined)
        .filter(([k]) => !['sumInsured'].includes(k))
        .map(([k, v]) => k.replace(/_/g, ' ') + ': ' + v)
        .join(', ');

      const selectedAddOns = Object.entries(formData)
        .filter(([k, v]) => k.startsWith('addon_') && v)
        .map(([k]) => k.replace('addon_', '').replace(/_/g, ' '))
        .join(', ') || 'None';

      const prompt = buildDetailedPrompt(
        insuranceType, riskScore, riskCategory,
        estimatedMin, estimatedMax,
        profileDetails, selectedAddOns, formData
      );

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.8,
          max_tokens: 4000,
          messages: [
            {
              role: 'system',
              content: 'You are an expert Indian insurance advisor with 20 years of experience. You have deep knowledge of all major Indian insurance companies including LIC, HDFC Life, ICICI Prudential, SBI Life, Max Life, Bajaj Allianz, Tata AIA, Aditya Birla Sun Life, Kotak Life, PNB MetLife, Star Health, Niva Bupa (Max Bupa), Care Health, HDFC ERGO, ICICI Lombard, Bajaj Allianz General, New India Assurance, Oriental Insurance, United India Insurance, National Insurance, Reliance General, Tata AIG, Royal Sundaram, Acko, Digit Insurance, Go Digit, Manipal Cigna, Future Generali, SBI General. Always respond with valid JSON only. No markdown, no backticks, no text outside JSON.'
            },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error?.message || 'API error: ' + response.status);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed: AIRecommendation = JSON.parse(clean);
      setRecommendation(parsed);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecommendation(); }, []);

  const riskColor = riskScore >= 70 ? 'bg-green-50 border-green-200' : riskScore >= 45 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const riskIconColor = riskScore >= 70 ? 'text-green-600' : riskScore >= 45 ? 'text-amber-600' : 'text-red-600';
  const riskLabel = riskScore >= 70 ? 'Low Risk' : riskScore >= 45 ? 'Moderate Risk' : 'High Risk';

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#1E64FF]" />
            AI-Powered Recommendation
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Deep analysis by Llama 3.3 · Based on {Object.keys(formData).filter(k => !k.startsWith('_') && formData[k]).length} data points from your profile
          </p>
        </div>
        {!loading && (
          <button onClick={fetchRecommendation}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#1E64FF] border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
        )}
      </div>

      {/* Risk Banner */}
      <div className={clsx('rounded-2xl p-5 mb-6 flex items-center justify-between border', riskColor)}>
        <div className="flex items-center gap-4">
          <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2',
            riskScore >= 70 ? 'border-green-400 bg-green-100 text-green-700' :
            riskScore >= 45 ? 'border-amber-400 bg-amber-100 text-amber-700' :
                              'border-red-400 bg-red-100 text-red-700')}>
            {riskScore}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg">{riskLabel} Profile</p>
            <p className="text-sm text-slate-500">Risk Score: {riskScore}/100</p>
            <div className="w-48 bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className={clsx('h-full rounded-full transition-all',
                riskScore >= 70 ? 'bg-green-500' : riskScore >= 45 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: riskScore + '%' }} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Estimated Annual Premium</p>
          <p className="text-2xl font-bold text-[#1E64FF]">{formatCurrency(estimatedMin)}</p>
          <p className="text-xs text-slate-400">to {formatCurrency(estimatedMax)}/year</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 mb-6">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">Could not load AI recommendation</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button onClick={fetchRecommendation}
              className="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-medium">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
          <div className="text-center text-slate-400 text-sm flex items-center justify-center gap-2 py-6">
            <Sparkles className="w-4 h-4 animate-pulse text-[#1E64FF]" />
            Analysing across 30+ Indian insurance companies…
          </div>
        </div>
      )}

      {/* Full Recommendation */}
      {recommendation && !loading && (
        <div className="space-y-6">

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200">
            {(['overview', 'details', 'compare'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={clsx('px-6 py-3 text-sm font-medium border-b-2 capitalize transition-colors',
                  activeTab === tab ? 'border-[#1E64FF] text-[#1E64FF]' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                {tab === 'overview' ? '📊 Overview' : tab === 'details' ? '📋 Policy Details' : '⚖️ Compare'}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="space-y-5">

              {/* AI Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#1E64FF]" />
                  <h3 className="font-bold text-slate-900">Your Personalised Analysis</h3>
                </div>
                <p className="text-slate-700 leading-relaxed">{recommendation.summary}</p>
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">{recommendation.riskAnalysis}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-slate-400 mb-1">Recommended Cover</p>
                    <p className="font-bold text-[#1E64FF] text-lg">{recommendation.recommendedCoverAmount}</p>
                    <p className="text-xs text-slate-500 mt-1">{recommendation.coverageJustification}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-slate-400 mb-2">Key Risk Factors</p>
                    <ul className="space-y-1">
                      {recommendation.keyRiskFactors?.slice(0,3).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Top 3 Policy Cards - Overview */}
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#1E64FF]" />
                Top {recommendation.topPolicies?.length || 3} Recommended Policies
              </h3>

              {recommendation.topPolicies?.map((policy, idx) => (
                <div key={idx}
                  className={clsx('bg-white rounded-2xl border p-6 transition-all cursor-pointer',
                    expandedPolicy === idx ? 'border-[#1E64FF] shadow-lg shadow-blue-100' : 'border-slate-200 hover:border-blue-300 hover:shadow-md')}
                  onClick={() => setExpandedPolicy(expandedPolicy === idx ? -1 : idx)}>

                  {idx === 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-[#1E64FF] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" /> Best Match for You
                      </span>
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        Editor's Choice
                      </span>
                    </div>
                  )}

                  {/* Policy Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                        {policy.insurerShortName || policy.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{policy.name}</h4>
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {policy.insurer}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={policy.rating} />
                          <MatchBadge score={policy.matchScore || (98 - idx * 5)} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-slate-900">{policy.yearlyPremium}</p>
                      <p className="text-xs text-slate-400">per year</p>
                      {policy.monthlyPremium && (
                        <p className="text-xs text-[#1E64FF] font-medium">~{policy.monthlyPremium}/month</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-0.5">Claim Ratio</p>
                      <p className="font-bold text-slate-900 text-sm">{policy.claimSettlementRatio || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-0.5">Network</p>
                      <p className="font-bold text-slate-900 text-sm">{policy.networkSize || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-0.5">IRDAI Rating</p>
                      <p className="font-bold text-slate-900 text-sm">{policy.iraiRating || 'AA'}</p>
                    </div>
                  </div>

                  {/* Key Benefit */}
                  <div className="bg-blue-50 rounded-xl p-3 mb-4">
                    <p className="text-sm font-semibold text-blue-900">🏆 {policy.keyBenefit}</p>
                    <p className="text-xs text-blue-600 mt-1">Best for: {policy.bestFor}</p>
                  </div>

                  {/* Why Recommended */}
                  <div className="bg-green-50 rounded-xl p-3 mb-4">
                    <p className="text-xs font-semibold text-green-800 mb-1">Why we recommend this for you:</p>
                    <p className="text-xs text-green-700">{policy.whyRecommended}</p>
                  </div>

                  {/* Coverage Highlights */}
                  {policy.coverageHighlights && policy.coverageHighlights.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {policy.coverageHighlights.map((h: string, i: number) => (
                        <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" /> {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Pros / Cons */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">Pros</p>
                      <ul className="space-y-1.5">
                        {policy.pros?.map((pro: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wide">Cons</p>
                      <ul className="space-y-1.5">
                        {policy.cons?.map((con: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" /> {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}

              {/* Comparison Insight */}
              {recommendation.comparisonInsight && (
                <div className="bg-slate-900 rounded-2xl p-5 text-white">
                  <p className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" /> AI Comparison Insight
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">{recommendation.comparisonInsight}</p>
                </div>
              )}
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {recommendation.topPolicies?.map((policy, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{policy.name}</h4>
                        <p className="text-slate-500 text-sm">{policy.insurer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#1E64FF]">{policy.yearlyPremium}/yr</p>
                        <StarRating rating={policy.rating} size="md" />
                      </div>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { icon: Clock, label: 'Waiting Period', value: policy.waitingPeriod },
                      { icon: TrendingUp, label: 'No-Claim Bonus', value: policy.renewalBonus },
                      { icon: IndianRupee, label: 'Co-Payment', value: policy.coPayment },
                      { icon: Globe, label: 'Network Size', value: policy.networkSize },
                      { icon: Award, label: 'Claim Ratio', value: policy.claimSettlementRatio },
                      { icon: Building2, label: 'Entry Age', value: policy.entryAge },
                    ].map(({ icon: Icon, label, value }) => value ? (
                      <div key={label} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-3.5 h-3.5 text-[#1E64FF]" />
                          <p className="text-xs text-slate-400">{label}</p>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{value}</p>
                      </div>
                    ) : null)}
                  </div>
                  {policy.specialFeature && (
                    <div className="px-5 pb-5">
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                        <p className="text-xs font-bold text-purple-800 mb-1">✨ Special Feature</p>
                        <p className="text-xs text-purple-700">{policy.specialFeature}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Tax Benefits */}
              {recommendation.taxBenefit && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> Tax Benefits
                  </h4>
                  <p className="text-green-800 text-sm">{recommendation.taxBenefit}</p>
                </div>
              )}

              {/* Claim Tips */}
              {recommendation.claimTips && recommendation.claimTips.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#1E64FF]" /> How to Claim Successfully
                  </h4>
                  <ol className="space-y-2">
                    {recommendation.claimTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <span className="w-6 h-6 bg-[#1E64FF] text-white rounded-full flex items-center justify-center text-xs shrink-0 font-bold">
                          {i + 1}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* ── COMPARE TAB ── */}
          {activeTab === 'compare' && recommendation.topPolicies && (
            <div className="space-y-5">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-4 font-semibold text-slate-700 w-40">Feature</th>
                      {recommendation.topPolicies.map((p, i) => (
                        <th key={i} className="p-4 text-center">
                          <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                          <p className="text-slate-400 text-xs">{p.insurer}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Annual Premium', key: 'yearlyPremium' },
                      { label: 'Claim Ratio', key: 'claimSettlementRatio' },
                      { label: 'Network', key: 'networkSize' },
                      { label: 'Waiting Period', key: 'waitingPeriod' },
                      { label: 'NCB / Bonus', key: 'renewalBonus' },
                      { label: 'Co-Payment', key: 'coPayment' },
                      { label: 'Entry Age', key: 'entryAge' },
                      { label: 'Match Score', key: 'matchScore' },
                      { label: 'Our Rating', key: 'rating' },
                    ].map(({ label, key }) => (
                      <tr key={label} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-600 text-xs">{label}</td>
                        {recommendation.topPolicies.map((p: any, i: number) => (
                          <td key={i} className="p-4 text-center text-xs text-slate-700">
                            {key === 'rating'
                              ? <StarRating rating={p[key]} />
                              : key === 'matchScore'
                              ? <MatchBadge score={p[key] || (98 - i * 5)} />
                              : (p[key] || '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Common Mistakes */}
              {recommendation.commonMistakes && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Common Mistakes to Avoid
                  </h4>
                  <ul className="space-y-2">
                    {recommendation.commonMistakes.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" /> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── ALWAYS VISIBLE: Add-ons, Saving Tip, Next Steps ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h4 className="font-bold text-slate-900 mb-3 text-sm">✅ Recommended Add-ons</h4>
              <ul className="space-y-3">
                {recommendation.addOnsToConsider?.map((a, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-slate-700">{a.name || String(a)}</p>
                      {a.estimatedCost && (
                        <span className="text-xs text-[#1E64FF] font-medium shrink-0 ml-2">{a.estimatedCost}</span>
                      )}
                    </div>
                    {a.benefit && <p className="text-xs text-slate-500 mt-0.5">{a.benefit}</p>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h4 className="font-bold text-slate-900 mb-3 text-sm">⚠️ Things to Avoid</h4>
              <ul className="space-y-2">
                {recommendation.thingsToAvoid?.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <p className="font-bold text-green-900 mb-1">Money-Saving Tip</p>
              <p className="text-green-800 text-sm leading-relaxed">{recommendation.savingTip}</p>
            </div>
          </div>

          {recommendation.nextSteps && recommendation.nextSteps.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h4 className="font-bold text-slate-900 mb-3">🚀 Your Next Steps</h4>
              <ol className="space-y-2">
                {recommendation.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs shrink-0 font-bold">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Nav Footer */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <button type="button" onClick={onBack}
          className="flex items-center text-slate-600 hover:text-slate-900 font-medium px-4 py-2">
          ← Back
        </button>
        <button type="button"
          onClick={() => onNext(recommendation ?? undefined)}
          disabled={loading || !!error}
          className={clsx(
            'px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-all',
            loading || error
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-[#1E64FF] text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
          )}>
          Save & Continue →
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   PROMPT BUILDER — builds ultra-detailed prompt using
   lines array to avoid template literal nesting issues
   ══════════════════════════════════════════════════════════ */
function buildDetailedPrompt(
  insuranceType: string, riskScore: number, riskCategory: string,
  estimatedMin: number, estimatedMax: number,
  profileDetails: string, selectedAddOns: string, formData: any
): string {
  const lines: string[] = [];
  const costMin = formatCurrency(estimatedMin);
  const costMax = formatCurrency(estimatedMax);

  lines.push('You are an expert Indian insurance advisor. Give a COMPREHENSIVE, DETAILED recommendation.');
  lines.push('This should rival the quality of Policybazaar or Coverfox recommendations.');
  lines.push('');
  lines.push('INSURANCE TYPE: ' + insuranceType.toUpperCase());
  lines.push('RISK SCORE: ' + riskScore + '/100 — CATEGORY: ' + riskCategory);
  lines.push('ESTIMATED ANNUAL COST: ' + costMin + ' to ' + costMax);
  lines.push('COVERAGE DESIRED: Rs ' + ((parseInt(formData.sumInsured) || 500000) / 100000).toFixed(1) + ' Lakhs');
  lines.push('SELECTED ADD-ONS: ' + selectedAddOns);
  lines.push('');
  lines.push('USER COMPLETE PROFILE:');
  lines.push(profileDetails);
  lines.push('');
  lines.push('INDIAN INSURANCE COMPANIES TO CHOOSE FROM (pick best 3 for this user):');
  lines.push('HEALTH: Star Health, Niva Bupa, Care Health, HDFC ERGO, ICICI Lombard, Bajaj Allianz, Aditya Birla, Manipal Cigna, Reliance Health, New India Assurance, National Insurance, Oriental, United India, Future Generali, ManipalCigna, Tata AIG Health, SBI Arogya, Digit Health');
  lines.push('LIFE: LIC, HDFC Life, ICICI Prudential, SBI Life, Max Life, Tata AIA, Bajaj Allianz Life, Aditya Birla Sun Life, Kotak Life, PNB MetLife, Canara HSBC, Edelweiss Tokio, IndiaFirst, Exide Life');
  lines.push('VEHICLE: ICICI Lombard, Bajaj Allianz, Tata AIG, HDFC ERGO, New India, Royal Sundaram, Acko, Digit, Go Digit, Oriental, United India, Reliance General, SBI General, Iffco Tokio, Chola MS');
  lines.push('TRAVEL: Bajaj Allianz, HDFC ERGO, Tata AIG, Star Health, Care, Reliance, ICICI Lombard, New India, National Insurance');
  lines.push('HOME: HDFC ERGO, Bajaj Allianz, New India, National, Oriental, Tata AIG, Reliance, SBI General');
  lines.push('BUSINESS: New India, National, Bajaj Allianz, ICICI Lombard, HDFC ERGO, Tata AIG, Reliance');
  lines.push('');
  lines.push('RULES:');

  if (riskCategory === 'LOW') {
    lines.push('- LOW risk: Recommend affordable, value-for-money policies. No need for heavy coverage.');
    if (insuranceType === 'health') {
      lines.push('- Suggest from: Niva Bupa ReAssure 360, Aditya Birla Activ Health Platinum, Manipal Cigna ProHealth Prime, Care Joy, HDFC ERGO my:health Suraksha');
      lines.push('- Premium range: Rs 6000-14000/yr for standard 5L cover');
    }
  } else if (riskCategory === 'MODERATE') {
    lines.push('- MODERATE risk: Recommend comprehensive mid-range policies with good coverage.');
    if (insuranceType === 'health') {
      lines.push('- Suggest from: HDFC ERGO Optima Secure, Care Supreme, Star Comprehensive, Niva Bupa Reassure 2.0, ICICI Lombard Complete Health');
      lines.push('- Premium range: Rs 14000-25000/yr for standard 5L cover');
    }
  } else {
    lines.push('- HIGH risk: Recommend comprehensive policies with pre-existing disease cover, senior citizen plans if age > 55.');
    if (insuranceType === 'health') {
      lines.push('- Suggest from: Star Senior Citizen Red Carpet, Niva Bupa Senior First, New India Senior Citizen Mediclaim, Care Classic, Bajaj Allianz Health Guard');
      lines.push('- Premium range: Rs 25000-60000/yr, mention waiting periods clearly');
    }
  }

  lines.push('- All 3 policies must be from DIFFERENT companies');
  lines.push('- yearlyPremium must be realistic and within ' + costMin + ' to ' + costMax);
  lines.push('- Use REAL claim settlement ratios (e.g. Star Health 99.06%, Niva Bupa 92.68%, HDFC ERGO 99.8%)');
  lines.push('- Use REAL network sizes (e.g. Star Health 14000+ hospitals, Niva Bupa 10000+)');
  lines.push('- Be SPECIFIC about waiting periods (e.g. 30 days initial, 2 years pre-existing, 4 years specific diseases)');
  lines.push('- Make pros/cons SPECIFIC to this user profile, not generic');
  lines.push('- whyRecommended must mention the user\'s specific conditions/age/occupation');
  lines.push('- Add-ons should have specific estimated costs in Rs');
  lines.push('- Include realistic IRDAI/solvency ratings');
  lines.push('- Provide 5+ coverageHighlights per policy');
  lines.push('- Provide 4+ pros and 2+ cons per policy');
  lines.push('- claimTips should be practical, step-by-step instructions');
  lines.push('');
  lines.push('Respond with this exact JSON structure (no text outside JSON):');
  lines.push('{');
  lines.push('  "summary": "3-4 sentences, mention user\'s specific age, conditions, risk category and what they need",');
  lines.push('  "riskAnalysis": "2-3 sentences explaining exactly WHY risk score is ' + riskScore + '/100 referencing specific inputs",');
  lines.push('  "keyRiskFactors": ["Factor 1 specific to user", "Factor 2", "Factor 3"],');
  lines.push('  "recommendedCoverAmount": "Amount like Rs 10 Lakhs or Rs 1 Crore",');
  lines.push('  "coverageJustification": "1 sentence why this cover amount",');
  lines.push('  "comparisonInsight": "2 sentences comparing the 3 recommended policies and when to choose each",');
  lines.push('  "topPolicies": [');
  lines.push('    {');
  lines.push('      "name": "Exact policy name",');
  lines.push('      "insurer": "Full insurance company name",');
  lines.push('      "insurerShortName": "2-3 letter abbreviation like HE",');
  lines.push('      "yearlyPremium": "Rs X,XXX",');
  lines.push('      "monthlyPremium": "Rs X,XXX",');
  lines.push('      "claimSettlementRatio": "e.g. 99.06%",');
  lines.push('      "networkSize": "e.g. 14000+ hospitals",');
  lines.push('      "keyBenefit": "Single most important benefit for THIS user",');
  lines.push('      "bestFor": "Who this is ideal for",');
  lines.push('      "whyRecommended": "Why this matches THIS user\'s specific profile",');
  lines.push('      "specialFeature": "One unique feature of this policy",');
  lines.push('      "coverageHighlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4", "Highlight 5"],');
  lines.push('      "pros": ["Pro 1", "Pro 2", "Pro 3", "Pro 4"],');
  lines.push('      "cons": ["Con 1", "Con 2"],');
  lines.push('      "waitingPeriod": "e.g. 30 days initial, 2 years pre-existing",');
  lines.push('      "renewalBonus": "e.g. 10% NCB per claim-free year, max 50%",');
  lines.push('      "coPayment": "e.g. Nil or 20% for age above 60",');
  lines.push('      "entryAge": "e.g. 18-65 years",');
  lines.push('      "policyTerm": "e.g. 1/2/3 years",');
  lines.push('      "iraiRating": "e.g. AAA or AA+",');
  lines.push('      "matchScore": 96,');
  lines.push('      "rating": 5');
  lines.push('    }');
  lines.push('  ],');
  lines.push('  "addOnsToConsider": [');
  lines.push('    { "name": "Add-on name", "benefit": "Why user needs this", "estimatedCost": "Rs XXX/yr" }');
  lines.push('  ],');
  lines.push('  "thingsToAvoid": ["Specific thing 1", "Thing 2", "Thing 3"],');
  lines.push('  "commonMistakes": ["Mistake 1", "Mistake 2", "Mistake 3"],');
  lines.push('  "savingTip": "Specific money-saving tip for this exact user",');
  lines.push('  "taxBenefit": "Specific tax benefit under Section 80D/10D/etc for this insurance type",');
  lines.push('  "claimTips": ["Step 1 claim tip", "Step 2", "Step 3", "Step 4"],');
  lines.push('  "nextSteps": ["Action 1", "Action 2", "Action 3"]');
  lines.push('}');

  return lines.join('\n');
}