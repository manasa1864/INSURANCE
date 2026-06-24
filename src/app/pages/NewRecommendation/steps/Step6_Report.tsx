// Step 6 — final step. Generates a report summary and saves it to Supabase.
// The user can download a PDF or navigate directly to their Reports page.

import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../../../lib/api/supabaseClient';

interface Step6Props {
  onNext: () => void;
  onBack: () => void;
  formData?: any;
  insuranceType?: string;
  riskScore?: number;
  estimatedMin?: number;
  estimatedMax?: number;
  aiRecommendation?: any;
}

const formatCurrency = (val: number) =>
  val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${(val / 1000).toFixed(0)}k`;

export const Step6_Report: React.FC<Step6Props> = ({
  onNext, onBack,
  formData = {}, insuranceType = 'health',
  riskScore = 75, estimatedMin = 8000, estimatedMax = 12000,
  aiRecommendation,
}) => {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const policies = aiRecommendation?.topPolicies ?? [];
  const riskLabel = riskScore >= 70 ? 'Low' : riskScore >= 45 ? 'Moderate' : 'High';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const reportId = `R-${Date.now().toString().slice(-6)}`;

  const handleSaveReport = async () => {
    if (saved || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase.from('reports').insert({
        user_id: user.id,
        report_id: reportId,
        name: `${insuranceType.charAt(0).toUpperCase() + insuranceType.slice(1)} Insurance Report`,
        type: 'Recommendation',
        status: 'Ready',
        insurance_type: insuranceType,
        risk_score: riskScore,
        estimated_min: estimatedMin,
        estimated_max: estimatedMax,
        user_name: formData.fullName || 'User',
        policies: policies.slice(0, 3).map((p: any) => ({
          name: p.name,
          insurer: p.insurer,
          premium: p.yearlyPremium,
        })),
        saving_tip: aiRecommendation?.savingTip || '',
        report_date: today,
      });

      if (error) throw error;
      setSaved(true);
    } catch (err: any) {
      setSaveError('Could not save report. Please try again.');
      console.error('Save report error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    setDownloading(true);

    // Build a simple HTML report string
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>PolicyWise Report - ${insuranceType}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1e293b; }
    h1 { color: #1E64FF; } h2 { color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .low { background: #dcfce7; color: #166534; } .moderate { background: #fef9c3; color: #854d0e; } .high { background: #fee2e2; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f8fafc; text-align: left; padding: 10px; font-size: 13px; color: #64748b; }
    td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .tip { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>🛡️ PolicyWise AI — Insurance Report</h1>
  <p><strong>Report ID:</strong> ${reportId} &nbsp;|&nbsp; <strong>Date:</strong> ${today} &nbsp;|&nbsp; <strong>Name:</strong> ${formData.fullName || 'N/A'}</p>

  <h2>Risk Profile</h2>
  <p><strong>Insurance Type:</strong> ${insuranceType.toUpperCase()}</p>
  <p><strong>Risk Score:</strong> ${riskScore}/100 &nbsp; <span class="badge ${riskLabel.toLowerCase()}">${riskLabel} Risk</span></p>
  <p><strong>Estimated Yearly Cost:</strong> ${formatCurrency(estimatedMin)} – ${formatCurrency(estimatedMax)}</p>

  <h2>Top Policy Recommendations</h2>
  <table>
    <thead><tr><th>#</th><th>Policy Name</th><th>Insurer</th><th>Yearly Premium</th></tr></thead>
    <tbody>
      ${policies.slice(0, 3).map((p: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.name}</td>
          <td>${p.insurer}</td>
          <td>${p.yearlyPremium}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${aiRecommendation?.savingTip ? `
  <div class="tip">
    <strong>💡 Money-Saving Tip</strong><br/>
    ${aiRecommendation.savingTip}
  </div>` : ''}

  ${aiRecommendation?.summary ? `
  <h2>AI Analysis Summary</h2>
  <p>${aiRecommendation.summary}</p>` : ''}

  <div class="footer">Generated by PolicyWise AI &nbsp;|&nbsp; For informational purposes only</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PolicyWise_Report_${insuranceType}_${reportId}.html`;
    a.click();
    URL.revokeObjectURL(url);

    // Also save to reports panel
    handleSaveReport();
    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#1E64FF]" />
          Your Insurance Report
        </h2>
        <p className="text-slate-500 text-sm mt-1">Based on your AI recommendation — save or download for future reference</p>
      </div>

      {/* Report Preview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">

        {/* Report Header */}
        <div className="bg-gradient-to-r from-[#1E64FF] to-blue-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">PolicyWise AI Report</p>
              <h3 className="text-xl font-bold capitalize">{insuranceType} Insurance Analysis</h3>
              <p className="text-blue-200 text-sm mt-1">{today} &nbsp;·&nbsp; {reportId}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-xs">Risk Score</p>
              <p className="text-3xl font-bold">{riskScore}<span className="text-lg">/100</span></p>
              <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                riskScore >= 70 ? 'bg-green-400/30 text-green-100' :
                riskScore >= 45 ? 'bg-amber-400/30 text-amber-100' :
                                  'bg-red-400/30 text-red-100')}>
                {riskLabel} Risk
              </span>
            </div>
          </div>
        </div>

        {/* Report Body */}
        <div className="p-6 space-y-6">

          {/* User Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Name</p>
              <p className="font-medium text-slate-900">{formData.fullName || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Estimated Cost</p>
              <p className="font-medium text-[#1E64FF]">{formatCurrency(estimatedMin)} – {formatCurrency(estimatedMax)}/yr</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs">Insurance Type</p>
              <p className="font-medium text-slate-900 capitalize">{insuranceType}</p>
            </div>
          </div>

          {/* Top Policies */}
          {policies.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Top Recommended Policies</p>
              <div className="space-y-2">
                {policies.slice(0, 3).map((policy: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold',
                        idx === 0 ? 'bg-[#1E64FF]' : idx === 1 ? 'bg-slate-500' : 'bg-slate-400')}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{policy.name}</p>
                        <p className="text-slate-400 text-xs">{policy.insurer}</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{policy.yearlyPremium}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saving Tip */}
          {aiRecommendation?.savingTip && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-green-800 font-semibold text-sm">Money-Saving Tip</p>
                <p className="text-green-700 text-sm mt-0.5">{aiRecommendation.savingTip}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={handleSaveReport}
          disabled={saved || saving}
          className={clsx(
            'flex items-center justify-center gap-2 py-3 rounded-xl font-medium border-2 transition-all',
            saved
              ? 'border-green-500 bg-green-50 text-green-700 cursor-default'
              : saving
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-wait'
              : 'border-[#1E64FF] text-[#1E64FF] hover:bg-blue-50'
          )}>
          {saving
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
            : saved
            ? <><CheckCircle2 className="w-5 h-5" /> Saved to Reports!</>
            : <><CheckCircle2 className="w-5 h-5" /> Save to Reports Panel</>
          }
        </button>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-[#1E64FF] text-white hover:bg-blue-700 transition-colors">
          <Download className="w-5 h-5" />
          {downloading ? 'Downloading...' : 'Download Report'}
        </button>
      </div>

      {saveError && (
        <p className="text-red-500 text-sm text-center mb-4">{saveError}</p>
      )}

      {/* Nav Footer */}
      <div className="flex justify-between items-center border-t border-slate-200 pt-6">
        <button onClick={onBack}
          className="flex items-center text-slate-600 hover:text-slate-900 font-medium px-4 py-2">
          ← Back
        </button>
        <button onClick={onNext}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 flex items-center gap-2">
          Go to Reports <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};