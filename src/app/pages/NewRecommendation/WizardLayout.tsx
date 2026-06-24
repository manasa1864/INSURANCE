// 6-step recommendation wizard — owns all shared state and passes it down to each step.
// Steps: Type selection → Details form → Scenario priority → AI recommendation → Results → Report
// State is lifted here so each step can read what the previous steps set.

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import clsx from 'clsx';

import { Step1_TypeSelection } from './steps/Step1_TypeSelection';
import { Step2_Details } from './steps/Step2_Details';
import { Step3_Scenario } from './steps/Step3_Scenario';
import { Step4_AIRecommendation } from './steps/Step4_AIRecommendation';
import { Step4_Results } from './steps/Step5_Results';
import { Step6_Report } from './steps/Step6_Report';

const steps = [
  { id: 1, name: 'Type' },
  { id: 2, name: 'Details' },
  { id: 3, name: 'Scenario' },
  { id: 4, name: 'AI Results' },
  { id: 5, name: 'Results' },
  { id: 6, name: 'Report' },
];

export const WizardLayout = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [insuranceType, setInsuranceType] = useState<string>(
    searchParams.get('type') || 'health'
  );
  const [details, setDetails] = useState<any>({});
  const [scenario, setScenario] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Progress Stepper */}
      <div className="mb-12">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-4 w-full h-1 bg-slate-200 -z-10" />
          <div
            className="absolute left-0 top-4 h-1 bg-[#1E64FF] -z-10 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2',
                  isCompleted ? 'bg-[#1E64FF] border-[#1E64FF] text-white' :
                  isCurrent   ? 'bg-white border-[#1E64FF] text-[#1E64FF]' :
                                'bg-white border-slate-300 text-slate-400'
                )}>
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span className={clsx(
                  'text-xs font-medium transition-colors hidden sm:block',
                  isCurrent ? 'text-[#1E64FF]' : 'text-slate-500'
                )}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">

        {currentStep === 1 && (
          <Step1_TypeSelection
            selectedType={insuranceType}
            onSelect={(type) => { setInsuranceType(type); nextStep(); }}
          />
        )}

        {currentStep === 2 && (
          <Step2_Details
            insuranceType={insuranceType}
            onNext={(data) => { setDetails(data); nextStep(); }}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && (
          <Step3_Scenario
            onNext={(scn: string) => { setScenario(scn); nextStep(); }}
            onBack={prevStep}
          />
        )}

        {currentStep === 4 && (
          <Step4_AIRecommendation
            formData={details}
            insuranceType={insuranceType}
            riskScore={details._riskScore ?? 75}
            estimatedMin={details._estimatedMin ?? 8000}
            estimatedMax={details._estimatedMax ?? 12000}
            onNext={(recommendation?: any) => {
              if (recommendation) setAiRecommendation(recommendation);
              nextStep();
            }}
            onBack={prevStep}
          />
        )}

        {currentStep === 5 && (
          <Step4_Results
            onNext={nextStep}
            onBack={prevStep}
            formData={details}
            insuranceType={insuranceType}
            riskScore={details._riskScore ?? 75}
            estimatedMin={details._estimatedMin ?? 8000}
            estimatedMax={details._estimatedMax ?? 12000}
            aiRecommendation={aiRecommendation}
          />
        )}

        {currentStep === 6 && (
          <Step6_Report
            onNext={() => navigate('/reports')}
            onBack={prevStep}
            formData={details}
            insuranceType={insuranceType}
            riskScore={details._riskScore ?? 75}
            estimatedMin={details._estimatedMin ?? 8000}
            estimatedMax={details._estimatedMax ?? 12000}
            aiRecommendation={aiRecommendation}
          />
        )}

      </div>
    </div>
  );
};