"""
02_preprocessing.py — Data preprocessing for the Credit Card Fraud dataset.

Steps:
  1. Load the raw CSV
  2. Scale 'Time' and 'Amount' (the only un-scaled columns)
  3. Split into train / test BEFORE any resampling
  4. Apply SMOTE to training set ONLY (avoids data leakage)
  5. Save processed arrays + the fitted scaler for later reuse

Outputs (saved to ml-service/data/processed/):
  - X_train.npy, y_train.npy  (SMOTE-balanced training data)
  - X_test.npy,  y_test.npy   (original test distribution)
  - scaler.pkl                 (fitted StandardScaler)
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE

# ──────────────────────────────────────────────────────────────────────
# Paths (relative to this script's location)
# ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'creditcard.csv')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Reproducibility — same split every run
RANDOM_STATE = 42
TEST_SIZE = 0.20  # 20% for testing, 80% for training

# ──────────────────────────────────────────────────────────────────────
# 1. Load the data
# ──────────────────────────────────────────────────────────────────────
print("=" * 60)
print("1. LOADING DATA")
print("=" * 60)
df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df):,} rows, {df.shape[1]} columns")

# Separate features (X) from target (y)
X = df.drop(columns=['Class'])
y = df['Class']
print(f"Features (X): {X.shape}")
print(f"Target (y):   {y.shape}")

# ──────────────────────────────────────────────────────────────────────
# 2. Scale Time and Amount
# ──────────────────────────────────────────────────────────────────────
# Why: V1–V28 are already PCA-scaled (roughly mean=0, std≈1), but Time
# and Amount are on completely different scales. Without scaling,
# Logistic Regression would be dominated by Amount's magnitude.
#
# We use StandardScaler (z-score normalisation): (x - mean) / std
print("\n" + "=" * 60)
print("2. SCALING Time AND Amount")
print("=" * 60)
print("Before scaling:")
print(X[['Time', 'Amount']].describe().round(2))

scaler = StandardScaler()
X[['Time', 'Amount']] = scaler.fit_transform(X[['Time', 'Amount']])

print("\nAfter scaling:")
print(X[['Time', 'Amount']].describe().round(2))

# ──────────────────────────────────────────────────────────────────────
# 3. Train/test split BEFORE resampling  <-- CRITICAL ORDER
# ──────────────────────────────────────────────────────────────────────
# stratify=y ensures both splits keep the same 0.17% fraud ratio.
# If you SMOTE first then split, synthetic fraud points leak into the
# test set and you end up reporting inflated metrics. We never do that.
print("\n" + "=" * 60)
print("3. TRAIN/TEST SPLIT (before SMOTE)")
print("=" * 60)
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y,
)
print(f"Training set: {X_train.shape[0]:,} rows — "
      f"{(y_train == 1).sum()} fraud "
      f"({(y_train == 1).mean() * 100:.3f}%)")
print(f"Test set:     {X_test.shape[0]:,} rows — "
      f"{(y_test == 1).sum()} fraud "
      f"({(y_test == 1).mean() * 100:.3f}%)")

# ──────────────────────────────────────────────────────────────────────
# 4. SMOTE on the training set ONLY
# ──────────────────────────────────────────────────────────────────────
# SMOTE (Chawla et al. 2002) generates synthetic minority examples by
# interpolating between real minority samples in feature space.
#
# By default it balances the classes 1:1 — we end up with as many
# synthetic frauds as real legitimate transactions.
print("\n" + "=" * 60)
print("4. APPLYING SMOTE (training set only)")
print("=" * 60)
print("Before SMOTE:")
print(f"  Legitimate: {(y_train == 0).sum():,}")
print(f"  Fraudulent: {(y_train == 1).sum():,}")

smote = SMOTE(random_state=RANDOM_STATE)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)

print("\nAfter SMOTE:")
print(f"  Legitimate: {(y_train_res == 0).sum():,}")
print(f"  Fraudulent: {(y_train_res == 1).sum():,}")
print(f"  Synthetic frauds generated: "
      f"{(y_train_res == 1).sum() - (y_train == 1).sum():,}")

# ──────────────────────────────────────────────────────────────────────
# 5. Save everything for the training script
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("5. SAVING PROCESSED DATA")
print("=" * 60)

np.save(os.path.join(OUTPUT_DIR, 'X_train.npy'), X_train_res.values)
np.save(os.path.join(OUTPUT_DIR, 'y_train.npy'), y_train_res.values)
np.save(os.path.join(OUTPUT_DIR, 'X_test.npy'),  X_test.values)
np.save(os.path.join(OUTPUT_DIR, 'y_test.npy'),  y_test.values)

# Also save the column order — essential for the FastAPI service later
np.save(os.path.join(OUTPUT_DIR, 'feature_names.npy'),
        np.array(X.columns.tolist()))

# Save the fitted scaler — the ML microservice will reuse it to scale
# incoming transactions with the exact same parameters
joblib.dump(scaler, os.path.join(MODELS_DIR, 'scaler.pkl'))

print(f"Saved:")
print(f"  X_train.npy        shape {X_train_res.shape}")
print(f"  y_train.npy        shape {y_train_res.shape}")
print(f"  X_test.npy         shape {X_test.shape}")
print(f"  y_test.npy         shape {y_test.shape}")
print(f"  feature_names.npy  {len(X.columns)} features")
print(f"  scaler.pkl         (StandardScaler for Time, Amount)")

print("\nPreprocessing complete. Ready for model training.")