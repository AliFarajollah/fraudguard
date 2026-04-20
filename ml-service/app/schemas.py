"""
schemas.py — Pydantic models for request/response validation.

FastAPI uses these to:
  1. Automatically validate incoming JSON
  2. Auto-generate OpenAPI / Swagger documentation at /docs
  3. Enforce the contract between this service and the Node.js API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict


# ──────────────────────────────────────────────────────────────────────
# REQUEST models
# ──────────────────────────────────────────────────────────────────────
class TransactionFeatures(BaseModel):
    """A single transaction, as received by /predict."""
    Time: float = Field(..., description="Seconds elapsed since first transaction")
    Amount: float = Field(..., ge=0, description="Transaction amount (>= 0)")
    V1: float
    V2: float
    V3: float
    V4: float
    V5: float
    V6: float
    V7: float
    V8: float
    V9: float
    V10: float
    V11: float
    V12: float
    V13: float
    V14: float
    V15: float
    V16: float
    V17: float
    V18: float
    V19: float
    V20: float
    V21: float
    V22: float
    V23: float
    V24: float
    V25: float
    V26: float
    V27: float
    V28: float

    model_config = {
        "json_schema_extra": {
            "example": {
                "Time": 0.0, "Amount": 149.62,
                "V1": -1.36, "V2": -0.07, "V3": 2.54, "V4": 1.38,
                "V5": -0.34, "V6": 0.46, "V7": 0.24, "V8": 0.10,
                "V9": 0.36, "V10": 0.09, "V11": -0.55, "V12": -0.62,
                "V13": -0.99, "V14": -0.31, "V15": 1.47, "V16": -0.47,
                "V17": 0.21, "V18": 0.03, "V19": 0.40, "V20": 0.25,
                "V21": -0.02, "V22": 0.28, "V23": -0.11, "V24": 0.07,
                "V25": 0.13, "V26": -0.19, "V27": 0.13, "V28": -0.02,
            }
        }
    }


# ──────────────────────────────────────────────────────────────────────
# RESPONSE models
# ──────────────────────────────────────────────────────────────────────
class PredictionResponse(BaseModel):
    """Response returned by /predict."""
    fraud_probability: float = Field(..., ge=0, le=1,
                                     description="P(fraud) in [0, 1]")
    predicted_label: bool = Field(..., description="True if classified as fraud")
    threshold: float = Field(..., description="Decision threshold used")
    model_version: str


class ModelInfoResponse(BaseModel):
    """Response returned by /model/info."""
    model_name: str
    model_version: str
    n_features: int
    feature_names: List[str]
    training_samples: int
    test_samples: int
    metrics: Dict[str, float]
    all_models_compared: Optional[Dict] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    model_loaded: bool