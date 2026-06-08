"""
Insurance AI Backend
FastAPI service using numpy, pandas, pytorch, and huggingface transformers.

Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from transformers import pipeline

app = FastAPI(title="Insurance AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Hugging Face sentiment pipeline (lazy-loaded) ----------
_sentiment_pipeline = None

def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
        )
    return _sentiment_pipeline


# ---------- Simple PyTorch risk-scoring model ----------
class RiskNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(4, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


_risk_model = RiskNet()
_risk_model.eval()


# ---------- Schemas ----------
class ClaimTextRequest(BaseModel):
    text: str


class RiskInput(BaseModel):
    age: float          # normalised 0-1
    claim_history: float
    credit_score: float
    vehicle_age: float


class StatRequest(BaseModel):
    values: list[float]


# ---------- Endpoints ----------

@app.get("/health")
def health():
    return {"status": "ok", "torch": torch.__version__, "numpy": np.__version__, "pandas": pd.__version__}


@app.post("/api/stats")
def compute_stats(req: StatRequest):
    """numpy: descriptive statistics for a list of claim amounts."""
    if not req.values:
        raise HTTPException(status_code=400, detail="values list is empty")
    arr = np.array(req.values, dtype=np.float64)
    return {
        "mean":   float(np.mean(arr)),
        "median": float(np.median(arr)),
        "std":    float(np.std(arr)),
        "min":    float(np.min(arr)),
        "max":    float(np.max(arr)),
        "percentile_25": float(np.percentile(arr, 25)),
        "percentile_75": float(np.percentile(arr, 75)),
    }


@app.get("/api/sample-policies")
def sample_policies():
    """pandas: generate a sample insurance policy DataFrame and return summary."""
    rng = np.random.default_rng(42)
    n = 100
    df = pd.DataFrame({
        "policy_id":    [f"POL-{i:04d}" for i in range(n)],
        "age":          rng.integers(18, 80, n),
        "premium":      rng.uniform(500, 5000, n).round(2),
        "claim_count":  rng.integers(0, 5, n),
        "region":       rng.choice(["North", "South", "East", "West"], n),
    })
    summary = {
        "total_policies": len(df),
        "avg_premium": round(df["premium"].mean(), 2),
        "avg_age": round(df["age"].mean(), 1),
        "claims_by_region": df.groupby("region")["claim_count"].sum().to_dict(),
        "high_risk_count": int((df["claim_count"] >= 3).sum()),
        "sample_rows": df.head(5).to_dict(orient="records"),
    }
    return summary


@app.post("/api/risk-score")
def risk_score(req: RiskInput):
    """pytorch: run a simple neural network to estimate claim risk (0-1)."""
    features = torch.tensor(
        [[req.age, req.claim_history, req.credit_score, req.vehicle_age]],
        dtype=torch.float32,
    )
    with torch.no_grad():
        score = _risk_model(features).item()
    return {"risk_score": round(score, 4), "risk_level": "high" if score > 0.6 else "medium" if score > 0.3 else "low"}


@app.post("/api/sentiment")
def analyze_sentiment(req: ClaimTextRequest):
    """huggingface transformers: sentiment analysis on a claim description."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is empty")
    result = get_sentiment_pipeline()(req.text[:512])[0]
    return {"label": result["label"], "confidence": round(result["score"], 4)}
