# Runs HuggingFace sentiment analysis on claim text.
#
# The pipeline is lazy-loaded — it only downloads the model on the first request,
# not at server startup. That keeps cold-start time fast.

from fastapi import APIRouter, HTTPException
from transformers import pipeline
from schemas.requests import ClaimTextRequest

router = APIRouter()

_sentiment_pipeline = None


def _get_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        # ~260MB download on first call — subsequent calls are instant
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
        )
    return _sentiment_pipeline


@router.post("/sentiment")
def analyze_sentiment(req: ClaimTextRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is empty")

    # cap at 512 tokens — that's the model's max input length
    result = _get_pipeline()(req.text[:512])[0]

    return {
        "label":      result["label"],
        "confidence": round(result["score"], 4),
    }
