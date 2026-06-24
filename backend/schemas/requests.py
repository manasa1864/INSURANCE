# All the request/response shapes for the API.
# Keeping them here means each route file stays clean and readable.

from pydantic import BaseModel


class StatRequest(BaseModel):
    # list of numbers — typically claim amounts or premiums
    values: list[float]


class RiskInput(BaseModel):
    # all values should be normalised to 0–1 before sending
    age: float
    claim_history: float
    credit_score: float
    vehicle_age: float


class ClaimTextRequest(BaseModel):
    # raw text from a claim form — we'll run sentiment on this
    text: str
