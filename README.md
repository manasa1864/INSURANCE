# PolicyWise AI — Insurance Recommendation Platform

An intelligent insurance advisory platform that calculates personalised risk scores and recommends policies across 12 insurance categories using a multi-layer actuarial engine.

---

## What It Does

- **Risk Assessment** — scores a user's risk across 12 insurance types using weighted actuarial factors and interaction effects
- **AI Recommendations** — Groq-powered LLM suggests best-fit policies based on the user's profile
- **AI Chat Widget** — conversational assistant for insurance queries
- **What-If Simulator** — lets users adjust parameters and see how their premium changes in real time
- **Policy Comparison** — side-by-side comparison of multiple insurance plans
- **Reports & Saved Plans** — users can save, export, and revisit their recommendations
- **Admin Dashboard** — analytics, user management, and data overview

---

## Insurance Types Covered

| # | Type | Key Risk Factors |
|---|------|-----------------|
| 1 | Health | Age, BMI, smoking, pre-existing diseases, family history |
| 2 | Life | Age, smoking, income, dependants, occupation |
| 3 | Vehicle | Vehicle age/type, claim history, driving experience, parking |
| 4 | Travel | Destination, trip duration, medical conditions, activities |
| 5 | Home | Property age, construction type, flood/seismic zone |
| 6 | Business | Business type, employees, turnover, business maturity |
| 7 | Accident | Occupation hazard, motorcycle use, adventure sports |
| 8 | Critical Illness | Family disease history, current health, exercise habits |
| 9 | Education | Child age, target institution, cost, years to plan |
| 10 | Crop | Crop type, irrigation method, season, soil quality |
| 11 | Gadget | Gadget value/age, invoice availability, usage pattern |
| 12 | Pet | Pet age, vaccination status, breed, vet frequency |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | UI component framework |
| **TypeScript** | — | Type-safe JavaScript |
| **Vite** | 6.3 | Build tool and dev server |
| **Tailwind CSS** | 4.1 | Utility-first styling |
| **shadcn/ui (Radix UI)** | — | Accessible headless UI components (dialogs, dropdowns, tabs, etc.) |
| **MUI (Material UI)** | 7.3 | Supplementary component library |
| **Recharts** | 2.15 | Charts and data visualisation (bar, line, pie) |
| **React Router** | 7.13 | Client-side routing and navigation |
| **React Hook Form** | 7.55 | Multi-step form state management |
| **Lucide React** | 0.487 | Icon library |
| **Motion (Framer)** | 12 | Animations and transitions |
| **React DnD** | 16 | Drag-and-drop interactions |
| **Sonner** | 2.0 | Toast notifications |

### Data Science (JavaScript — runs in browser)

| JS Library | Python Equivalent | Purpose |
|---|---|---|
| **mathjs** | `numpy` | Matrix operations, statistics, mathematical expressions |
| **arquero** | `pandas` | DataFrame operations, data filtering, grouping, aggregation |
| **@tensorflow/tfjs** | `pytorch` | In-browser neural network inference and tensor operations |
| **@huggingface/transformers** | `transformers` | Run HuggingFace NLP models in the browser via ONNX runtime |

### Backend (Python — separate service)

| Library | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **uvicorn** | ASGI server |
| **numpy** | Numerical operations, statistical calculations on claim data |
| **pandas** | Policy DataFrame processing, data aggregation |
| **torch (PyTorch)** | Neural network risk scoring model |
| **transformers (HuggingFace)** | Sentiment analysis on claim descriptions |
| **scikit-learn** | ML utilities |
| **pydantic** | Request/response validation |

### Services & APIs

| Service | Purpose |
|---|---|
| **Supabase** | PostgreSQL database, authentication, real-time subscriptions |
| **Groq API** | LLM inference (AI policy recommendations, chat widget) |

---

## Risk Engine Architecture

The core engine ([src/lib/insuranceRiskEngine.ts](src/lib/insuranceRiskEngine.ts)) runs entirely in the browser with no server call:

```
Layer 1 — Base Scoring        Each factor scored 0–100 from actuarial tables
Layer 2 — Interaction Effects  Compound penalties (e.g. Smoker + Diabetes + Age > 50)
Layer 3 — Weighted Aggregation Weights sum to 1.0, based on IRDAI/LIC tables
Layer 4 — Sigmoid Normalisation Smooth output curve, no hard cliffs
Layer 5 — Coverage Scaling    Final cost scaled by desired sum insured
Layer 6 — Regional Adjustment  Metro / Tier-2 / Rural cost adjustment by PIN code
```

Risk score bands:

| Score | Level | Colour |
|---|---|---|
| 85–100 | Very Low | Dark green |
| 70–84 | Low | Green |
| 55–69 | Below Average | Light amber |
| 40–54 | Moderate | Amber |
| 25–39 | High | Orange |
| 0–24 | Very High | Red |

---

## Project Structure

```
INSURANCE/
├── src/
│   ├── app/
│   │   ├── components/       # Shared UI (Layout, AIChatWidget, TermsModal)
│   │   ├── pages/
│   │   │   ├── NewRecommendation/   # 6-step recommendation wizard
│   │   │   │   └── steps/           # Step1–Step6 (type → details → risk → AI → results → report)
│   │   │   ├── Admin/               # AdminDashboard
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ComparePolicies.tsx
│   │   │   ├── WhatIfSimulator.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── SavedPlans.tsx
│   │   │   └── Settings.tsx
│   ├── auth/                 # Login, Signup
│   ├── lib/
│   │   ├── insuranceRiskEngine.ts   # Core actuarial engine (12 insurance types)
│   │   └── supabaseClient.ts        # Supabase client setup
│   └── styles/               # Tailwind, fonts, theme
├── backend/
│   ├── main.py               # FastAPI app (numpy / pandas / pytorch / HuggingFace endpoints)
│   └── requirements.txt      # Python dependencies
├── .env                      # Secrets (gitignored)
├── .env.example              # Template for required env vars
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Python 3.10+ (only for the backend)

### 1. Clone and install

```bash
git clone <repo-url>
cd INSURANCE
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Fill in your Supabase URL, anon key, and Groq API key
```

### 3. Run the frontend

```bash
pnpm dev
```

Open **http://localhost:5173**

### 4. Run the Python backend (optional)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for interactive API docs.

---

## Environment Variables

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `VITE_GROQ_API_KEY` | console.groq.com/keys |
