// Terms & Conditions modal — shown during signup before the user agrees.
// Uses Radix Dialog for accessible focus trapping and keyboard dismiss.

import React, { useState } from 'react';
import { X, Download, Check, Shield } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false); // scroll detection can be wired up later if needed

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col animate-in zoom-in-95 duration-200">

          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-[#1E64FF]" />
              </div>
              <Dialog.Title className="text-lg font-bold text-slate-900">
                Terms &amp; Conditions
              </Dialog.Title>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 text-sm text-slate-600 leading-relaxed custom-scrollbar">

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-3">Section A: General Terms</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>This platform provides premium estimates using ML models and may differ from the final insurer quote.</li>
                <li>Final premium depends on underwriting, medical tests, verification, and specific insurer rules.</li>
                <li>Recommendations are strictly for decision support and are not mandatory.</li>
                <li>All data entered must be accurate and truthful. Fraud or misrepresentation may lead to policy rejection or claim denial.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-3">Section B: Privacy &amp; Data Usage</h3>
              <p>Your privacy is paramount. By using this service, you acknowledge that:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>User data is used for cost prediction, risk profiling, and policy recommendation engines.</li>
                <li>All data is stored securely using industry-standard encryption.</li>
                <li>We do not share your data with third parties without your explicit consent, except for insurer verification purposes.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-3">Section C: Insurance Policy Terms (General)</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Issuance:</strong> Subject to eligibility checks and underwriting approval.</li>
                <li><strong>Waiting Period:</strong> Most health policies have a waiting period for pre-existing diseases (usually 2–4 years).</li>
                <li><strong>Exclusions:</strong> Specific conditions, such as cosmetic surgery or self-inflicted injuries, are typically not covered.</li>
                <li><strong>Claims:</strong> Requires submission of valid documentation (medical reports, bills) within the stipulated timeline.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-3">Section D: Disclaimer</h3>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-amber-800">
                <p>This is a guidance platform. Final policy terms depend solely on the insurer. The policy wording document supersedes any information provided here. Availability of specific plans may vary by region or city.</p>
              </div>
            </section>

            <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-4">Section E: Consent &amp; Declaration</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-[#1E64FF] focus:ring-[#1E64FF]" />
                  <span>I confirm that the information provided is accurate and truthful to the best of my knowledge.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-[#1E64FF] focus:ring-[#1E64FF]" />
                  <span>I consent to the processing of my data for the purpose of insurance cost estimation and risk profiling.</span>
                </label>
              </div>
            </section>
          </div>

          {/* Footer actions */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
            <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={onAccept}
                className="px-5 py-2.5 rounded-lg bg-[#1E64FF] text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                Accept &amp; Continue
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
