"""
predictor.py — Loads model + scaler once at startup, runs predictions.

Separating this from main.py keeps HTTP concerns (FastAPI) distinct
from ML concerns (scikit-learn). The service can swap in a new model
by replacing fraud_model.pkl without touching the API layer.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

# ──────────────────────────────────────────────────────────────────────
# Paths — resolve relative to this file
# ──────────────────────────────────────────────────────────────────────
APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(APP_DIR, '..', 'models')
MODEL_PATH    = os.path.join(MODELS_DIR, 'fraud_model.pkl')
SCALER_PATH   = os.path.join(MODELS_DIR, 'scaler.pkl')
METADATA_PATH = os.path.join(MODELS_DIR, 'model_metadata.json')

# Decision threshold — anything >= this is flagged as fraud.
# 0.5 is the default; business teams often tune this in production.
DECISION_THRESHOLD = 0.5


class FraudPredictor:
    """Wraps the trained model and its scaler."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.metadata = None
        self.feature_names = None

    def load(self) -> None:
        """Loads artifacts into memory. Called once at app startup."""
        print(f"Loading model from {MODEL_PATH}")
        self.model = joblib.load(MODEL_PATH)

        print(f"Loading scaler from {SCALER_PATH}")
        self.scaler = joblib.load(SCALER_PATH)

        print(f"Loading metadata from {METADATA_PATH}")
        with open(METADATA_PATH, 'r') as f:
            self.metadata = json.load(f)
        self.feature_names = self.metadata['feature_names']

        print(f"Ready. Model: {self.metadata['model_name']} "
              f"v{self.metadata['model_version']}")

    def predict(self, features: dict) -> dict:
        """
        Score one transaction.

        Steps:
          1. Arrange the features in the exact order the model expects
          2. Scale Time and Amount with the same scaler used at training
          3. Run .predict_proba and apply the threshold
        """
        if self.model is None or self.scaler is None:
            raise RuntimeError("Predictor not initialised — call load() first")

        # Build a DataFrame with features in the training order.
        # This is crucial — column order must match exactly.
        row = pd.DataFrame([features])[self.feature_names]

        # Apply the SAME scaling used at training time.
        row[['Time', 'Amount']] = self.scaler.transform(row[['Time', 'Amount']])

        # Model expects a NumPy array
        X = row.values
        fraud_prob = float(self.model.predict_proba(X)[0, 1])
        is_fraud = fraud_prob >= DECISION_THRESHOLD

        return {
            'fraud_probability': fraud_prob,
            'predicted_label': is_fraud,
            'threshold': DECISION_THRESHOLD,
            'model_version': self.metadata['model_version'],
        }


# Module-level singleton — reused across all HTTP requests
predictor = FraudPredictor()