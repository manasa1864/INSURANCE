// Step 2 — the main data collection form, split into 4 sub-tabs:
//   Personal Profile → Type-specific Details → Preferences (sum insured + add-ons) → Review
//
// The risk engine runs on every keystroke (via useWatch) so the sidebar score
// updates in real time as the user fills things in.
// Each insurance type has its own required-fields list for tab-level validation.

import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ChevronLeft, ChevronRight, Info, X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { calculateInsuranceRisk } from '../../../../lib/engine/insuranceRiskEngine';
import { insuranceTerms } from '../../../../lib/data/insuranceTerms';

interface Step2Props {
  insuranceType: string;
  onNext: (data: any) => void;
  onBack: () => void;
}

const tabs = ['Personal Profile', 'Specific Details', 'Preferences', 'Review'];

const addOnsByType: Record<string, string[]> = {
  health:    ['Critical Illness Cover', 'Personal Accident Cover', 'Room Rent Waiver', 'Maternity Cover', 'OPD Cover', 'International Cover'],
  life:      ['Accidental Death Benefit', 'Waiver of Premium', 'Terminal Illness Rider', 'Disability Rider', 'Critical Illness Rider'],
  vehicle:   ['Zero Depreciation', 'Roadside Assistance', 'Engine Protection', 'Return to Invoice', 'Consumables Cover', 'Key Replacement'],
  travel:    ['Trip Cancellation', 'Baggage Loss Cover', 'Adventure Sports Cover', 'Emergency Medical Evacuation', 'Flight Delay Cover'],
  home:      ['Earthquake Cover', 'Flood Protection', 'Theft Cover', 'Temporary Living Expenses', 'Jewellery Cover'],
  business:  ['Business Interruption', 'Employee Liability', 'Cyber Risk Cover', 'Professional Indemnity', 'Fire & Burglary'],
  accident:  ['Hospital Cash Benefit', 'Fracture Cover', 'Burns Cover', 'Permanent Disability Cover', 'Education Benefit'],
  critical:  ['Second Medical Opinion', 'Home Care Treatment', 'Wellness Benefits', 'Income Replacement'],
  education: ['Waiver of Fee on Death', 'Disability Benefit', 'Scholarship on Critical Illness', 'Accidental Death Benefit'],
  crop:      ['Flood & Drought Cover', 'Pest & Disease Cover', 'Post-Harvest Loss', 'Livestock Cover'],
  gadget:    ['Accidental Damage', 'Liquid Damage', 'Theft Cover', 'Extended Warranty', 'Worldwide Cover'],
  pet:       ['Emergency Vet Cover', 'Dental Treatment', 'Alternative Therapy', 'Third Party Liability', 'Cremation Expenses'],
};

const termDefinitions = insuranceTerms;

const formatCurrency = (val: number) =>
  val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${(val / 1000).toFixed(0)}k`;

const inputCls = "w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E64FF] focus:border-[#1E64FF] outline-none bg-white text-sm";
const errorCls = "border-red-400 focus:ring-red-400";

const Field = ({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
  </div>
);

/* ══════════════════════════════════════════════════════════
   REQUIRED FIELDS PER TAB — used for validation
   ══════════════════════════════════════════════════════════ */
const requiredByTab: Record<string, Record<number, string[]>> = {
  health:    { 0: ['fullName','age','gender','mobile','pincode'], 1: ['height','weight','smoking'], 2: ['sumInsured'] },
  life:      { 0: ['fullName','age','gender','mobile','pincode'], 1: ['annualIncome','policyTerm','occupation','smokerLife','dependants','lifeGoal'], 2: ['sumInsured'] },
  vehicle:   { 0: ['fullName','age','gender','mobile','pincode'], 1: ['vehicleType','vehicleAge','fuelType','vehicleValue','regNumber','previousClaims','drivingYears','parkingType'], 2: ['sumInsured'] },
  travel:    { 0: ['fullName','age','gender','mobile','pincode'], 1: ['travelDestination','travellers','travelPurpose','travelDays','tripStart','tripEnd','medicalConditions'], 2: ['sumInsured'] },
  home:      { 0: ['fullName','age','gender','mobile','pincode'], 1: ['propertyType','propertyAge','builtupArea','constructionType','floodZone','propertyValue','ownershipType'], 2: ['sumInsured'] },
  business:  { 0: ['fullName','age','gender','mobile','pincode'], 1: ['businessType','employees','turnover','businessAge','businessLocation','previousClaims'], 2: ['sumInsured'] },
  accident:  { 0: ['fullName','age','gender','mobile','pincode'], 1: ['occupationType','motorcycle','existingDisability','adventureSports','travelFrequency'], 2: ['sumInsured'] },
  critical:  { 0: ['fullName','age','gender','mobile','pincode'], 1: ['familyHistory','currentHealth','exercise','smoking','bmi'], 2: ['sumInsured'] },
  education: { 0: ['fullName','age','gender','mobile','pincode'], 1: ['childAge','educationLevel','educationCost','yearsToEducation','childGender'], 2: ['sumInsured'] },
  crop:      { 0: ['fullName','age','gender','mobile','pincode'], 1: ['cropType','landArea','irrigationType','cropSeason','cropLocation','soilType'], 2: ['sumInsured'] },
  gadget:    { 0: ['fullName','age','gender','mobile','pincode'], 1: ['gadgetType','gadgetBrand','gadgetValue','gadgetAge','hasInvoice','usageType'], 2: ['sumInsured'] },
  pet:       { 0: ['fullName','age','gender','mobile','pincode'], 1: ['petType','petBreed','petAge','vaccinated','petHealth','neutered'], 2: ['sumInsured'] },
};

/* ══════════════════════════════════════════════════════════
   SPECIFIC DETAILS — detailed per type
   ══════════════════════════════════════════════════════════ */
const SpecificDetails = ({ insuranceType, register, watch, errors, control }: {
  insuranceType: string; register: any; watch: any; errors: any; control: any;
}) => {
  // useWatch inside this component so it re-renders when fields change
  const watched = useWatch({ control });
  const diseases = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Ailment', 'Kidney Disease', 'Cancer History', 'Others'];
  const e = (field: string) => errors[field]?.message;

  switch (insuranceType) {

    case 'health': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Height (cm)" required error={e('height')}>
            <input {...register('height', { required: 'Required', min: { value: 100, message: 'Enter valid height' }, max: { value: 250, message: 'Enter valid height' } })}
              type="number" className={clsx(inputCls, e('height') && errorCls)} placeholder="e.g. 170" />
          </Field>
          <Field label="Weight (kg)" required error={e('weight')}>
            <input {...register('weight', { required: 'Required', min: { value: 20, message: 'Enter valid weight' }, max: { value: 300, message: 'Enter valid weight' } })}
              type="number" className={clsx(inputCls, e('weight') && errorCls)} placeholder="e.g. 70" />
          </Field>
        </div>
        {watched['height'] && watched['weight'] && (
          <div className="bg-blue-50 rounded-xl p-3 text-sm">
            <span className="text-slate-600">Your BMI: </span>
            <strong className="text-[#1E64FF]">
              {(parseInt(watched['weight']) / ((parseInt(watched['height']) / 100) ** 2)).toFixed(1)}
            </strong>
            <span className="text-slate-500 text-xs ml-2">
              ({(() => {
                const bmi = parseInt(watched['weight']) / ((parseInt(watched['height']) / 100) ** 2);
                return bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal ✅' : bmi < 30 ? 'Overweight' : 'Obese';
              })()})
            </span>
          </div>
        )}
        <Field label="Blood Group">
          <select {...register('bloodGroup')} className={inputCls}>
            <option value="">Select (optional)</option>
            {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </Field>
        <Field label="Smoking / Tobacco use?" required error={e('smoking')}>
          <div className="grid grid-cols-3 gap-2">
            {['Never', 'Occasional', 'Regular'].map(opt => (
              <label key={opt} className={clsx('flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors text-sm',
                watched['smoking'] === opt ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF] font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <input {...register('smoking', { required: 'Required' })} type="radio" value={opt} className="hidden" />
                {opt}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Alcohol consumption?">
          <select {...register('alcohol')} className={inputCls}>
            <option value="never">Never</option>
            <option value="occasional">Occasionally (social)</option>
            <option value="moderate">Moderate (2–3x/week)</option>
            <option value="heavy">Heavy (daily)</option>
          </select>
        </Field>
        <Field label="Physical activity level?">
          <select {...register('activityLevel')} className={inputCls}>
            <option value="sedentary">Sedentary (desk job, no exercise)</option>
            <option value="light">Light (walk 30 min/day)</option>
            <option value="moderate">Moderate (gym 3x/week)</option>
            <option value="active">Very Active (daily intense workout)</option>
          </select>
        </Field>
        <Field label="Family medical history?">
          <select {...register('familyMedicalHistory')} className={inputCls}>
            <option value="none">No major illness in family</option>
            <option value="diabetes">Diabetes in family</option>
            <option value="heart">Heart disease in family</option>
            <option value="cancer">Cancer in family</option>
            <option value="multiple">Multiple conditions in family</option>
          </select>
        </Field>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register('preExisting')} type="checkbox" className="w-5 h-5 rounded border-slate-300" />
            <span className="font-medium text-slate-900">I have existing health conditions</span>
          </label>
          {watched['preExisting'] && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-3">Select all that apply:</p>
              <div className="grid grid-cols-2 gap-2">
                {diseases.map(d => (
                  <label key={d} className={clsx('flex items-center gap-2 text-sm p-2.5 rounded-lg cursor-pointer border transition-colors',
                    watched[`disease_${d}`] ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 text-slate-600 hover:bg-white')}>
                    <input {...register(`disease_${d}` as any)} type="checkbox" className="rounded text-[#1E64FF]" />
                    {d}
                  </label>
                ))}
              </div>
              <Field label="When were these diagnosed?" >
                <select {...register('diagnosedWhen')} className={clsx(inputCls, 'mt-2')}>
                  <option value="">Select</option>
                  <option value="recent">Less than 1 year ago</option>
                  <option value="1to3">1–3 years ago</option>
                  <option value="3to5">3–5 years ago</option>
                  <option value="5plus">More than 5 years ago</option>
                </select>
              </Field>
            </div>
          )}
        </div>
        <Field label="Any hospitalisations in the last 3 years?">
          <select {...register('recentHospitalisations')} className={inputCls}>
            <option value="none">None</option>
            <option value="once">Once</option>
            <option value="twice">Twice</option>
            <option value="multiple">3 or more times</option>
          </select>
        </Field>
        <Field label="Number of family members to cover?">
          <select {...register('familyMembers')} className={inputCls}>
            <option value="1">Just me (Individual)</option>
            <option value="2">Me + Spouse</option>
            <option value="3">Me + Spouse + 1 Child</option>
            <option value="4">Me + Spouse + 2 Children</option>
            <option value="family_plus_parents">Family + Parents</option>
          </select>
        </Field>
      </div>
    );

    case 'life': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Annual Income (₹)" required error={e('annualIncome')}>
            <input {...register('annualIncome', { required: 'Required', min: { value: 100000, message: 'Minimum ₹1L' } })}
              type="number" className={clsx(inputCls, e('annualIncome') && errorCls)} placeholder="e.g. 600000" />
          </Field>
          <Field label="Policy Term (years)" required error={e('policyTerm')}>
            <select {...register('policyTerm', { required: 'Required' })} className={clsx(inputCls, e('policyTerm') && errorCls)}>
              <option value="">Select</option>
              {[10,15,20,25,30,35,40].map(y => <option key={y} value={y}>{y} years</option>)}
            </select>
          </Field>
          <Field label="Occupation" required error={e('occupation')}>
            <select {...register('occupation', { required: 'Required' })} className={clsx(inputCls, e('occupation') && errorCls)}>
              <option value="">Select</option>
              <option value="salaried">Salaried (Private)</option>
              <option value="govt">Government Employee</option>
              <option value="selfemployed">Self-Employed Professional</option>
              <option value="business">Business Owner</option>
              <option value="freelancer">Freelancer</option>
              <option value="homemaker">Homemaker</option>
            </select>
          </Field>
          <Field label="Do you smoke?" required error={e('smokerLife')}>
            <select {...register('smokerLife', { required: 'Required' })} className={clsx(inputCls, e('smokerLife') && errorCls)}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
              <option value="quit">Quit (within 5 years)</option>
            </select>
          </Field>
          <Field label="Number of dependants" required error={e('dependants')}>
            <input {...register('dependants', { required: 'Required', min: { value: 0, message: 'Min 0' } })}
              type="number" min={0} max={10} className={clsx(inputCls, e('dependants') && errorCls)} placeholder="e.g. 2" />
          </Field>
          <Field label="Education Qualification">
            <select {...register('education')} className={inputCls}>
              <option value="">Select</option>
              <option value="below10">Below 10th</option>
              <option value="graduate">Graduate</option>
              <option value="postgrad">Post Graduate</option>
              <option value="professional">Professional Degree</option>
            </select>
          </Field>
        </div>
        <Field label="Primary goal for life insurance" required error={e('lifeGoal')}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 'family', label: '👨‍👩‍👧 Family Protection' },
              { val: 'loan', label: '🏠 Loan Coverage' },
              { val: 'retirement', label: '👴 Retirement Planning' },
              { val: 'wealth', label: '📈 Wealth Creation' },
            ].map(({ val, label }) => (
              <label key={val} className={clsx('flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm transition-colors',
                watched['lifeGoal'] === val ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('lifeGoal', { required: 'Required' })} type="radio" value={val} className="hidden" />
                {label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Existing life insurance policies?">
          <select {...register('existingLifePolicies')} className={inputCls}>
            <option value="none">None</option>
            <option value="one">1 policy</option>
            <option value="two">2 policies</option>
            <option value="multiple">3 or more</option>
          </select>
        </Field>
        <Field label="Outstanding loans/liabilities?">
          <select {...register('outstandingLoans')} className={inputCls}>
            <option value="none">No loans</option>
            <option value="home">Home loan</option>
            <option value="car">Car/Vehicle loan</option>
            <option value="multiple">Multiple loans</option>
          </select>
        </Field>
        <Field label="Preferred payout type?">
          <select {...register('payoutType')} className={inputCls}>
            <option value="lumpsum">Lump Sum to nominee</option>
            <option value="monthly">Monthly income to family</option>
            <option value="both">Both (partial lump sum + monthly)</option>
          </select>
        </Field>
      </div>
    );

    case 'vehicle': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vehicle Type" required error={e('vehicleType')}>
            <select {...register('vehicleType', { required: 'Required' })} className={clsx(inputCls, e('vehicleType') && errorCls)}>
              <option value="">Select</option>
              <option value="car">Car (4-Wheeler)</option>
              <option value="bike">Two-Wheeler</option>
              <option value="ev">Electric Vehicle</option>
              <option value="suv">SUV / MUV</option>
              <option value="commercial">Commercial Vehicle</option>
            </select>
          </Field>
          <Field label="Vehicle Age (years)" required error={e('vehicleAge')}>
            <input {...register('vehicleAge', { required: 'Required', min: 0, max: 25 })}
              type="number" min={0} max={25} className={clsx(inputCls, e('vehicleAge') && errorCls)} placeholder="e.g. 3" />
          </Field>
          <Field label="Fuel Type" required error={e('fuelType')}>
            <select {...register('fuelType', { required: 'Required' })} className={clsx(inputCls, e('fuelType') && errorCls)}>
              <option value="">Select</option>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="cng">CNG / LPG</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
          <Field label="Vehicle Value (₹)" required error={e('vehicleValue')}>
            <input {...register('vehicleValue', { required: 'Required', min: { value: 10000, message: 'Enter valid value' } })}
              type="number" className={clsx(inputCls, e('vehicleValue') && errorCls)} placeholder="e.g. 800000" />
          </Field>
          <Field label="Vehicle Make/Brand">
            <input {...register('vehicleBrand')} className={inputCls} placeholder="e.g. Maruti, Hyundai, Honda" />
          </Field>
          <Field label="Vehicle Model">
            <input {...register('vehicleModel')} className={inputCls} placeholder="e.g. Swift, i20, Activa" />
          </Field>
        </div>
        <Field label="Registration Number" required error={e('regNumber')}>
          <input {...register('regNumber', { required: 'Required' })}
            className={clsx(inputCls, e('regNumber') && errorCls)} placeholder="e.g. MH 01 AB 1234" />
        </Field>
        <Field label="Any claims in last 3 years?" required error={e('previousClaims')}>
          <div className="grid grid-cols-3 gap-2">
            {[{v:'no',l:'No Claims ✅'},{v:'one',l:'1 Claim'},{v:'multiple',l:'2+ Claims'}].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center justify-center p-3 border rounded-xl cursor-pointer text-sm',
                watched['previousClaims'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('previousClaims', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Years of driving experience" required error={e('drivingYears')}>
            <select {...register('drivingYears', { required: 'Required' })} className={clsx(inputCls, e('drivingYears') && errorCls)}>
              <option value="">Select</option>
              <option value="less1">Less than 1 year</option>
              <option value="1to3">1–3 years</option>
              <option value="3to7">3–7 years</option>
              <option value="7plus">7+ years</option>
            </select>
          </Field>
          <Field label="Where is vehicle parked?" required error={e('parkingType')}>
            <select {...register('parkingType', { required: 'Required' })} className={clsx(inputCls, e('parkingType') && errorCls)}>
              <option value="">Select</option>
              <option value="garage">Covered Garage</option>
              <option value="society">Society Parking</option>
              <option value="roadside">Open / Roadside</option>
            </select>
          </Field>
        </div>
        <Field label="Primary use of vehicle?">
          <select {...register('vehicleUse')} className={inputCls}>
            <option value="personal">Personal use only</option>
            <option value="commute">Daily office commute</option>
            <option value="outstation">Frequent outstation travel</option>
            <option value="commercial">Commercial / rental use</option>
          </select>
        </Field>
        <Field label="City type?">
          <select {...register('cityType')} className={inputCls}>
            <option value="metro">Metro city (Mumbai, Delhi, Bengaluru)</option>
            <option value="tier2">Tier 2 city</option>
            <option value="rural">Rural / small town</option>
          </select>
        </Field>
      </div>
    );

    case 'travel': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Destination" required error={e('travelDestination')}>
            <select {...register('travelDestination', { required: 'Required' })} className={clsx(inputCls, e('travelDestination') && errorCls)}>
              <option value="">Select</option>
              <option value="domestic">Within India</option>
              <option value="saarc">SAARC Countries (Nepal, Sri Lanka)</option>
              <option value="asia">Asia (Thailand, Singapore, UAE)</option>
              <option value="international">International (non-Schengen)</option>
              <option value="schengen">Schengen / Europe</option>
              <option value="usa">USA / Canada</option>
            </select>
          </Field>
          <Field label="Number of Travellers" required error={e('travellers')}>
            <input {...register('travellers', { required: 'Required', min: 1 })}
              type="number" min={1} className={clsx(inputCls, e('travellers') && errorCls)} placeholder="e.g. 2" />
          </Field>
          <Field label="Trip Start Date" required error={e('tripStart')}>
            <input {...register('tripStart', { required: 'Required' })} type="date"
              className={clsx(inputCls, e('tripStart') && errorCls)} min={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label="Trip End Date" required error={e('tripEnd')}>
            <input {...register('tripEnd', { required: 'Required' })} type="date"
              className={clsx(inputCls, e('tripEnd') && errorCls)} />
          </Field>
        </div>
        <Field label="Purpose of Travel" required error={e('travelPurpose')}>
          <div className="grid grid-cols-2 gap-2">
            {[
              {v:'leisure', l:'🏖️ Leisure / Holiday'},
              {v:'business', l:'💼 Business Trip'},
              {v:'education', l:'🎓 Study Abroad'},
              {v:'medical', l:'🏥 Medical Treatment'},
            ].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm',
                watched['travelPurpose'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('travelPurpose', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Trip duration (days)" required error={e('travelDays')}>
          <input {...register('travelDays', { required: 'Required', min: 1 })}
            type="number" min={1} className={clsx(inputCls, e('travelDays') && errorCls)} placeholder="e.g. 14" />
        </Field>
        <Field label="Do you have any medical conditions?" required error={e('medicalConditions')}>
          <select {...register('medicalConditions', { required: 'Required' })} className={clsx(inputCls, e('medicalConditions') && errorCls)}>
            <option value="none">No medical conditions</option>
            <option value="controlled">Controlled chronic condition (diabetes, BP)</option>
            <option value="recent_surgery">Recent surgery (within 6 months)</option>
            <option value="serious">Serious ongoing medical treatment</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Have you travelled abroad before?">
            <select {...register('travelExperience')} className={inputCls}>
              <option value="frequent">Yes, frequently</option>
              <option value="some">Yes, a few times</option>
              <option value="never">First time</option>
            </select>
          </Field>
          <Field label="Planned activities?">
            <select {...register('activities')} className={inputCls}>
              <option value="leisure">Sightseeing / relaxing</option>
              <option value="moderate">Hiking / cycling</option>
              <option value="adventure">Adventure sports</option>
              <option value="extreme">Extreme sports (skydiving, scuba)</option>
            </select>
          </Field>
        </div>
        <Field label="Visa type (if international)?">
          <select {...register('visaType')} className={inputCls}>
            <option value="tourist">Tourist Visa</option>
            <option value="business">Business Visa</option>
            <option value="student">Student Visa</option>
            <option value="medical">Medical Visa</option>
            <option value="na">Not applicable (domestic)</option>
          </select>
        </Field>
      </div>
    );

    case 'home': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Property Type" required error={e('propertyType')}>
            <select {...register('propertyType', { required: 'Required' })} className={clsx(inputCls, e('propertyType') && errorCls)}>
              <option value="">Select</option>
              <option value="apartment">Apartment / Flat</option>
              <option value="independent">Independent House</option>
              <option value="villa">Villa / Bungalow</option>
              <option value="rowhouse">Row House / Townhouse</option>
            </select>
          </Field>
          <Field label="Ownership Type" required error={e('ownershipType')}>
            <select {...register('ownershipType', { required: 'Required' })} className={clsx(inputCls, e('ownershipType') && errorCls)}>
              <option value="">Select</option>
              <option value="selfowned">Self-Owned</option>
              <option value="mortgage">Under Home Loan</option>
              <option value="rented">Rented (Tenant)</option>
            </select>
          </Field>
          <Field label="Property Age (years)" required error={e('propertyAge')}>
            <input {...register('propertyAge', { required: 'Required', min: 0 })}
              type="number" min={0} className={clsx(inputCls, e('propertyAge') && errorCls)} placeholder="e.g. 5" />
          </Field>
          <Field label="Built-up Area (sq ft)" required error={e('builtupArea')}>
            <input {...register('builtupArea', { required: 'Required', min: 100 })}
              type="number" className={clsx(inputCls, e('builtupArea') && errorCls)} placeholder="e.g. 1200" />
          </Field>
          <Field label="Construction Type" required error={e('constructionType')}>
            <select {...register('constructionType', { required: 'Required' })} className={clsx(inputCls, e('constructionType') && errorCls)}>
              <option value="">Select</option>
              <option value="rcc">RCC / Pucca (Concrete)</option>
              <option value="old">Old / Load-bearing brick</option>
              <option value="wooden">Wooden structure</option>
              <option value="prefab">Pre-fabricated</option>
            </select>
          </Field>
          <Field label="Property Value (₹)" required error={e('propertyValue')}>
            <input {...register('propertyValue', { required: 'Required', min: 100000 })}
              type="number" className={clsx(inputCls, e('propertyValue') && errorCls)} placeholder="e.g. 5000000" />
          </Field>
        </div>
        <Field label="Is property in flood-prone zone?" required error={e('floodZone')}>
          <div className="grid grid-cols-3 gap-2">
            {[{v:'no',l:'No ✅'},{v:'partial',l:'Partially'},{v:'yes',l:'Yes ⚠️'}].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center justify-center p-3 border rounded-xl cursor-pointer text-sm',
                watched['floodZone'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('floodZone', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Is property in earthquake zone?">
            <select {...register('earthquakeZone')} className={inputCls}>
              <option value="low">Low risk zone</option>
              <option value="medium">Medium risk zone</option>
              <option value="high">High seismic zone (Zone 4/5)</option>
            </select>
          </Field>
          <Field label="Security system installed?">
            <select {...register('securitySystem')} className={inputCls}>
              <option value="none">No security system</option>
              <option value="cctv">CCTV only</option>
              <option value="alarm">Burglar alarm</option>
              <option value="full">Full security (guard + CCTV + alarm)</option>
            </select>
          </Field>
        </div>
        <Field label="Contents value (furniture, electronics, jewellery) ₹">
          <input {...register('contentsValue')} type="number" className={inputCls} placeholder="e.g. 500000" />
        </Field>
        <Field label="Number of floors in the building?">
          <select {...register('buildingFloors')} className={inputCls}>
            <option value="1">Ground floor / Single storey</option>
            <option value="low">Low rise (2–5 floors)</option>
            <option value="mid">Mid rise (6–15 floors)</option>
            <option value="high">High rise (16+ floors)</option>
          </select>
        </Field>
      </div>
    );

    case 'business': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business Type" required error={e('businessType')}>
            <select {...register('businessType', { required: 'Required' })} className={clsx(inputCls, e('businessType') && errorCls)}>
              <option value="">Select</option>
              <option value="retail">Retail / Shop</option>
              <option value="manufacturing">Manufacturing / Factory</option>
              <option value="it">IT / Software / SaaS</option>
              <option value="restaurant">Restaurant / Food & Beverage</option>
              <option value="healthcare">Healthcare / Clinic</option>
              <option value="education">Education / Coaching</option>
              <option value="logistics">Logistics / Warehouse</option>
              <option value="other">Other Services</option>
            </select>
          </Field>
          <Field label="Business Structure">
            <select {...register('businessStructure')} className={inputCls}>
              <option value="proprietorship">Sole Proprietorship</option>
              <option value="partnership">Partnership</option>
              <option value="pvtltd">Private Limited Company</option>
              <option value="llp">LLP</option>
            </select>
          </Field>
          <Field label="Number of Employees" required error={e('employees')}>
            <input {...register('employees', { required: 'Required', min: 1 })}
              type="number" min={1} className={clsx(inputCls, e('employees') && errorCls)} placeholder="e.g. 10" />
          </Field>
          <Field label="Annual Turnover (₹)" required error={e('turnover')}>
            <input {...register('turnover', { required: 'Required', min: 1 })}
              type="number" className={clsx(inputCls, e('turnover') && errorCls)} placeholder="e.g. 5000000" />
          </Field>
          <Field label="Business Age (years)" required error={e('businessAge')}>
            <input {...register('businessAge', { required: 'Required', min: 0 })}
              type="number" min={0} className={clsx(inputCls, e('businessAge') && errorCls)} placeholder="e.g. 3" />
          </Field>
          <Field label="Stock / Inventory Value (₹)">
            <input {...register('stockValue')} type="number" className={inputCls} placeholder="e.g. 1000000" />
          </Field>
        </div>
        <Field label="Business Location" required error={e('businessLocation')}>
          <select {...register('businessLocation', { required: 'Required' })} className={clsx(inputCls, e('businessLocation') && errorCls)}>
            <option value="">Select</option>
            <option value="owned">Owned premises</option>
            <option value="rented">Rented / leased premises</option>
            <option value="home">Home-based</option>
            <option value="cowork">Co-working space</option>
          </select>
        </Field>
        <Field label="Any previous insurance claims?" required error={e('previousClaims')}>
          <select {...register('previousClaims', { required: 'Required' })} className={clsx(inputCls, e('previousClaims') && errorCls)}>
            <option value="no">No claims ever</option>
            <option value="once">Once in last 3 years</option>
            <option value="multiple">Multiple claims</option>
          </select>
        </Field>
        <Field label="Primary risk concern?">
          <div className="grid grid-cols-2 gap-2">
            {[
              {v:'fire',l:'🔥 Fire / Natural Disaster'},
              {v:'theft',l:'🔒 Theft / Burglary'},
              {v:'liability',l:'⚖️ Third-party Liability'},
              {v:'cyber',l:'💻 Cyber Attack / Data Breach'},
            ].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm',
                watched['riskConcern'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('riskConcern')} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
      </div>
    );

    case 'accident': return (
      <div className="space-y-5">
        <Field label="Occupation Type" required error={e('occupationType')}>
          <div className="grid grid-cols-2 gap-2">
            {[
              {v:'desk', l:'💻 Desk / Office Job'},
              {v:'fieldwork', l:'🚗 Field Work / Sales'},
              {v:'manual', l:'🔧 Manual / Labour'},
              {v:'hazardous', l:'⚠️ Hazardous Industry'},
            ].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm',
                watched['occupationType'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('occupationType', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Do you ride a motorcycle?" required error={e('motorcycle')}>
            <select {...register('motorcycle', { required: 'Required' })} className={clsx(inputCls, e('motorcycle') && errorCls)}>
              <option value="no">No</option>
              <option value="occasionally">Occasionally</option>
              <option value="daily">Daily commute</option>
            </select>
          </Field>
          <Field label="How frequently do you travel?" required error={e('travelFrequency')}>
            <select {...register('travelFrequency', { required: 'Required' })} className={clsx(inputCls, e('travelFrequency') && errorCls)}>
              <option value="">Select</option>
              <option value="rarely">Rarely (local only)</option>
              <option value="monthly">Monthly outstation</option>
              <option value="weekly">Weekly travel</option>
              <option value="frequent">Frequent flyer</option>
            </select>
          </Field>
        </div>
        <Field label="Any existing disabilities?" required error={e('existingDisability')}>
          <select {...register('existingDisability', { required: 'Required' })} className={clsx(inputCls, e('existingDisability') && errorCls)}>
            <option value="no">No</option>
            <option value="partial">Partial disability</option>
            <option value="yes">Yes, significant disability</option>
          </select>
        </Field>
        <Field label="Adventure sports / hobbies?" required error={e('adventureSports')}>
          <select {...register('adventureSports', { required: 'Required' })} className={clsx(inputCls, e('adventureSports') && errorCls)}>
            <option value="none">None — standard hobbies only</option>
            <option value="mild">Mild (trekking, cycling, swimming)</option>
            <option value="moderate">Moderate (rock climbing, paragliding)</option>
            <option value="extreme">Extreme (skydiving, bungee, racing)</option>
          </select>
        </Field>
        <Field label="Number of dependants relying on your income?">
          <input {...register('dependantsAccident')} type="number" min={0} className={inputCls} placeholder="e.g. 2" />
        </Field>
        <Field label="Monthly income (₹)?">
          <input {...register('monthlyIncome')} type="number" className={inputCls} placeholder="e.g. 50000" />
        </Field>
      </div>
    );

    case 'critical': return (
      <div className="space-y-5">
        <Field label="Family history of critical illness?" required error={e('familyHistory')}>
          <select {...register('familyHistory', { required: 'Required' })} className={clsx(inputCls, e('familyHistory') && errorCls)}>
            <option value="no">No critical illness in family</option>
            <option value="distant">Distant relatives (grandparents)</option>
            <option value="parent">Parent diagnosed</option>
            <option value="sibling">Sibling diagnosed</option>
            <option value="multiple">Multiple family members</option>
          </select>
        </Field>
        {watched['familyHistory'] !== 'no' && (
          <Field label="Which condition?">
            <select {...register('familyCondition')} className={inputCls}>
              <option value="">Select condition</option>
              <option value="cancer">Cancer</option>
              <option value="heart">Heart Disease / Heart Attack</option>
              <option value="kidney">Kidney Failure</option>
              <option value="stroke">Stroke / Brain disorder</option>
              <option value="liver">Liver disease</option>
            </select>
          </Field>
        )}
        <Field label="Current health status?" required error={e('currentHealth')}>
          <div className="grid grid-cols-2 gap-2">
            {[
              {v:'excellent', l:'💪 Excellent — no issues'},
              {v:'good', l:'✅ Good — minor issues'},
              {v:'average', l:'⚠️ Average — managed conditions'},
              {v:'poor', l:'🔴 Poor — ongoing treatment'},
            ].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm',
                watched['currentHealth'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('currentHealth', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Do you exercise?" required error={e('exercise')}>
            <select {...register('exercise', { required: 'Required' })} className={clsx(inputCls, e('exercise') && errorCls)}>
              <option value="daily">Daily (30+ mins)</option>
              <option value="weekly">3–4 times/week</option>
              <option value="rarely">Rarely</option>
              <option value="never">Never</option>
            </select>
          </Field>
          <Field label="Smoking status?" required error={e('smoking')}>
            <select {...register('smoking', { required: 'Required' })} className={clsx(inputCls, e('smoking') && errorCls)}>
              <option value="Never">Never smoked</option>
              <option value="Occasional">Occasional smoker</option>
              <option value="Regular">Regular smoker</option>
              <option value="quit">Ex-smoker (quit)</option>
            </select>
          </Field>
        </div>
        <Field label="Your approximate BMI?" required error={e('bmi')}>
          <select {...register('bmi', { required: 'Required' })} className={clsx(inputCls, e('bmi') && errorCls)}>
            <option value="">Select</option>
            <option value="underweight">Underweight (below 18.5)</option>
            <option value="normal">Normal (18.5–24.9)</option>
            <option value="overweight">Overweight (25–29.9)</option>
            <option value="obese">Obese (30+)</option>
          </select>
        </Field>
        <Field label="Do you consume alcohol?">
          <select {...register('alcoholCritical')} className={inputCls}>
            <option value="never">Never</option>
            <option value="social">Social / occasional</option>
            <option value="moderate">Moderate</option>
            <option value="heavy">Heavy / daily</option>
          </select>
        </Field>
        <Field label="Last full health check-up?">
          <select {...register('lastCheckup')} className={inputCls}>
            <option value="recent">Within 6 months</option>
            <option value="year">Within last year</option>
            <option value="2years">1–2 years ago</option>
            <option value="never">Never had one</option>
          </select>
        </Field>
      </div>
    );

    case 'education': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Child's Current Age" required error={e('childAge')}>
            <input {...register('childAge', { required: 'Required', min: 0, max: 18 })}
              type="number" min={0} max={18} className={clsx(inputCls, e('childAge') && errorCls)} placeholder="e.g. 5" />
          </Field>
          <Field label="Child's Gender" required error={e('childGender')}>
            <select {...register('childGender', { required: 'Required' })} className={clsx(inputCls, e('childGender') && errorCls)}>
              <option value="">Select</option>
              <option value="boy">Boy</option>
              <option value="girl">Girl</option>
            </select>
          </Field>
        </div>
        <Field label="Target Education Level" required error={e('educationLevel')}>
          <div className="grid grid-cols-2 gap-2">
            {[
              {v:'graduation', l:'🎓 Graduation (UG)'},
              {v:'postgrad', l:'📚 Post-Graduation'},
              {v:'professional', l:'⚕️ Professional (MBBS/MBA)'},
              {v:'abroad', l:'✈️ Study Abroad'},
            ].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm',
                watched['educationLevel'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('educationLevel', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Estimated Education Cost (₹)" required error={e('educationCost')}>
          <input {...register('educationCost', { required: 'Required', min: 50000 })}
            type="number" className={clsx(inputCls, e('educationCost') && errorCls)} placeholder="e.g. 2000000" />
        </Field>
        <Field label="Years until education begins" required error={e('yearsToEducation')}>
          <input {...register('yearsToEducation', { required: 'Required', min: 1, max: 20 })}
            type="number" min={1} max={20} className={clsx(inputCls, e('yearsToEducation') && errorCls)} placeholder="e.g. 10" />
        </Field>
        <Field label="Preferred institution type?">
          <select {...register('institutionType')} className={inputCls}>
            <option value="govt">Government college (IIT/NIT/AIIMS)</option>
            <option value="private">Private college in India</option>
            <option value="abroad">Foreign university</option>
            <option value="unsure">Not decided yet</option>
          </select>
        </Field>
        <Field label="Your current savings for education?">
          <select {...register('currentSavings')} className={inputCls}>
            <option value="none">No savings yet</option>
            <option value="small">Less than 20% of target</option>
            <option value="partial">20–50% of target saved</option>
            <option value="half">More than 50% saved</option>
          </select>
        </Field>
      </div>
    );

    case 'crop': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Crop Type" required error={e('cropType')}>
            <select {...register('cropType', { required: 'Required' })} className={clsx(inputCls, e('cropType') && errorCls)}>
              <option value="">Select</option>
              <option value="rice">Rice / Paddy</option>
              <option value="wheat">Wheat</option>
              <option value="cotton">Cotton</option>
              <option value="sugarcane">Sugarcane</option>
              <option value="maize">Maize / Corn</option>
              <option value="vegetables">Vegetables</option>
              <option value="fruits">Fruits / Orchards</option>
              <option value="pulses">Pulses / Lentils</option>
            </select>
          </Field>
          <Field label="Land Area (acres)" required error={e('landArea')}>
            <input {...register('landArea', { required: 'Required', min: 0.1 })}
              type="number" min={0.1} step={0.1} className={clsx(inputCls, e('landArea') && errorCls)} placeholder="e.g. 2.5" />
          </Field>
          <Field label="Irrigation Type" required error={e('irrigationType')}>
            <select {...register('irrigationType', { required: 'Required' })} className={clsx(inputCls, e('irrigationType') && errorCls)}>
              <option value="">Select</option>
              <option value="irrigated">Fully Irrigated (bore well / canal)</option>
              <option value="partial">Partially Irrigated</option>
              <option value="rainfed">Rain-fed Only</option>
            </select>
          </Field>
          <Field label="Season" required error={e('cropSeason')}>
            <select {...register('cropSeason', { required: 'Required' })} className={clsx(inputCls, e('cropSeason') && errorCls)}>
              <option value="">Select</option>
              <option value="kharif">Kharif (Jun–Nov)</option>
              <option value="rabi">Rabi (Nov–Apr)</option>
              <option value="zaid">Zaid (Mar–Jun)</option>
            </select>
          </Field>
        </div>
        <Field label="State / District" required error={e('cropLocation')}>
          <input {...register('cropLocation', { required: 'Required' })}
            className={clsx(inputCls, e('cropLocation') && errorCls)} placeholder="e.g. Nashik, Maharashtra" />
        </Field>
        <Field label="Soil Type" required error={e('soilType')}>
          <select {...register('soilType', { required: 'Required' })} className={clsx(inputCls, e('soilType') && errorCls)}>
            <option value="">Select</option>
            <option value="black">Black cotton soil (Regur)</option>
            <option value="red">Red / laterite soil</option>
            <option value="alluvial">Alluvial soil</option>
            <option value="sandy">Sandy / loamy soil</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Previous crop loss in last 3 years?">
            <select {...register('previousCropLoss')} className={inputCls}>
              <option value="no">No loss</option>
              <option value="once">Once (partial)</option>
              <option value="multiple">Multiple times</option>
            </select>
          </Field>
          <Field label="Do you have a KCC loan?">
            <select {...register('kccLoan')} className={inputCls}>
              <option value="yes">Yes (Kisan Credit Card)</option>
              <option value="no">No</option>
            </select>
          </Field>
        </div>
        <Field label="Estimated crop value this season (₹)">
          <input {...register('cropValue')} type="number" className={inputCls} placeholder="e.g. 200000" />
        </Field>
      </div>
    );

    case 'gadget': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Gadget Type" required error={e('gadgetType')}>
            <select {...register('gadgetType', { required: 'Required' })} className={clsx(inputCls, e('gadgetType') && errorCls)}>
              <option value="">Select</option>
              <option value="smartphone">Smartphone</option>
              <option value="laptop">Laptop / MacBook</option>
              <option value="tablet">Tablet / iPad</option>
              <option value="camera">DSLR / Camera</option>
              <option value="smartwatch">Smartwatch</option>
              <option value="earbuds">Earbuds / Headphones</option>
            </select>
          </Field>
          <Field label="Brand" required error={e('gadgetBrand')}>
            <input {...register('gadgetBrand', { required: 'Required' })}
              className={clsx(inputCls, e('gadgetBrand') && errorCls)} placeholder="e.g. Apple, Samsung, Dell" />
          </Field>
          <Field label="Model Name">
            <input {...register('gadgetModel')} className={inputCls} placeholder="e.g. iPhone 15, Galaxy S24" />
          </Field>
          <Field label="Purchase Value (₹)" required error={e('gadgetValue')}>
            <input {...register('gadgetValue', { required: 'Required', min: 1000 })}
              type="number" className={clsx(inputCls, e('gadgetValue') && errorCls)} placeholder="e.g. 80000" />
          </Field>
          <Field label="Age of Gadget (years)" required error={e('gadgetAge')}>
            <input {...register('gadgetAge', { required: 'Required', min: 0, max: 5 })}
              type="number" min={0} step={0.5} className={clsx(inputCls, e('gadgetAge') && errorCls)} placeholder="e.g. 0.5" />
          </Field>
          <Field label="Purchase Date">
            <input {...register('gadgetPurchaseDate')} type="date" className={inputCls} />
          </Field>
        </div>
        <Field label="Do you have original purchase invoice?" required error={e('hasInvoice')}>
          <div className="grid grid-cols-2 gap-2">
            {[{v:'yes',l:'✅ Yes, I have invoice'},{v:'no',l:'❌ No invoice'}].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center justify-center p-3 border rounded-xl cursor-pointer text-sm',
                watched['hasInvoice'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('hasInvoice', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="How do you primarily use the gadget?" required error={e('usageType')}>
          <select {...register('usageType', { required: 'Required' })} className={clsx(inputCls, e('usageType') && errorCls)}>
            <option value="">Select</option>
            <option value="personal">Personal use at home</option>
            <option value="office">Office / work use</option>
            <option value="travel">Frequent travel / outdoor use</option>
            <option value="creative">Creative professional (photography, video)</option>
          </select>
        </Field>
        <Field label="Is the gadget under manufacturer warranty?">
          <select {...register('warrantyStatus')} className={inputCls}>
            <option value="yes">Yes, under warranty</option>
            <option value="expired">Warranty expired</option>
            <option value="extended">Extended warranty purchased</option>
          </select>
        </Field>
      </div>
    );

    case 'pet': return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Pet Type" required error={e('petType')}>
            <select {...register('petType', { required: 'Required' })} className={clsx(inputCls, e('petType') && errorCls)}>
              <option value="">Select</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="bird">Bird</option>
              <option value="rabbit">Rabbit</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Pet Breed" required error={e('petBreed')}>
            <input {...register('petBreed', { required: 'Required' })}
              className={clsx(inputCls, e('petBreed') && errorCls)} placeholder="e.g. Labrador, Persian, Indie" />
          </Field>
          <Field label="Pet Age (years)" required error={e('petAge')}>
            <input {...register('petAge', { required: 'Required', min: 0, max: 25 })}
              type="number" min={0} step={0.5} className={clsx(inputCls, e('petAge') && errorCls)} placeholder="e.g. 2" />
          </Field>
          <Field label="Pet Gender">
            <select {...register('petGender')} className={inputCls}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
        </div>
        <Field label="Vaccination status?" required error={e('vaccinated')}>
          <div className="grid grid-cols-3 gap-2">
            {[
              {v:'yes', l:'✅ Fully vaccinated'},
              {v:'partial', l:'⚠️ Partially'},
              {v:'no', l:'❌ Not vaccinated'},
            ].map(({v,l}) => (
              <label key={v} className={clsx('flex items-center justify-center p-3 border rounded-xl cursor-pointer text-sm text-center',
                watched['vaccinated'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                <input {...register('vaccinated', { required: 'Required' })} type="radio" value={v} className="hidden" />{l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Current health status?" required error={e('petHealth')}>
          <select {...register('petHealth', { required: 'Required' })} className={clsx(inputCls, e('petHealth') && errorCls)}>
            <option value="healthy">Perfectly healthy — no issues</option>
            <option value="minor">Minor conditions (allergies, skin issues)</option>
            <option value="chronic">Chronic illness (diabetes, joint issues)</option>
          </select>
        </Field>
        <Field label="Is the pet neutered/spayed?" required error={e('neutered')}>
          <select {...register('neutered', { required: 'Required' })} className={clsx(inputCls, e('neutered') && errorCls)}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="na">Not applicable</option>
          </select>
        </Field>
        <Field label="Vet visit frequency?">
          <select {...register('vetFrequency')} className={inputCls}>
            <option value="regular">Regular (every 6 months)</option>
            <option value="annual">Annual checkup only</option>
            <option value="rarely">Only when sick</option>
          </select>
        </Field>
        <Field label="Does the pet go outdoors frequently?">
          <select {...register('outdoorPet')} className={inputCls}>
            <option value="indoor">Mostly indoors</option>
            <option value="supervised">Outdoors with supervision</option>
            <option value="free">Freely roams outdoors</option>
          </select>
        </Field>
      </div>
    );

    default:
      return <div className="text-slate-400 text-center p-8">Select an insurance type first.</div>;
  }
};

/* ══════════════════════════════════════════════════════════
   TERM MODAL
   ══════════════════════════════════════════════════════════ */
const TermModal = ({ term, onClose }: { term: string; onClose: () => void }) => {
  const def = termDefinitions[term];
  if (!def) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full z-10" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        <h3 className="font-bold text-slate-900 text-lg mb-3">{def.title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">{def.plain}</p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-blue-700 text-xs leading-relaxed">{def.example}</p>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export const Step2_Details: React.FC<Step2Props> = ({ insuranceType, onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);

  const { register, handleSubmit, watch, control, formState: { errors }, trigger } = useForm<any>({
    defaultValues: { sumInsured: 500000, smoking: 'Never', preExisting: false, previousClaims: 'no' },
    mode: 'onChange',
  });

  // useWatch subscribes to ALL field changes and triggers re-render
  // This ensures the risk sidebar updates in real time as user fills the form
  const formData = useWatch({ control });
  const risk = calculateInsuranceRisk(formData, insuranceType);
  const addOns = addOnsByType[insuranceType] || addOnsByType['health'];
  const required = requiredByTab[insuranceType] || requiredByTab['health'];

  const handleTabChange = async (targetTab: number) => {
    if (targetTab <= activeTab) { setActiveTab(targetTab); setTabError(null); return; }
    const fieldsToValidate = required[activeTab] || [];
    const valid = await trigger(fieldsToValidate as any);
    if (valid) { setActiveTab(targetTab); setTabError(null); }
    else setTabError('Please fill in all required fields (*) before continuing.');
  };

  const onSubmit = async (data: any) => {
    const fieldsToValidate = required[activeTab] || [];
    const valid = await trigger(fieldsToValidate as any);
    if (!valid) { setTabError('Please fill in all required fields (*) before continuing.'); return; }
    if (activeTab < tabs.length - 1) { setActiveTab(activeTab + 1); setTabError(null); }
    else onNext({ ...data, _riskScore: risk.score, _estimatedMin: risk.estimatedMin, _estimatedMax: risk.estimatedMax });
  };

  const riskColor =
    risk.riskLevel === 'Very High' ? 'bg-red-100 text-red-800' :
    risk.riskLevel === 'High'      ? 'bg-red-100 text-red-700' :
    risk.riskLevel === 'Moderate'  ? 'bg-amber-100 text-amber-700' :
    risk.riskLevel === 'Low'       ? 'bg-green-100 text-green-700' :
                                     'bg-emerald-100 text-emerald-700';

  return (
    <div className="max-w-4xl mx-auto">
      {activeTerm && <TermModal term={activeTerm} onClose={() => setActiveTerm(null)} />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button key={tab} type="button" onClick={() => handleTabChange(idx)}
            className={clsx('px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
              activeTab === idx ? 'border-[#1E64FF] text-[#1E64FF]' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            <span className="mr-2 bg-slate-100 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">{idx + 1}</span>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Error Banner */}
      {tabError && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /> {tabError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Form */}
        <div className="lg:col-span-2">
          <form id="details-form" onSubmit={handleSubmit(onSubmit)}>

            {/* Tab 0 — Personal Profile */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Personal Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Full Name" required error={errors.fullName?.message as string}>
                      <input {...register('fullName', { required: 'Full name is required' })}
                        className={clsx(inputCls, errors.fullName && errorCls)} placeholder="As per ID proof" />
                    </Field>
                  </div>
                  <Field label="Age" required error={errors.age?.message as string}>
                    <input {...register('age', { required: 'Age is required', min: { value: 1, message: 'Invalid age' }, max: { value: 100, message: 'Invalid age' } })}
                      type="number" min={1} max={100} className={clsx(inputCls, errors.age && errorCls)} />
                  </Field>
                  <Field label="Gender" required error={errors.gender?.message as string}>
                    <select {...register('gender', { required: 'Gender is required' })} className={clsx(inputCls, errors.gender && errorCls)}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other / Prefer not to say</option>
                    </select>
                  </Field>
                  <Field label="Mobile Number" required error={errors.mobile?.message as string}>
                    <input {...register('mobile', { required: 'Mobile is required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile' } })}
                      type="tel" className={clsx(inputCls, errors.mobile && errorCls)} placeholder="10-digit mobile number" />
                  </Field>
                  <Field label="PIN Code" required error={errors.pincode?.message as string}>
                    <input {...register('pincode', { required: 'PIN code is required', pattern: { value: /^\d{6}$/, message: 'Enter valid 6-digit PIN code' } })}
                      type="text" maxLength={6} className={clsx(inputCls, errors.pincode && errorCls)} placeholder="6-digit PIN code" />
                  </Field>
                  <Field label="Date of Birth">
                    <input {...register('dob')} type="date" className={inputCls} />
                  </Field>
                  <Field label="City / Town">
                    <input {...register('city')} className={inputCls} placeholder="e.g. Mumbai, Pune" />
                  </Field>
                </div>
              </div>
            )}

            {/* Tab 1 — Specific Details */}
            {activeTab === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 capitalize">{insuranceType} Insurance Details</h3>
                <SpecificDetails insuranceType={insuranceType} register={register} watch={watch} errors={errors} control={control} />
              </div>
            )}

            {/* Tab 2 — Preferences */}
            {activeTab === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Your Preferences</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    How much coverage do you want? <span className="text-red-500">*</span>
                  </label>
                  <input {...register('sumInsured', { required: 'Select a coverage amount' })}
                    type="range" min={200000} max={10000000} step={100000}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E64FF]" />
                  <div className="flex justify-between text-sm font-medium text-slate-900 mt-2">
                    <span>₹2L</span>
                    <span className="text-[#1E64FF] text-base font-bold">₹{((parseInt(formData.sumInsured) || 500000) / 100000).toFixed(1)} Lakhs</span>
                    <span>₹1Cr</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Premium payment frequency?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{v:'annual',l:'Annual'},{v:'halfyearly',l:'Half-Yearly'},{v:'monthly',l:'Monthly'}].map(({v,l}) => (
                      <label key={v} className={clsx('flex items-center justify-center p-3 border rounded-xl cursor-pointer text-sm',
                        formData['paymentFrequency'] === v ? 'border-[#1E64FF] bg-blue-50 text-[#1E64FF]' : 'border-slate-200 hover:bg-slate-50')}>
                        <input {...register('paymentFrequency')} type="radio" value={v} className="hidden" />{l}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Extra covers for <span className="capitalize text-[#1E64FF]">{insuranceType}</span> insurance
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {addOns.map(addon => (
                      <label key={addon} className={clsx('flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors',
                        formData[`addon_${addon.replace(/\s+/g, '_')}`] ? 'border-[#1E64FF] bg-blue-50' : 'border-slate-200 hover:bg-slate-50')}>
                        <div>
                          <span className="text-slate-700 text-sm font-medium">{addon}</span>
                        </div>
                        <input {...register(`addon_${addon.replace(/\s+/g, '_')}` as any)} type="checkbox"
                          className="w-5 h-5 rounded border-slate-300 text-[#1E64FF]" />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3 — Review */}
            {activeTab === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Review Your Details</h3>
                <div className="bg-slate-50 rounded-xl p-6 space-y-4 text-sm border border-slate-200">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                    <div><p className="text-slate-500 text-xs">Name</p><p className="font-medium">{formData.fullName || '—'}</p></div>
                    <div><p className="text-slate-500 text-xs">Age</p><p className="font-medium">{formData.age || '—'}</p></div>
                    <div><p className="text-slate-500 text-xs">Coverage</p><p className="font-medium">₹{((parseInt(formData.sumInsured) || 500000) / 100000).toFixed(1)} Lakhs</p></div>
                    <div><p className="text-slate-500 text-xs">Type</p><p className="font-medium capitalize">{insuranceType}</p></div>
                    <div><p className="text-slate-500 text-xs">City</p><p className="font-medium">{formData.city || formData.pincode || '—'}</p></div>
                    <div><p className="text-slate-500 text-xs">Gender</p><p className="font-medium capitalize">{formData.gender || '—'}</p></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Risk Factor Breakdown</p>
                    {risk.breakdown.map(f => (
                      <div key={f.factor} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 w-36 shrink-0">{f.factor}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className={clsx('h-full rounded-full transition-all duration-500',
                              f.impact === 'positive' ? 'bg-green-400' : f.impact === 'negative' ? 'bg-red-400' : 'bg-blue-400')}
                              style={{ width: `${f.subScore}%` }} />
                          </div>
                          <span className={clsx('w-8 text-right font-medium',
                            f.subScore > 70 ? 'text-green-600' : f.subScore > 45 ? 'text-amber-600' : 'text-red-600')}>
                            {Math.round(f.subScore)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-slate-500 text-xs mb-1">Estimated Yearly Cost</p>
                    <p className="text-2xl font-bold text-[#1E64FF]">
                      {formatCurrency(risk.estimatedMin)} – {formatCurrency(risk.estimatedMax)}
                      <span className="text-sm font-normal text-slate-400 ml-1">/year</span>
                    </p>
                  </div>
                  {Object.entries(formData).filter(([k,v]) => k.startsWith('addon_') && v).length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Selected Add-ons</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(formData)
                          .filter(([k,v]) => k.startsWith('addon_') && v)
                          .map(([k]) => (
                            <span key={k} className="text-xs bg-blue-50 text-[#1E64FF] px-2 py-1 rounded-full border border-blue-100">
                              {k.replace('addon_','').replace(/_/g,' ')}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-900">Risk Profile</h4>
                <span className={clsx('px-2 py-1 text-xs font-bold rounded-full', riskColor)}>{risk.riskLevel}</span>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Risk Score</span>
                    <span className="font-medium text-slate-900">{risk.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-500',
                      risk.score >= 85 ? 'bg-emerald-500' :
                      risk.score >= 70 ? 'bg-[#1FB6A6]' :
                      risk.score >= 55 ? 'bg-yellow-400' :
                      risk.score >= 40 ? 'bg-amber-400' : 'bg-red-400')}
                      style={{ width: `${risk.score}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Cost Multiplier</span>
                    <span className="font-medium text-slate-900">{risk.multiplier.toFixed(2)}x</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-500',
                      risk.multiplier < 1.2 ? 'bg-green-400' : risk.multiplier < 1.5 ? 'bg-amber-400' : 'bg-red-400')}
                      style={{ width: `${Math.min(100, (risk.multiplier - 1) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 mb-1">Estimated Yearly Cost</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(risk.estimatedMin)}
                  <span className="text-slate-400 font-normal text-sm mx-1">–</span>
                  {formatCurrency(risk.estimatedMax)}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">/yr</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3 text-sm">Insurance Terms</h4>
              <ul className="space-y-3 text-xs text-slate-600">
                {Object.keys(termDefinitions).map(term => (
                  <li key={term} className="flex justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span>{term}</span>
                    <button type="button" onClick={() => setActiveTerm(term)}
                      className="text-[#1E64FF] hover:underline font-medium flex items-center gap-1">
                      What's this? <Info className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Required fields indicator */}
            {activeTab < 3 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700">
                <p className="font-semibold mb-1">Fields marked <span className="text-red-500">*</span> are required</p>
                <p>You cannot proceed until all required fields are filled.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav Footer */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <button type="button"
          onClick={() => { if (activeTab > 0) handleTabChange(activeTab - 1); else onBack(); }}
          className="flex items-center text-slate-600 hover:text-slate-900 font-medium px-4 py-2">
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
        </button>
        <button type="button"
          onClick={() => {
            const form = document.getElementById('details-form');
            form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }}
          className="bg-[#1E64FF] text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center">
          {activeTab === tabs.length - 1 ? 'Analyse & Recommend' : 'Continue'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};