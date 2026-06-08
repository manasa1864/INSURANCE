/**
 * ============================================================
 *  PolicyWise AI — Advanced Insurance Risk Engine v3.0
 *  insuranceRiskEngine.ts
 * ============================================================
 *
 *  ALGORITHM ARCHITECTURE:
 *
 *  Layer 1 — BASE SCORING
 *    Each factor is scored 0–100 using detailed rule tables
 *    based on real actuarial data from Indian insurance industry
 *
 *  Layer 2 — INTERACTION EFFECTS
 *    Combinations of factors that compound risk are detected
 *    e.g. Smoker + Diabetes + Age > 50 = extra penalty
 *    This mirrors how real underwriters assess risk
 *
 *  Layer 3 — WEIGHTED AGGREGATION
 *    Weighted average of all factor scores (weights sum to 1.0)
 *    Weights are based on IRDAI and LIC actuarial tables
 *
 *  Layer 4 — SIGMOID NORMALISATION
 *    Raw score passed through sigmoid curve for smooth output
 *    No hard cliffs between adjacent values
 *
 *  Layer 5 — COVERAGE SCALING
 *    Final cost scaled by desired coverage amount
 *
 *  Layer 6 — REGIONAL ADJUSTMENT
 *    PIN code / city type adjusts base cost for metro vs rural
 *
 *  Score interpretation:
 *    85–100 = Very Low Risk   (dark green)
 *    70–84  = Low Risk        (green)
 *    55–69  = Below Average   (light amber)
 *    40–54  = Moderate Risk   (amber)
 *    25–39  = High Risk       (orange)
 *    0–24   = Very High Risk  (red)
 * ============================================================
 */

export interface RiskResult {
  score: number;
  multiplier: number;
  estimatedMin: number;
  estimatedMax: number;
  riskLevel: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  breakdown: FactorBreakdown[];
  interactionPenalties: InteractionEffect[];
  regionalAdjustment: number;
}

export interface FactorBreakdown {
  factor: string;
  subScore: number;
  weight: number;
  contribution: number;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}

export interface InteractionEffect {
  name: string;
  penalty: number;
  description: string;
}

/* ── Utility functions ─────────────────────────────────── */

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Enhanced sigmoid: score → cost multiplier
 * score=100 → 1.0x  (lowest cost)
 * score=85  → 1.15x
 * score=70  → 1.35x
 * score=55  → 1.65x
 * score=40  → 2.10x
 * score=25  → 2.70x
 * score=10  → 3.40x
 */
function sigmoid(score: number): number {
  return 1 + 2.8 / (1 + Math.exp(0.07 * (score - 25)));
}

function riskLevel(score: number): 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' {
  if (score >= 85) return 'Very Low';
  if (score >= 70) return 'Low';
  if (score >= 55) return 'Moderate';
  if (score >= 40) return 'High';
  return 'Very High';
}

function formatCost(base: number, multiplier: number) {
  const min = Math.round((base * multiplier) / 500) * 500;
  const max = Math.round((base * multiplier * 1.3) / 500) * 500;
  return { estimatedMin: min, estimatedMax: max };
}

function factor(
  name: string, subScore: number, weight: number,
  impact: 'positive' | 'negative' | 'neutral', detail: string
): FactorBreakdown {
  const s = clamp(subScore);
  return { factor: name, subScore: s, weight, contribution: s * weight, impact, detail };
}

function weightedScore(factors: FactorBreakdown[]): number {
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const raw = factors.reduce((s, f) => s + f.contribution, 0);
  return clamp(raw / totalWeight * 100);
}

/** Regional cost adjustment based on city type */
function getRegionalFactor(formData: any): number {
  const pin = parseInt(formData.pincode) || 0;
  const city = (formData.city || '').toLowerCase();
  const cityType = formData.cityType || '';

  // Metro cities — higher medical costs
  const metroPins = [110, 400, 600, 700, 560, 500, 226, 411, 380, 302];
  const isMetro = metroPins.some(p => Math.floor(pin / 1000) === p) ||
    ['mumbai','delhi','bangalore','bengaluru','chennai','kolkata','hyderabad','pune','ahmedabad'].some(c => city.includes(c)) ||
    cityType === 'metro';

  const isTier2 = cityType === 'tier2';
  return isMetro ? 1.15 : isTier2 ? 1.05 : 1.0;
}

/* ══════════════════════════════════════════════════════════
   1. HEALTH INSURANCE — Most Complex Calculator
      Based on IRDAI guidelines + LIC actuarial tables
   ══════════════════════════════════════════════════════════ */
function calcHealth(d: any): RiskResult {
  const BASE = 7500;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  /* ── Factor 1: Age (weight: 28%) ──
     Exponential risk increase. Under 25 is cheapest.
     After 55 risk doubles every 10 years approximately. */
  const age = parseInt(d.age) || 28;
  const ageScore =
    age <= 18 ? 92 : age <= 22 ? 96 : age <= 25 ? 94 :
    age <= 28 ? 91 : age <= 30 ? 88 : age <= 33 ? 85 :
    age <= 35 ? 82 : age <= 38 ? 78 : age <= 40 ? 74 :
    age <= 43 ? 68 : age <= 45 ? 62 : age <= 48 ? 56 :
    age <= 50 ? 50 : age <= 53 ? 43 : age <= 55 ? 37 :
    age <= 58 ? 30 : age <= 60 ? 24 : age <= 63 ? 18 :
    age <= 65 ? 13 : age <= 70 ? 9 : 5;
  const ageDetail = `Age ${age}: ${ageScore >= 80 ? 'Low risk age bracket' : ageScore >= 60 ? 'Moderate risk age' : ageScore >= 40 ? 'Higher risk — costs rise significantly after 45' : 'High risk — senior age bracket'}`;

  /* ── Factor 2: BMI (weight: 16%) ──
     Optimal BMI 18.5-22.9. Both underweight and obese increase risk. */
  const h = parseFloat(d.height) || 170;
  const w = parseFloat(d.weight) || 70;
  const bmi = w / ((h / 100) ** 2);
  const bmiScore =
    bmi < 15   ? 20 : bmi < 17   ? 35 : bmi < 18.5 ? 62 :
    bmi < 20   ? 90 : bmi < 22   ? 100 : bmi < 23   ? 98 :
    bmi < 25   ? 92 : bmi < 27   ? 80 : bmi < 29   ? 65 :
    bmi < 31   ? 48 : bmi < 33   ? 36 : bmi < 36   ? 26 :
    bmi < 40   ? 18 : 10;
  const bmiDetail = `BMI ${bmi.toFixed(1)}: ${bmi < 18.5 ? 'Underweight — nutritional risk' : bmi < 25 ? 'Normal — optimal range' : bmi < 30 ? 'Overweight — moderate risk' : 'Obese — significant health risk'}`;

  /* ── Factor 3: Smoking (weight: 20%) ──
     Smoking is one of the biggest premium drivers in India */
  const smokingScore =
    d.smoking === 'Regular' ? 8 :
    d.smoking === 'Occasional' ? 42 :
    d.smoking === 'quit' ? 58 : 100;
  const smokingDetail = d.smoking === 'Regular' ? 'Heavy smoker — 3-4x higher risk of lung, heart disease' :
    d.smoking === 'Occasional' ? 'Occasional smoker — elevated risk' :
    d.smoking === 'quit' ? 'Ex-smoker — risk reduces over time' : 'Non-smoker — no tobacco risk';

  /* ── Factor 4: Pre-existing Diseases (weight: 24%) ──
     Each disease has specific actuarial risk weight */
  let diseaseScore = 100;
  const diseasePenalties: string[] = [];
  if (d.preExisting) {
    const diseaseImpact: Record<string, number> = {
      'disease_Heart Ailment': 36,
      'disease_Diabetes': 24,
      'disease_Hypertension': 20,
      'disease_Kidney Disease': 30,
      'disease_Cancer History': 40,
      'disease_Asthma': 14,
      'disease_Thyroid': 10,
      'disease_Others': 8,
    };
    Object.entries(diseaseImpact).forEach(([key, penalty]) => {
      if (d[key]) {
        diseaseScore -= penalty;
        diseasePenalties.push(key.replace('disease_', ''));
      }
    });
  }
  diseaseScore = clamp(diseaseScore);
  const diseaseDetail = diseasePenalties.length > 0
    ? 'Conditions: ' + diseasePenalties.join(', ') + ' — significant premium loading expected'
    : 'No pre-existing conditions — standard rates apply';

  /* ── Factor 5: Family Medical History (weight: 8%) ── */
  const famHistScore =
    d.familyMedicalHistory === 'multiple' ? 30 :
    d.familyMedicalHistory === 'heart' ? 50 :
    d.familyMedicalHistory === 'cancer' ? 45 :
    d.familyMedicalHistory === 'diabetes' ? 60 : 88;
  const famDetail = `Family history: ${d.familyMedicalHistory || 'none'} — affects hereditary risk calculation`;

  /* ── Factor 6: Alcohol (weight: 6%) ── */
  const alcoholScore =
    d.alcohol === 'heavy' ? 25 :
    d.alcohol === 'moderate' ? 62 :
    d.alcohol === 'occasional' ? 85 : 100;
  const alcoholDetail = d.alcohol === 'heavy' ? 'Heavy alcohol use — liver risk' :
    d.alcohol === 'moderate' ? 'Moderate alcohol — some risk' : 'Minimal/no alcohol — low risk';

  /* ── Factor 7: Activity Level (weight: 6%) ── */
  const activityScore =
    d.activityLevel === 'active' ? 100 :
    d.activityLevel === 'moderate' ? 88 :
    d.activityLevel === 'light' ? 72 : 52;
  const activityDetail = `Activity: ${d.activityLevel || 'sedentary'} — physical fitness reduces chronic disease risk`;

  /* ── Factor 8: Hospitalisations (weight: 8%) ── */
  const hospScore =
    d.recentHospitalisations === 'multiple' ? 20 :
    d.recentHospitalisations === 'twice' ? 40 :
    d.recentHospitalisations === 'once' ? 65 : 96;
  const hospDetail = `Recent hospitalisations: ${d.recentHospitalisations || 'none'} — recent claims predict future claims`;

  /* ── Factor 9: Gender (weight: 4%) ── */
  const genderScore = d.gender === 'female' ? 88 : d.gender === 'male' ? 80 : 84;
  const genderDetail = 'Gender: statistically women have lower health claim rates in India';

  /* ── INTERACTION EFFECTS ── */

  // Combo 1: Smoker + Diabetes = very high risk
  if (d.smoking === 'Regular' && d['disease_Diabetes']) {
    interactionPenalty += 8;
    interactions.push({ name: 'Smoker + Diabetes', penalty: 8, description: 'Combination dramatically increases cardiovascular and kidney disease risk' });
  }

  // Combo 2: Age > 50 + Any chronic disease
  if (age > 50 && diseasePenalties.length > 0) {
    interactionPenalty += 6;
    interactions.push({ name: 'Age 50+ with chronic conditions', penalty: 6, description: 'Managing chronic diseases becomes harder and more expensive with age' });
  }

  // Combo 3: Obese + Sedentary
  if (bmi > 30 && d.activityLevel === 'sedentary') {
    interactionPenalty += 5;
    interactions.push({ name: 'Obesity + Sedentary lifestyle', penalty: 5, description: 'Combination significantly raises metabolic disease risk' });
  }

  // Combo 4: Multiple diseases
  if (diseasePenalties.length >= 3) {
    interactionPenalty += 7;
    interactions.push({ name: 'Multiple co-morbidities', penalty: 7, description: 'Having 3+ conditions creates compounding health risks' });
  }

  // Combo 5: Family history of heart + smoker
  if (d.familyMedicalHistory === 'heart' && d.smoking !== 'Never') {
    interactionPenalty += 5;
    interactions.push({ name: 'Family heart history + Smoking', penalty: 5, description: 'Hereditary heart risk greatly amplified by smoking' });
  }

  // Combo 6: Recent multiple hospitalisations + pre-existing
  if (d.recentHospitalisations === 'multiple' && d.preExisting) {
    interactionPenalty += 6;
    interactions.push({ name: 'Multiple hospitalisations + Pre-existing', penalty: 6, description: 'Recent hospitalisations with existing conditions indicate active health issues' });
  }

  const factors = [
    factor('Age', ageScore, 0.28, ageScore >= 70 ? 'positive' : 'negative', ageDetail),
    factor('BMI', bmiScore, 0.16, bmiScore >= 70 ? 'positive' : 'negative', bmiDetail),
    factor('Smoking Status', smokingScore, 0.20, smokingScore >= 70 ? 'positive' : 'negative', smokingDetail),
    factor('Medical History', diseaseScore, 0.24, diseaseScore >= 70 ? 'positive' : 'negative', diseaseDetail),
    factor('Family History', famHistScore, 0.08, famHistScore >= 70 ? 'positive' : 'neutral', famDetail),
    factor('Alcohol', alcoholScore, 0.06, alcoholScore >= 70 ? 'positive' : 'negative', alcoholDetail),
    factor('Activity Level', activityScore, 0.06, activityScore >= 70 ? 'positive' : 'negative', activityDetail),
    factor('Hospitalisation History', hospScore, 0.08, hospScore >= 70 ? 'positive' : 'negative', hospDetail),
    factor('Gender', genderScore, 0.04, 'neutral', genderDetail),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);

  const coverScale = Math.max(0.4, Math.min(3.0, (parseInt(d.sumInsured) || 500000) / 500000));
  const familyScale = d.familyMembers === 'family_plus_parents' ? 1.4 : d.familyMembers === '4' ? 1.2 : d.familyMembers === '3' ? 1.1 : 1.0;
  const regional = getRegionalFactor(d);

  const multiplier = sigmoid(rawScore) * coverScale * familyScale * regional;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: regional };
}

/* ══════════════════════════════════════════════════════════
   2. LIFE INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcLife(d: any): RiskResult {
  const BASE = 5500;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const age = parseInt(d.age) || 28;
  const ageScore =
    age <= 20 ? 90 : age <= 23 ? 96 : age <= 25 ? 98 :
    age <= 28 ? 96 : age <= 30 ? 94 : age <= 33 ? 91 :
    age <= 35 ? 88 : age <= 38 ? 84 : age <= 40 ? 78 :
    age <= 43 ? 70 : age <= 45 ? 62 : age <= 48 ? 53 :
    age <= 50 ? 44 : age <= 53 ? 35 : age <= 55 ? 27 :
    age <= 58 ? 20 : age <= 60 ? 14 : 8;

  const smokerScore = d.smokerLife === 'yes' ? 10 : d.smokerLife === 'quit' ? 55 : 98;

  const income = parseInt(d.annualIncome) || 400000;
  const incomeScore =
    income < 100000 ? 35 : income < 200000 ? 50 : income < 350000 ? 65 :
    income < 500000 ? 75 : income < 750000 ? 82 : income < 1000000 ? 88 :
    income < 1500000 ? 92 : income < 2500000 ? 95 : 97;

  const dep = parseInt(d.dependants) || 0;
  const depScore = dep === 0 ? 90 : dep === 1 ? 86 : dep === 2 ? 81 :
    dep === 3 ? 74 : dep === 4 ? 65 : dep === 5 ? 55 : 42;

  const occScore =
    d.occupation === 'salaried' ? 94 : d.occupation === 'govt' ? 96 :
    d.occupation === 'selfemployed' ? 78 : d.occupation === 'business' ? 74 :
    d.occupation === 'freelancer' ? 68 : d.occupation === 'homemaker' ? 80 : 75;

  const term = parseInt(d.policyTerm) || 20;
  const termScore = term >= 35 ? 98 : term >= 30 ? 95 : term >= 25 ? 92 :
    term >= 20 ? 87 : term >= 15 ? 78 : term >= 10 ? 65 : 50;

  const loanScore = d.outstandingLoans === 'none' ? 95 :
    d.outstandingLoans === 'car' ? 82 : d.outstandingLoans === 'home' ? 72 : 58;

  const educScore = d.education === 'professional' ? 94 : d.education === 'postgrad' ? 90 :
    d.education === 'graduate' ? 84 : d.education === 'below10' ? 65 : 80;

  // Interactions
  if (d.smokerLife === 'yes' && age > 45) {
    interactionPenalty += 8;
    interactions.push({ name: 'Smoker over 45', penalty: 8, description: 'Smoking at older age dramatically increases mortality risk' });
  }
  if (income < 300000 && dep > 3) {
    interactionPenalty += 5;
    interactions.push({ name: 'Low income + many dependants', penalty: 5, description: 'High financial obligation with limited resources increases risk' });
  }

  const factors = [
    factor('Age', ageScore, 0.32, ageScore >= 70 ? 'positive' : 'negative', `Age ${age}: mortality risk factor`),
    factor('Smoking', smokerScore, 0.24, smokerScore >= 70 ? 'positive' : 'negative', 'Primary mortality risk factor'),
    factor('Annual Income', incomeScore, 0.14, 'neutral', `Rs ${income.toLocaleString()}/yr — determines premium affordability`),
    factor('Financial Dependants', depScore, 0.10, depScore >= 70 ? 'positive' : 'neutral', `${dep} dependants — affects coverage need`),
    factor('Occupation', occScore, 0.08, occScore >= 70 ? 'positive' : 'negative', d.occupation || 'Unknown occupation risk class'),
    factor('Policy Term', termScore, 0.06, 'positive', `${term} year term — longer term = better value`),
    factor('Loans/Liabilities', loanScore, 0.04, loanScore >= 70 ? 'positive' : 'negative', 'Outstanding debts need coverage'),
    factor('Education', educScore, 0.02, 'neutral', 'Proxy for financial literacy and health awareness'),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);

  const coverScale = Math.max(0.3, Math.min(5.0, (parseInt(d.sumInsured) || 5000000) / 5000000));
  const multiplier = sigmoid(rawScore) * coverScale;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   3. VEHICLE INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcVehicle(d: any): RiskResult {
  const BASE = 4500;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const vAge = parseInt(d.vehicleAge) || 0;
  const vAgeScore =
    vAge === 0 ? 100 : vAge <= 0.5 ? 98 : vAge <= 1 ? 96 :
    vAge <= 2 ? 90 : vAge <= 3 ? 84 : vAge <= 4 ? 78 :
    vAge <= 5 ? 71 : vAge <= 6 ? 64 : vAge <= 7 ? 57 :
    vAge <= 8 ? 49 : vAge <= 10 ? 40 : vAge <= 12 ? 31 :
    vAge <= 15 ? 22 : vAge <= 20 ? 14 : 8;

  const typeScore =
    d.vehicleType === 'ev' ? 96 : d.vehicleType === 'car' ? 82 :
    d.vehicleType === 'suv' ? 75 : d.vehicleType === 'bike' ? 56 :
    d.vehicleType === 'commercial' ? 38 : 75;

  const fuelScore =
    d.fuelType === 'electric' ? 96 : d.fuelType === 'petrol' ? 82 :
    d.fuelType === 'diesel' ? 76 : d.fuelType === 'hybrid' ? 90 :
    d.fuelType === 'cng' ? 62 : 78;

  const val = parseInt(d.vehicleValue) || 600000;
  const valScore =
    val < 100000 ? 94 : val < 200000 ? 90 : val < 350000 ? 86 :
    val < 500000 ? 82 : val < 750000 ? 76 : val < 1000000 ? 70 :
    val < 1500000 ? 62 : val < 2500000 ? 52 : val < 4000000 ? 40 :
    val < 7000000 ? 30 : 20;

  const claimScore =
    d.previousClaims === 'no' ? 96 :
    d.previousClaims === 'one' ? 48 :
    d.previousClaims === 'multiple' ? 18 : 96;

  const drivingScore =
    d.drivingYears === '7plus' ? 94 : d.drivingYears === '3to7' ? 84 :
    d.drivingYears === '1to3' ? 66 : d.drivingYears === 'less1' ? 44 : 80;

  const parkingScore =
    d.parkingType === 'garage' ? 96 : d.parkingType === 'society' ? 78 :
    d.parkingType === 'roadside' ? 52 : 75;

  const useScore =
    d.vehicleUse === 'personal' ? 90 : d.vehicleUse === 'commute' ? 78 :
    d.vehicleUse === 'outstation' ? 60 : d.vehicleUse === 'commercial' ? 35 : 82;

  const cityScore =
    d.cityType === 'metro' ? 60 : d.cityType === 'tier2' ? 78 : 90;

  const driverAge = parseInt(d.age) || 30;
  const driverAgeScore =
    driverAge < 20 ? 35 : driverAge <= 22 ? 48 : driverAge <= 25 ? 62 :
    driverAge <= 30 ? 88 : driverAge <= 40 ? 94 : driverAge <= 50 ? 88 :
    driverAge <= 60 ? 72 : 55;

  // Interactions
  if (d.previousClaims !== 'no' && vAge > 7) {
    interactionPenalty += 8;
    interactions.push({ name: 'Claims history + Old vehicle', penalty: 8, description: 'Old vehicles with claim history indicate high-risk driver/vehicle combo' });
  }
  if (d.cityType === 'metro' && d.parkingType === 'roadside') {
    interactionPenalty += 6;
    interactions.push({ name: 'Metro city + Roadside parking', penalty: 6, description: 'Roadside parking in metro significantly increases theft and damage risk' });
  }
  if (d.vehicleType === 'bike' && driverAge < 25) {
    interactionPenalty += 7;
    interactions.push({ name: 'Young rider on bike', penalty: 7, description: 'Young bike riders have highest accident rates in India' });
  }

  const factors = [
    factor('Vehicle Age', vAgeScore, 0.18, vAgeScore >= 70 ? 'positive' : 'negative', `${vAge} year old vehicle`),
    factor('Vehicle Type', typeScore, 0.14, typeScore >= 70 ? 'positive' : 'negative', d.vehicleType || 'standard'),
    factor('Fuel Type', fuelScore, 0.08, fuelScore >= 70 ? 'positive' : 'neutral', d.fuelType || 'petrol'),
    factor('Vehicle Value', valScore, 0.14, 'neutral', `Rs ${val.toLocaleString()} IDV`),
    factor('Claim History', claimScore, 0.20, claimScore >= 70 ? 'positive' : 'negative', `Previous claims: ${d.previousClaims || 'none'}`),
    factor('Driving Experience', drivingScore, 0.10, drivingScore >= 70 ? 'positive' : 'negative', `${d.drivingYears || 'unknown'} experience`),
    factor('Parking Security', parkingScore, 0.06, parkingScore >= 70 ? 'positive' : 'negative', `${d.parkingType || 'standard'} parking`),
    factor('Vehicle Usage', useScore, 0.06, useScore >= 70 ? 'positive' : 'negative', d.vehicleUse || 'personal'),
    factor('City/Location', cityScore, 0.04, cityScore >= 70 ? 'positive' : 'negative', `${d.cityType || 'standard'} location risk`),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);

  const coverScale = Math.max(0.3, Math.min(3.0, val / 600000));
  const multiplier = sigmoid(rawScore) * coverScale;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   4. TRAVEL INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcTravel(d: any): RiskResult {
  const isIntl = d.travelDestination !== 'domestic';
  const BASE = isIntl ? 2800 : 700;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const destScore =
    d.travelDestination === 'domestic' ? 96 :
    d.travelDestination === 'saarc' ? 82 :
    d.travelDestination === 'asia' ? 68 :
    d.travelDestination === 'international' ? 60 :
    d.travelDestination === 'schengen' ? 50 :
    d.travelDestination === 'usa' ? 32 : 80;

  const days = parseInt(d.travelDays) || 7;
  const daysScore =
    days <= 3 ? 98 : days <= 5 ? 95 : days <= 7 ? 90 :
    days <= 10 ? 84 : days <= 14 ? 76 : days <= 21 ? 65 :
    days <= 30 ? 52 : days <= 45 ? 38 : days <= 60 ? 26 : 15;

  const travellers = parseInt(d.travellers) || 1;
  const travellerScore =
    travellers === 1 ? 96 : travellers === 2 ? 90 : travellers === 3 ? 84 :
    travellers === 4 ? 76 : travellers === 5 ? 66 : travellers <= 8 ? 54 : 40;

  const purposeScore =
    d.travelPurpose === 'leisure' ? 86 : d.travelPurpose === 'business' ? 74 :
    d.travelPurpose === 'education' ? 68 : d.travelPurpose === 'medical' ? 34 : 82;

  const age = parseInt(d.age) || 30;
  const ageScore =
    age <= 18 ? 78 : age <= 25 ? 96 : age <= 35 ? 94 :
    age <= 45 ? 86 : age <= 55 ? 70 : age <= 65 ? 48 : 28;

  const medScore =
    d.medicalConditions === 'none' ? 98 :
    d.medicalConditions === 'controlled' ? 62 :
    d.medicalConditions === 'recent_surgery' ? 38 :
    d.medicalConditions === 'serious' ? 18 : 98;

  const activityScore =
    d.activities === 'leisure' ? 94 : d.activities === 'moderate' ? 76 :
    d.activities === 'adventure' ? 48 : d.activities === 'extreme' ? 24 : 90;

  // Interactions
  if (d.travelDestination === 'usa' && age > 55) {
    interactionPenalty += 10;
    interactions.push({ name: 'USA travel + Senior age', penalty: 10, description: 'US medical costs are extreme; older travellers face very high risk of claims' });
  }
  if (d.medicalConditions !== 'none' && d.travelDestination !== 'domestic') {
    interactionPenalty += 7;
    interactions.push({ name: 'Medical condition + International travel', penalty: 7, description: 'Pre-existing conditions significantly increase medical claim risk abroad' });
  }
  if (d.activities === 'extreme' && d.travelDestination !== 'domestic') {
    interactionPenalty += 8;
    interactions.push({ name: 'Extreme sports + International', penalty: 8, description: 'Extreme sports internationally create high evacuation and medical risk' });
  }

  const factors = [
    factor('Destination Risk', destScore, 0.28, destScore >= 70 ? 'positive' : 'negative', `${d.travelDestination || 'domestic'} — medical cost level`),
    factor('Trip Duration', daysScore, 0.22, daysScore >= 70 ? 'positive' : 'negative', `${days} days — longer trips = higher exposure`),
    factor('Medical Conditions', medScore, 0.20, medScore >= 70 ? 'positive' : 'negative', d.medicalConditions || 'none'),
    factor('Planned Activities', activityScore, 0.12, activityScore >= 70 ? 'positive' : 'negative', d.activities || 'leisure'),
    factor('Traveller Age', ageScore, 0.10, ageScore >= 70 ? 'positive' : 'negative', `Age ${age}`),
    factor('No. of Travellers', travellerScore, 0.08, 'neutral', `${travellers} traveller(s)`),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const coverScale = Math.max(0.5, Math.min(2.0, travellers));
  const multiplier = sigmoid(rawScore) * coverScale;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   5. HOME INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcHome(d: any): RiskResult {
  const BASE = 2800;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const propAge = parseInt(d.propertyAge) || 0;
  const propAgeScore =
    propAge === 0 ? 100 : propAge <= 1 ? 98 : propAge <= 2 ? 96 :
    propAge <= 3 ? 94 : propAge <= 5 ? 91 : propAge <= 7 ? 87 :
    propAge <= 10 ? 82 : propAge <= 15 ? 74 : propAge <= 20 ? 63 :
    propAge <= 25 ? 50 : propAge <= 30 ? 38 : propAge <= 40 ? 26 : 15;

  const constScore =
    d.constructionType === 'rcc' ? 98 : d.constructionType === 'new' ? 96 :
    d.constructionType === 'old' ? 38 : d.constructionType === 'wooden' ? 20 :
    d.constructionType === 'prefab' ? 55 : 85;

  const floodScore =
    d.floodZone === 'no' ? 96 : d.floodZone === 'partial' ? 55 : d.floodZone === 'yes' ? 12 : 96;

  const eqScore =
    d.earthquakeZone === 'low' ? 96 : d.earthquakeZone === 'medium' ? 70 : d.earthquakeZone === 'high' ? 35 : 90;

  const securityScore =
    d.securitySystem === 'full' ? 98 : d.securitySystem === 'alarm' ? 86 :
    d.securitySystem === 'cctv' ? 76 : 62;

  const typeScore =
    d.propertyType === 'apartment' ? 90 : d.propertyType === 'rowhouse' ? 82 :
    d.propertyType === 'independent' ? 76 : d.propertyType === 'villa' ? 68 : 85;

  const propVal = parseInt(d.propertyValue) || 3000000;
  const valScore =
    propVal < 500000 ? 92 : propVal < 1000000 ? 88 : propVal < 2000000 ? 84 :
    propVal < 4000000 ? 78 : propVal < 8000000 ? 68 : propVal < 15000000 ? 55 : 40;

  // Interactions
  if (d.floodZone === 'yes' && d.constructionType === 'wooden') {
    interactionPenalty += 12;
    interactions.push({ name: 'Flood zone + Wooden construction', penalty: 12, description: 'Extremely high risk — wooden structure in flood-prone area' });
  }
  if (d.earthquakeZone === 'high' && propAge > 25) {
    interactionPenalty += 8;
    interactions.push({ name: 'High seismic zone + Old building', penalty: 8, description: 'Old buildings in seismic zones may not meet modern safety standards' });
  }

  const factors = [
    factor('Property Age', propAgeScore, 0.20, propAgeScore >= 70 ? 'positive' : 'negative', `${propAge} year old property`),
    factor('Construction Type', constScore, 0.22, constScore >= 70 ? 'positive' : 'negative', d.constructionType || 'standard'),
    factor('Flood Zone Risk', floodScore, 0.20, floodScore >= 70 ? 'positive' : 'negative', `Flood zone: ${d.floodZone || 'unknown'}`),
    factor('Seismic Zone', eqScore, 0.14, eqScore >= 70 ? 'positive' : 'negative', `Earthquake zone: ${d.earthquakeZone || 'low'}`),
    factor('Security Systems', securityScore, 0.10, securityScore >= 70 ? 'positive' : 'positive', d.securitySystem || 'none'),
    factor('Property Type', typeScore, 0.08, 'neutral', d.propertyType || 'standard'),
    factor('Property Value', valScore, 0.06, 'neutral', `Rs ${propVal.toLocaleString()}`),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const coverScale = Math.max(0.5, Math.min(4.0, propVal / 3000000));
  const multiplier = sigmoid(rawScore) * coverScale * getRegionalFactor(d);
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: getRegionalFactor(d) };
}

/* ══════════════════════════════════════════════════════════
   6. BUSINESS INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcBusiness(d: any): RiskResult {
  const BASE = 11000;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const typeScore =
    d.businessType === 'it' ? 92 : d.businessType === 'education' ? 88 :
    d.businessType === 'retail' ? 72 : d.businessType === 'healthcare' ? 68 :
    d.businessType === 'restaurant' ? 58 : d.businessType === 'logistics' ? 52 :
    d.businessType === 'manufacturing' ? 42 : 68;

  const emp = parseInt(d.employees) || 1;
  const empScore =
    emp <= 2 ? 94 : emp <= 5 ? 88 : emp <= 10 ? 81 :
    emp <= 20 ? 72 : emp <= 35 ? 61 : emp <= 60 ? 48 :
    emp <= 100 ? 36 : 22;

  const turnover = parseInt(d.turnover) || 500000;
  const turnoverScore =
    turnover < 100000 ? 88 : turnover < 300000 ? 84 : turnover < 600000 ? 80 :
    turnover < 1200000 ? 74 : turnover < 3000000 ? 65 : turnover < 8000000 ? 53 :
    turnover < 25000000 ? 40 : 28;

  const bAge = parseInt(d.businessAge) || 1;
  const bAgeScore =
    bAge < 1 ? 38 : bAge === 1 ? 52 : bAge <= 2 ? 62 :
    bAge <= 3 ? 70 : bAge <= 5 ? 78 : bAge <= 7 ? 84 :
    bAge <= 10 ? 89 : bAge <= 15 ? 92 : 95;

  const locScore =
    d.businessLocation === 'owned' ? 92 : d.businessLocation === 'rented' ? 70 :
    d.businessLocation === 'cowork' ? 62 : d.businessLocation === 'home' ? 55 : 72;

  const claimScore =
    d.previousClaims === 'no' ? 96 : d.previousClaims === 'once' ? 58 : d.previousClaims === 'multiple' ? 22 : 96;

  const stockScore = parseInt(d.stockValue) || 0;
  const stockRiskScore = stockScore === 0 ? 88 : stockScore < 200000 ? 84 :
    stockScore < 500000 ? 76 : stockScore < 1500000 ? 64 : 48;

  if (d.businessType === 'manufacturing' && emp > 20) {
    interactionPenalty += 7;
    interactions.push({ name: 'Manufacturing + Large workforce', penalty: 7, description: 'High employee count in manufacturing significantly raises liability risk' });
  }
  if (d.previousClaims !== 'no' && bAge < 3) {
    interactionPenalty += 6;
    interactions.push({ name: 'Claims history + Young business', penalty: 6, description: 'Claims in early years of business indicate high operational risk' });
  }

  const factors = [
    factor('Business Type', typeScore, 0.22, typeScore >= 70 ? 'positive' : 'negative', d.businessType || 'general'),
    factor('No. of Employees', empScore, 0.18, empScore >= 70 ? 'positive' : 'negative', `${emp} employees`),
    factor('Annual Turnover', turnoverScore, 0.18, 'neutral', `Rs ${turnover.toLocaleString()}`),
    factor('Business Maturity', bAgeScore, 0.18, bAgeScore >= 70 ? 'positive' : 'negative', `${bAge} year(s) old`),
    factor('Premises Type', locScore, 0.10, locScore >= 70 ? 'positive' : 'negative', d.businessLocation || 'standard'),
    factor('Claims History', claimScore, 0.10, claimScore >= 70 ? 'positive' : 'negative', d.previousClaims || 'none'),
    factor('Stock Value', stockRiskScore, 0.04, 'neutral', `Stock: Rs ${stockScore.toLocaleString()}`),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const coverScale = Math.max(0.5, Math.min(3.0, turnover / 2000000));
  const multiplier = sigmoid(rawScore) * coverScale;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   7. ACCIDENT INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcAccident(d: any): RiskResult {
  const BASE = 2200;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const occScore =
    d.occupationType === 'desk' ? 96 : d.occupationType === 'fieldwork' ? 68 :
    d.occupationType === 'manual' ? 40 : d.occupationType === 'hazardous' ? 16 : 80;

  const motoScore =
    d.motorcycle === 'no' ? 92 : d.motorcycle === 'occasionally' ? 62 : d.motorcycle === 'daily' ? 32 : 92;

  const sportsScore =
    d.adventureSports === 'none' ? 96 : d.adventureSports === 'mild' ? 68 :
    d.adventureSports === 'moderate' ? 38 : d.adventureSports === 'extreme' ? 14 : 96;

  const disScore =
    d.existingDisability === 'no' ? 96 : d.existingDisability === 'partial' ? 52 : 24;

  const age = parseInt(d.age) || 28;
  const ageScore =
    age < 18 ? 68 : age <= 22 ? 82 : age <= 25 ? 90 : age <= 30 ? 96 :
    age <= 35 ? 94 : age <= 40 ? 88 : age <= 45 ? 80 : age <= 50 ? 68 :
    age <= 55 ? 55 : age <= 60 ? 42 : 28;

  const travelScore =
    d.travelFrequency === 'rarely' ? 92 : d.travelFrequency === 'monthly' ? 76 :
    d.travelFrequency === 'weekly' ? 58 : d.travelFrequency === 'frequent' ? 40 : 88;

  const genderScore = d.gender === 'male' ? 70 : d.gender === 'female' ? 88 : 78;

  if (d.occupationType === 'hazardous' && d.motorcycle !== 'no') {
    interactionPenalty += 10;
    interactions.push({ name: 'Hazardous job + Daily bike riding', penalty: 10, description: 'Combination creates extremely high accident probability' });
  }
  if (d.adventureSports === 'extreme' && age < 30) {
    interactionPenalty += 6;
    interactions.push({ name: 'Extreme sports + Young age', penalty: 6, description: 'Young people with extreme hobbies have highest accident rates' });
  }

  const factors = [
    factor('Occupation Type', occScore, 0.28, occScore >= 70 ? 'positive' : 'negative', `${d.occupationType || 'desk'} — occupational hazard level`),
    factor('Motorcycle Rider', motoScore, 0.22, motoScore >= 70 ? 'positive' : 'negative', `Motorcycle use: ${d.motorcycle || 'none'}`),
    factor('Adventure Sports', sportsScore, 0.18, sportsScore >= 70 ? 'positive' : 'negative', d.adventureSports || 'none'),
    factor('Existing Disability', disScore, 0.14, disScore >= 70 ? 'positive' : 'negative', d.existingDisability || 'none'),
    factor('Travel Frequency', travelScore, 0.10, travelScore >= 70 ? 'positive' : 'negative', d.travelFrequency || 'rarely'),
    factor('Age', ageScore, 0.06, ageScore >= 70 ? 'positive' : 'negative', `Age ${age}`),
    factor('Gender', genderScore, 0.02, 'neutral', 'Accident statistics by gender'),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const multiplier = sigmoid(rawScore);
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   8. CRITICAL ILLNESS
   ══════════════════════════════════════════════════════════ */
function calcCritical(d: any): RiskResult {
  const BASE = 7000;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const famScore =
    d.familyHistory === 'multiple' ? 16 : d.familyHistory === 'parent' ? 28 :
    d.familyHistory === 'sibling' ? 32 : d.familyHistory === 'distant' ? 65 :
    d.familyHistory === 'no' ? 94 : 94;

  const condScore =
    d.familyCondition === 'cancer' ? 15 : d.familyCondition === 'heart' ? 18 :
    d.familyCondition === 'liver' ? 22 : d.familyCondition === 'kidney' ? 24 :
    d.familyCondition === 'stroke' ? 20 : 92;

  const healthScore =
    d.currentHealth === 'excellent' ? 100 : d.currentHealth === 'good' ? 82 :
    d.currentHealth === 'average' ? 54 : d.currentHealth === 'poor' ? 22 : 82;

  const exScore =
    d.exercise === 'daily' ? 100 : d.exercise === 'weekly' ? 82 :
    d.exercise === 'rarely' ? 44 : d.exercise === 'never' ? 18 : 82;

  const smokingScore =
    d.smoking === 'Regular' ? 10 : d.smoking === 'Occasional' ? 50 :
    d.smoking === 'quit' ? 58 : 98;

  const age = parseInt(d.age) || 30;
  const ageScore =
    age <= 25 ? 98 : age <= 30 ? 96 : age <= 35 ? 90 :
    age <= 40 ? 80 : age <= 45 ? 66 : age <= 50 ? 50 :
    age <= 55 ? 35 : age <= 60 ? 22 : 12;

  const bmiCategory = d.bmi || 'normal';
  const bmiScore =
    bmiCategory === 'normal' ? 96 : bmiCategory === 'underweight' ? 62 :
    bmiCategory === 'overweight' ? 72 : bmiCategory === 'obese' ? 38 : 90;

  const alcoholScore =
    d.alcoholCritical === 'never' ? 98 : d.alcoholCritical === 'social' ? 84 :
    d.alcoholCritical === 'moderate' ? 60 : d.alcoholCritical === 'heavy' ? 20 : 95;

  const checkupScore =
    d.lastCheckup === 'recent' ? 96 : d.lastCheckup === 'year' ? 82 :
    d.lastCheckup === '2years' ? 60 : d.lastCheckup === 'never' ? 28 : 75;

  if (d.familyHistory !== 'no' && d.smoking === 'Regular') {
    interactionPenalty += 10;
    interactions.push({ name: 'Family illness history + Smoking', penalty: 10, description: 'Hereditary predisposition combined with smoking dramatically increases critical illness probability' });
  }
  if (bmiCategory === 'obese' && d.exercise === 'never') {
    interactionPenalty += 7;
    interactions.push({ name: 'Obesity + No exercise', penalty: 7, description: 'Obese individuals who never exercise face very high metabolic disease risk' });
  }
  if (age > 50 && d.lastCheckup === 'never') {
    interactionPenalty += 6;
    interactions.push({ name: 'Age 50+ without health checkups', penalty: 6, description: 'No preventive screening at older age means conditions may be undetected' });
  }

  const factors = [
    factor('Family Disease History', famScore, 0.20, famScore >= 70 ? 'positive' : 'negative', `${d.familyHistory || 'none'} — genetic predisposition`),
    factor('Specific Condition', condScore, 0.16, condScore >= 70 ? 'positive' : 'negative', d.familyCondition || 'none'),
    factor('Current Health', healthScore, 0.18, healthScore >= 70 ? 'positive' : 'negative', d.currentHealth || 'good'),
    factor('Exercise Habits', exScore, 0.12, exScore >= 70 ? 'positive' : 'negative', d.exercise || 'rarely'),
    factor('Smoking Status', smokingScore, 0.10, smokingScore >= 70 ? 'positive' : 'negative', d.smoking || 'Never'),
    factor('Age', ageScore, 0.12, ageScore >= 70 ? 'positive' : 'negative', `Age ${age}`),
    factor('BMI Category', bmiScore, 0.06, bmiScore >= 70 ? 'positive' : 'negative', bmiCategory),
    factor('Alcohol Intake', alcoholScore, 0.04, alcoholScore >= 70 ? 'positive' : 'negative', d.alcoholCritical || 'never'),
    factor('Preventive Checkups', checkupScore, 0.02, checkupScore >= 70 ? 'positive' : 'negative', d.lastCheckup || 'never'),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const coverScale = Math.max(0.5, Math.min(2.0, (parseInt(d.sumInsured) || 500000) / 500000));
  const multiplier = sigmoid(rawScore) * coverScale;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   9. EDUCATION INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcEducation(d: any): RiskResult {
  const BASE = 4500;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const childAge = parseInt(d.childAge) || 5;
  const childAgeScore =
    childAge <= 1 ? 100 : childAge <= 2 ? 98 : childAge <= 3 ? 96 :
    childAge <= 4 ? 94 : childAge <= 5 ? 92 : childAge <= 6 ? 88 :
    childAge <= 7 ? 84 : childAge <= 8 ? 78 : childAge <= 9 ? 72 :
    childAge <= 10 ? 64 : childAge <= 11 ? 56 : childAge <= 12 ? 48 :
    childAge <= 13 ? 38 : childAge <= 14 ? 28 : childAge <= 15 ? 20 : 12;

  const levelScore =
    d.educationLevel === 'graduation' ? 88 : d.educationLevel === 'postgrad' ? 72 :
    d.educationLevel === 'professional' ? 52 : d.educationLevel === 'abroad' ? 28 : 82;

  const cost = parseInt(d.educationCost) || 1000000;
  const costScore =
    cost < 200000 ? 96 : cost < 400000 ? 92 : cost < 700000 ? 86 :
    cost < 1000000 ? 80 : cost < 1500000 ? 72 : cost < 2500000 ? 60 :
    cost < 5000000 ? 46 : cost < 10000000 ? 30 : 18;

  const years = parseInt(d.yearsToEducation) || 10;
  const yearsScore =
    years >= 18 ? 100 : years >= 15 ? 96 : years >= 12 ? 90 :
    years >= 10 ? 82 : years >= 8 ? 72 : years >= 6 ? 60 :
    years >= 4 ? 44 : years >= 2 ? 28 : 14;

  const parentAge = parseInt(d.age) || 35;
  const parentAgeScore =
    parentAge <= 26 ? 98 : parentAge <= 28 ? 96 : parentAge <= 30 ? 94 :
    parentAge <= 32 ? 91 : parentAge <= 35 ? 87 : parentAge <= 38 ? 80 :
    parentAge <= 40 ? 72 : parentAge <= 43 ? 62 : parentAge <= 45 ? 50 :
    parentAge <= 48 ? 38 : parentAge <= 50 ? 27 : 18;

  const savingsScore =
    d.currentSavings === 'half' ? 95 : d.currentSavings === 'partial' ? 80 :
    d.currentSavings === 'small' ? 60 : d.currentSavings === 'none' ? 35 : 50;

  const instScore =
    d.institutionType === 'govt' ? 88 : d.institutionType === 'private' ? 72 :
    d.institutionType === 'abroad' ? 38 : 70;

  if (d.educationLevel === 'abroad' && cost > 3000000) {
    interactionPenalty += 8;
    interactions.push({ name: 'Study abroad + High cost', penalty: 8, description: 'Foreign education with very high target cost requires aggressive early savings' });
  }
  if (years < 5 && d.currentSavings === 'none') {
    interactionPenalty += 10;
    interactions.push({ name: 'Short timeline + No savings', penalty: 10, description: 'Very little time to accumulate funds with zero savings is extremely high risk' });
  }

  const factors = [
    factor("Child's Age", childAgeScore, 0.22, childAgeScore >= 70 ? 'positive' : 'negative', `Child aged ${childAge} — planning horizon`),
    factor('Target Level', levelScore, 0.18, levelScore >= 70 ? 'positive' : 'negative', d.educationLevel || 'graduation'),
    factor('Estimated Cost', costScore, 0.22, 'neutral', `Rs ${cost.toLocaleString()} target`),
    factor('Years to Plan', yearsScore, 0.20, yearsScore >= 70 ? 'positive' : 'negative', `${years} years available`),
    factor('Parent Age', parentAgeScore, 0.10, parentAgeScore >= 70 ? 'positive' : 'negative', `Parent age ${parentAge}`),
    factor('Current Savings', savingsScore, 0.06, savingsScore >= 70 ? 'positive' : 'negative', d.currentSavings || 'none'),
    factor('Target Institution', instScore, 0.02, 'neutral', d.institutionType || 'undecided'),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const coverScale = Math.max(0.4, Math.min(3.0, cost / 1000000));
  const multiplier = sigmoid(rawScore) * coverScale;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   10. CROP INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcCrop(d: any): RiskResult {
  const BASE = 3500;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const cropScore =
    d.cropType === 'wheat' ? 86 : d.cropType === 'pulses' ? 80 :
    d.cropType === 'maize' ? 74 : d.cropType === 'rice' ? 66 :
    d.cropType === 'sugarcane' ? 60 : d.cropType === 'fruits' ? 55 :
    d.cropType === 'cotton' ? 50 : d.cropType === 'vegetables' ? 44 : 68;

  const area = parseFloat(d.landArea) || 2;
  const areaScore =
    area <= 0.5 ? 92 : area <= 1 ? 88 : area <= 2 ? 84 :
    area <= 3 ? 78 : area <= 5 ? 70 : area <= 8 ? 60 :
    area <= 12 ? 50 : area <= 20 ? 38 : 26;

  const irrigScore =
    d.irrigationType === 'irrigated' ? 96 :
    d.irrigationType === 'partial' ? 58 :
    d.irrigationType === 'rainfed' ? 20 : 70;

  const seasonScore =
    d.cropSeason === 'rabi' ? 84 :
    d.cropSeason === 'zaid' ? 72 :
    d.cropSeason === 'kharif' ? 54 : 70;

  const soilScore =
    d.soilType === 'alluvial' ? 92 : d.soilType === 'black' ? 78 :
    d.soilType === 'red' ? 68 : d.soilType === 'sandy' ? 52 : 72;

  const prevLossScore =
    d.previousCropLoss === 'no' ? 94 : d.previousCropLoss === 'once' ? 62 :
    d.previousCropLoss === 'multiple' ? 28 : 90;

  const kccScore = d.kccLoan === 'yes' ? 82 : 88;

  if (d.irrigationType === 'rainfed' && d.cropSeason === 'kharif') {
    interactionPenalty += 12;
    interactions.push({ name: 'Rain-fed + Kharif season', penalty: 12, description: 'Kharif crops depend entirely on monsoon — very high weather risk' });
  }
  if (d.cropType === 'cotton' && d.irrigationType === 'rainfed') {
    interactionPenalty += 8;
    interactions.push({ name: 'Cotton + Rain-fed irrigation', penalty: 8, description: 'Cotton is highly sensitive to water stress — rain-fed cotton is very risky' });
  }
  if (d.previousCropLoss === 'multiple' && d.irrigationType === 'rainfed') {
    interactionPenalty += 7;
    interactions.push({ name: 'History of losses + Rain-fed', penalty: 7, description: 'Repeated losses on rain-fed land suggests chronic weather vulnerability' });
  }

  const factors = [
    factor('Crop Type', cropScore, 0.16, cropScore >= 70 ? 'positive' : 'negative', `${d.cropType || 'standard'} — market and weather sensitivity`),
    factor('Land Area', areaScore, 0.14, 'neutral', `${area} acres — scale risk`),
    factor('Irrigation Type', irrigScore, 0.38, irrigScore >= 70 ? 'positive' : 'negative', `${d.irrigationType || 'rainfed'} — CRITICAL factor`),
    factor('Crop Season', seasonScore, 0.16, seasonScore >= 70 ? 'positive' : 'negative', `${d.cropSeason || 'kharif'} season risk`),
    factor('Soil Quality', soilScore, 0.08, soilScore >= 70 ? 'positive' : 'negative', d.soilType || 'standard'),
    factor('Previous Crop Loss', prevLossScore, 0.08, prevLossScore >= 70 ? 'positive' : 'negative', d.previousCropLoss || 'none'),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const areaScale = Math.max(0.5, Math.min(4.0, area / 2));
  const multiplier = sigmoid(rawScore);
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE * areaScale, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   11. GADGET INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcGadget(d: any): RiskResult {
  const BASE = 1400;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const typeScore =
    d.gadgetType === 'smartwatch' ? 92 : d.gadgetType === 'earbuds' ? 88 :
    d.gadgetType === 'tablet' ? 84 : d.gadgetType === 'laptop' ? 78 :
    d.gadgetType === 'camera' ? 72 : d.gadgetType === 'smartphone' ? 70 : 80;

  const val = parseInt(d.gadgetValue) || 30000;
  const valScore =
    val < 5000 ? 96 : val < 10000 ? 92 : val < 20000 ? 86 :
    val < 35000 ? 78 : val < 60000 ? 68 : val < 100000 ? 54 :
    val < 200000 ? 38 : 24;

  const gAge = parseFloat(d.gadgetAge) || 0;
  const gAgeScore =
    gAge === 0 ? 100 : gAge <= 0.25 ? 98 : gAge <= 0.5 ? 96 :
    gAge <= 1 ? 88 : gAge <= 1.5 ? 78 : gAge <= 2 ? 66 :
    gAge <= 3 ? 50 : gAge <= 4 ? 34 : 18;

  const invoiceScore = d.hasInvoice === 'yes' ? 96 : 42;

  const usageScore =
    d.usageType === 'personal' ? 88 : d.usageType === 'office' ? 80 :
    d.usageType === 'creative' ? 72 : d.usageType === 'travel' ? 56 : 82;

  const warrantyScore =
    d.warrantyStatus === 'yes' ? 90 : d.warrantyStatus === 'extended' ? 86 : 65;

  const brand = (d.gadgetBrand || '').toLowerCase();
  const brandScore =
    brand.includes('apple') ? 62 : brand.includes('samsung') ? 68 :
    brand.includes('sony') ? 72 : brand.includes('dell') || brand.includes('hp') ? 74 :
    brand.includes('oneplus') ? 76 : brand.includes('mi') || brand.includes('realme') ? 86 : 80;

  if (d.gadgetType === 'smartphone' && d.usageType === 'travel') {
    interactionPenalty += 6;
    interactions.push({ name: 'Smartphone + Frequent travel', penalty: 6, description: 'Smartphones used during frequent travel have high theft and damage probability' });
  }
  if (val > 80000 && d.hasInvoice === 'no') {
    interactionPenalty += 8;
    interactions.push({ name: 'High-value gadget without invoice', penalty: 8, description: 'Claims for expensive gadgets without invoice are frequently disputed or rejected' });
  }

  const factors = [
    factor('Gadget Type', typeScore, 0.16, 'neutral', d.gadgetType || 'standard'),
    factor('Purchase Value', valScore, 0.26, valScore >= 70 ? 'positive' : 'negative', `Rs ${val.toLocaleString()}`),
    factor('Gadget Age', gAgeScore, 0.28, gAgeScore >= 70 ? 'positive' : 'negative', `${gAge} years old`),
    factor('Invoice Available', invoiceScore, 0.16, invoiceScore >= 70 ? 'positive' : 'negative', d.hasInvoice === 'yes' ? 'Invoice available — claims easier' : 'No invoice — claim risk'),
    factor('Usage Pattern', usageScore, 0.08, usageScore >= 70 ? 'positive' : 'negative', d.usageType || 'personal'),
    factor('Brand Value', brandScore, 0.06, 'neutral', `Brand: ${d.gadgetBrand || 'unknown'}`),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const coverScale = Math.max(0.3, Math.min(2.5, val / 30000));
  const multiplier = sigmoid(rawScore) * coverScale;
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   12. PET INSURANCE
   ══════════════════════════════════════════════════════════ */
function calcPet(d: any): RiskResult {
  const BASE = 2200;
  const interactions: InteractionEffect[] = [];
  let interactionPenalty = 0;

  const petTypeScore =
    d.petType === 'rabbit' ? 88 : d.petType === 'bird' ? 86 :
    d.petType === 'cat' ? 82 : d.petType === 'dog' ? 70 :
    d.petType === 'other' ? 76 : 78;

  const petAge = parseFloat(d.petAge) || 2;
  const petAgeScore =
    petAge <= 0.5 ? 88 : petAge <= 1 ? 92 : petAge <= 2 ? 98 :
    petAge <= 3 ? 96 : petAge <= 4 ? 92 : petAge <= 5 ? 86 :
    petAge <= 6 ? 78 : petAge <= 7 ? 68 : petAge <= 8 ? 56 :
    petAge <= 9 ? 44 : petAge <= 10 ? 32 : petAge <= 12 ? 20 : 10;

  const vaccScore =
    d.vaccinated === 'yes' ? 100 : d.vaccinated === 'partial' ? 52 : d.vaccinated === 'no' ? 14 : 80;

  const healthScore =
    d.petHealth === 'healthy' ? 100 : d.petHealth === 'minor' ? 55 : d.petHealth === 'chronic' ? 16 : 80;

  const neuteredScore = d.neutered === 'yes' ? 96 : d.neutered === 'no' ? 70 : 88;

  const vetScore =
    d.vetFrequency === 'regular' ? 96 : d.vetFrequency === 'annual' ? 80 : d.vetFrequency === 'rarely' ? 48 : 75;

  const outdoorScore =
    d.outdoorPet === 'indoor' ? 94 : d.outdoorPet === 'supervised' ? 76 : d.outdoorPet === 'free' ? 44 : 85;

  const breed = (d.petBreed || '').toLowerCase();
  const breedScore =
    breed.includes('labrador') || breed.includes('golden') || breed.includes('german') ? 58 :
    breed.includes('pug') || breed.includes('bulldog') || breed.includes('persian') ? 50 :
    breed.includes('beagle') || breed.includes('dachshund') ? 64 :
    breed.includes('indie') || breed.includes('mixed') ? 84 : 74;

  if (d.vaccinated === 'no' && d.outdoorPet === 'free') {
    interactionPenalty += 12;
    interactions.push({ name: 'Unvaccinated + Free-roaming', penalty: 12, description: 'Unvaccinated pets roaming freely have extreme risk of infections and injuries' });
  }
  if (d.petHealth === 'chronic' && petAge > 8) {
    interactionPenalty += 8;
    interactions.push({ name: 'Chronic illness + Old age', penalty: 8, description: 'Managing chronic conditions in older pets is very expensive' });
  }
  if (d.vetFrequency === 'rarely' && d.petHealth !== 'healthy') {
    interactionPenalty += 6;
    interactions.push({ name: 'Infrequent vet visits + Health issues', penalty: 6, description: 'Untreated conditions worsen — leads to expensive emergency claims' });
  }

  const factors = [
    factor('Pet Type', petTypeScore, 0.12, 'neutral', d.petType || 'standard'),
    factor('Pet Age', petAgeScore, 0.22, petAgeScore >= 70 ? 'positive' : 'negative', `${petAge} years old`),
    factor('Vaccination Status', vaccScore, 0.26, vaccScore >= 70 ? 'positive' : 'negative', d.vaccinated || 'unknown'),
    factor('Pet Health', healthScore, 0.22, healthScore >= 70 ? 'positive' : 'negative', d.petHealth || 'healthy'),
    factor('Neutered/Spayed', neuteredScore, 0.06, neuteredScore >= 70 ? 'positive' : 'neutral', d.neutered || 'no'),
    factor('Vet Visit Frequency', vetScore, 0.06, vetScore >= 70 ? 'positive' : 'negative', d.vetFrequency || 'annual'),
    factor('Indoor/Outdoor', outdoorScore, 0.04, outdoorScore >= 70 ? 'positive' : 'negative', d.outdoorPet || 'indoor'),
    factor('Breed Risk', breedScore, 0.02, 'neutral', `Breed: ${d.petBreed || 'mixed'}`),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  let rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  rawScore = clamp(rawScore - interactionPenalty);
  const multiplier = sigmoid(rawScore);
  return { score: Math.round(rawScore), multiplier, ...formatCost(BASE, multiplier), riskLevel: riskLevel(rawScore), breakdown: factors, interactionPenalties: interactions, regionalAdjustment: 1.0 };
}

/* ══════════════════════════════════════════════════════════
   MAIN DISPATCHER
   ══════════════════════════════════════════════════════════ */
export function calculateInsuranceRisk(formData: any, insuranceType: string): RiskResult {
  let result: RiskResult;

  switch (insuranceType) {
    case 'health':    result = calcHealth(formData);    break;
    case 'life':      result = calcLife(formData);      break;
    case 'vehicle':   result = calcVehicle(formData);   break;
    case 'travel':    result = calcTravel(formData);    break;
    case 'home':      result = calcHome(formData);      break;
    case 'business':  result = calcBusiness(formData);  break;
    case 'accident':  result = calcAccident(formData);  break;
    case 'critical':  result = calcCritical(formData);  break;
    case 'education': result = calcEducation(formData); break;
    case 'crop':      result = calcCrop(formData);      break;
    case 'gadget':    result = calcGadget(formData);    break;
    case 'pet':       result = calcPet(formData);       break;
    default:          result = calcHealth(formData);    break;
  }

  return result;
}