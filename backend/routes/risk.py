# Runs the RiskNet neural network on 4 input features and returns a score 0–1.
#
# The model is initialised once at startup (random weights — demo only).
# To use a trained model, load weights with: model.load_state_dict(torch.load(...))

import torch
from fastapi import APIRouter
from models.risk_net import RiskNet
from schemas.requests import RiskInput

router = APIRouter()

# load once, reuse for every request
_model = RiskNet()
_model.eval()


def _risk_level(score: float) -> str:
    if score > 0.6:
        return "high"
    if score > 0.3:
        return "medium"
    return "low"


@router.post("/risk-score")
def risk_score(req: RiskInput):
    features = torch.tensor(
        [[req.age, req.claim_history, req.credit_score, req.vehicle_age]],
        dtype=torch.float32,
    )

    with torch.no_grad():  # no gradients needed at inference time
        score = _model(features).item()

    return {
        "risk_score": round(score, 4),
        "risk_level": _risk_level(score),
    }
