import React from 'react';
import { Wallet, ShieldCheck, Heart, Zap, AlertTriangle, Scale } from 'lucide-react';
import clsx from 'clsx';

interface Step3Props {
  onNext: (scenario: string) => void;
  onBack: () => void;
}

const scenarios = [
  { id: 'budget', title: 'Low Budget', icon: Wallet, desc: 'Optimized for lowest premium with essential coverage.', bestFor: 'Young & Healthy' },
  { id: 'coverage', title: 'Maximum Coverage', icon: ShieldCheck, desc: 'Highest sum insured with comprehensive add-ons.', bestFor: 'Families' },
  { id: 'family', title: 'Family Safety', icon: Heart, desc: 'Balanced plan covering maternity and child health.', bestFor: 'New Parents' },
  { id: 'fast', title: 'Fast Claim Support', icon: Zap, desc: 'Insurers with <4 hr claim settlement history.', bestFor: 'Busy Professionals' },
  { id: 'risk', title: 'High Risk Acceptance', icon: AlertTriangle, desc: 'Plans that accept pre-existing diseases easily.', bestFor: 'Seniors' },
  { id: 'balanced', title: 'Balanced Choice', icon: Scale, desc: 'Best value for money (Premium vs Coverage).', bestFor: 'Most Users' },
];

export const Step3_Scenario: React.FC<Step3Props> = ({ onNext, onBack }) => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-slate-900">Choose your priority</h2>
        <p className="text-slate-500">Our AI will re-rank policies based on what matters most to you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {scenarios.map((s) => (
          <div 
            key={s.id}
            onClick={() => onNext(s.id)}
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-[#1E64FF] hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-bl-xl font-medium group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
              {s.bestFor}
            </div>
            
            <div className="w-12 h-12 bg-blue-50 text-[#1E64FF] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#1E64FF] group-hover:text-white transition-colors">
              <s.icon className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button 
          onClick={onBack}
          className="text-slate-500 hover:text-slate-700 font-medium text-sm"
        >
          Back to details
        </button>
      </div>
    </div>
  );
};
