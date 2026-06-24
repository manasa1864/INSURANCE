# Entry point for the Insurance AI backend.
#
# Run with:  uvicorn main:app --reload --port 8000
# Docs at:   http://localhost:8000/docs
#
# Each concern lives in its own file under routes/ — this file just
# sets up the app and wires everything together.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import stats, policies, risk, sentiment

app = FastAPI(title="Insurance AI API", version="1.0.0")

# allow the Vite dev server and any local frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mount each router — all endpoints follow /api/<resource>
app.include_router(stats.router,     prefix="/api")
app.include_router(policies.router,  prefix="/api")
app.include_router(risk.router,      prefix="/api")
app.include_router(sentiment.router, prefix="/api")


@app.get("/health")
def health():
    # quick sanity check — also useful for Docker healthchecks
    import torch
    import numpy as np
    import pandas as pd
    return {
        "status": "ok",
        "torch":  torch.__version__,
        "numpy":  np.__version__,
        "pandas": pd.__version__,
    }
