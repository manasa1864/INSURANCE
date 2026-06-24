# Generates a fake dataset of 100 insurance policies using pandas,
# then returns a summary with regional breakdown and high-risk counts.
#
# In production this would query a real database — but for demo purposes
# a seeded random DataFrame works just fine.

import numpy as np
import pandas as pd
from fastapi import APIRouter

router = APIRouter()


@router.get("/sample-policies")
def sample_policies():
    rng = np.random.default_rng(42)  # fixed seed so results are reproducible
    n = 100

    df = pd.DataFrame({
        "policy_id":   [f"POL-{i:04d}" for i in range(n)],
        "age":         rng.integers(18, 80, n),
        "premium":     rng.uniform(500, 5000, n).round(2),
        "claim_count": rng.integers(0, 5, n),
        "region":      rng.choice(["North", "South", "East", "West"], n),
    })

    # 3+ claims in a policy period is what we consider high-risk
    high_risk = int((df["claim_count"] >= 3).sum())

    return {
        "total_policies":    len(df),
        "avg_premium":       round(df["premium"].mean(), 2),
        "avg_age":           round(df["age"].mean(), 1),
        "claims_by_region":  df.groupby("region")["claim_count"].sum().to_dict(),
        "high_risk_count":   high_risk,
        "sample_rows":       df.head(5).to_dict(orient="records"),
    }
