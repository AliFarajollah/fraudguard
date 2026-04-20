"""
main.py — FastAPI application entry point.

Exposes three endpoints:
  GET  /health        — liveness probe
  GET  /model/info    — model metadata and metrics
  POST /predict       — score one transaction

Run:
    cd ml-service
    uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.predictor import predictor
from app.schemas import (
    TransactionFeatures,
    PredictionResponse,
    ModelInfoResponse,
    HealthResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model once when the service starts."""
    predictor.load()
    yield
    # (No cleanup needed here — process teardown handles it.)


app = FastAPI(
    title="FraudGuard ML Inference Service",
    description="HTTP interface to the trained fraud-detection model",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Node.js API (and the React frontend for testing) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["ops"])
def health():
    return HealthResponse(
        status="ok",
        model_loaded=predictor.model is not None,
    )


@app.get("/model/info", response_model=ModelInfoResponse, tags=["model"])
def model_info():
    if predictor.metadata is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return ModelInfoResponse(**predictor.metadata)


@app.post("/predict", response_model=PredictionResponse, tags=["prediction"])
def predict(features: TransactionFeatures):
    try:
        result = predictor.predict(features.model_dump())
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))