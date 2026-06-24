# Descriptive statistics on a list of numbers (claim amounts, premiums, etc.)
# Nothing fancy — just wraps numpy's built-ins into a single API call.

import numpy as np
from fastapi import APIRouter, HTTPException
from schemas.requests import StatRequest

router = APIRouter()


@router.post("/stats")
def compute_stats(req: StatRequest):
    if not req.values:
        raise HTTPException(status_code=400, detail="values list is empty")

    arr = np.array(req.values, dtype=np.float64)

    return {
        "mean":           float(np.mean(arr)),
        "median":         float(np.median(arr)),
        "std":            float(np.std(arr)),
        "min":            float(np.min(arr)),
        "max":            float(np.max(arr)),
        "percentile_25":  float(np.percentile(arr, 25)),
        "percentile_75":  float(np.percentile(arr, 75)),
    }
