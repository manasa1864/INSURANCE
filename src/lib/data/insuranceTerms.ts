// Plain-English definitions of common insurance jargon.
// Shown in the Step 2 sidebar so users understand what they're filling in.
// Each entry has a short definition + a real-world example.

export const insuranceTerms: Record<string, { title: string; plain: string; example: string }> = {
  'Premium': {
    title: 'Premium',
    plain: 'The amount you pay to the insurer — monthly, quarterly, or yearly — to keep your policy active.',
    example: 'Example: You pay ₹12,000/year to maintain your health insurance. If you stop paying, the cover lapses.',
  },
  'Sum Insured': {
    title: 'Sum Insured (Coverage Amount)',
    plain: 'The maximum amount the insurer will pay if you make a claim. Choosing too little leaves you underprotected.',
    example: 'Example: ₹5 lakh sum insured means the insurer pays up to ₹5L per year for your hospitalisation costs.',
  },
  'Policy Term': {
    title: 'Policy Term',
    plain: 'The duration for which your policy is active. After it ends you must renew, or your coverage stops completely.',
    example: 'Example: A 20-year term life plan covers you for exactly 20 years. If you pass away in year 21 without renewal, there is no payout.',
  },
  'Waiting Period': {
    title: 'Waiting Period',
    plain: 'The time you must wait after buying the policy before you can claim for certain conditions.',
    example: 'Example: With a 2-year waiting period for diabetes, you cannot claim for it in the first 2 years.',
  },
  'Co-pay': {
    title: 'Co-pay (Your Share)',
    plain: 'The percentage of the bill you pay yourself. The insurer covers the rest.',
    example: 'Example: 10% co-pay on ₹1,00,000 bill — you pay ₹10,000, insurer pays ₹90,000.',
  },
  'Deductible': {
    title: 'Deductible',
    plain: 'Minimum amount you must pay before the insurance kicks in.',
    example: 'Example: ₹5,000 deductible on ₹30,000 bill — you pay ₹5,000, insurer pays ₹25,000.',
  },
  'NCB': {
    title: 'No Claim Bonus (NCB)',
    plain: "A discount you get on renewal premium for every year you don't make a claim.",
    example: 'Example: After 3 claim-free years, your vehicle insurance premium reduces by 30%.',
  },
  'Exclusions': {
    title: 'Exclusions',
    plain: 'Situations, conditions, or events your policy will NOT cover. Always read these carefully before buying.',
    example: 'Example: Most health plans exclude cosmetic surgery and self-inflicted injuries from coverage.',
  },
  'Cashless Claim': {
    title: 'Cashless Claim',
    plain: "You get treated at a network hospital without paying upfront — the insurer settles the bill directly.",
    example: "Example: Admitted to Apollo (network hospital)? Your insurer pays the hospital directly. You pay nothing at discharge (except co-pay if any).",
  },
  'Claim Settlement Ratio': {
    title: 'Claim Settlement Ratio (CSR)',
    plain: 'The percentage of claims an insurer actually paid out last year. Higher is better — aim for 95%+.',
    example: 'Example: CSR of 98% means the insurer settled 98 out of every 100 claims filed. Avoid insurers below 90%.',
  },
  'Rider': {
    title: 'Rider / Add-on',
    plain: 'An optional benefit you add to your base policy for extra protection, usually at a small additional premium.',
    example: 'Example: Add a Critical Illness Rider to your term life plan to get a lump sum if diagnosed with cancer.',
  },
  'Family Floater': {
    title: 'Family Floater',
    plain: 'A single health policy that covers your entire family under one shared sum insured. Any member can use the full cover, but total payouts in a year cannot exceed the sum insured.',
    example: 'Example: ₹10L family floater for 4 members — if your spouse uses ₹4L, the remaining ₹6L is available for the rest of the family that year.',
  },
  'Portability': {
    title: 'Policy Portability',
    plain: 'Your right to move your existing policy to a different insurer without losing benefits you have already earned — like waiting period credits.',
    example: 'Example: After 2 years with Insurer A you port to Insurer B. The new insurer must honour the 2 years of waiting period you have already served.',
  },
  'Grace Period': {
    title: 'Grace Period',
    plain: 'A short window (usually 15–30 days) after your premium due date where you can still pay and keep your policy active without losing coverage.',
    example: 'Example: Premium was due on March 1st but you missed it. Pay before March 30th (grace period) and your policy stays valid the whole time.',
  },
  'Underwriting': {
    title: 'Underwriting',
    plain: 'The process by which an insurer evaluates your risk profile — age, health, lifestyle, occupation — to decide whether to insure you and at what premium. This is what drives your recommendation.',
    example: 'Example: A 55-year-old smoker with diabetes faces stricter underwriting — higher premium, more exclusions, or outright rejection from some insurers.',
  },
};
