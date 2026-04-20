"""
03_training.py — Train and compare three classifiers for fraud detection.

Models:
  1. Logistic Regression   (baseline)
  2. Random Forest          (ensemble of decision trees)
  3. XGBoost                (gradient-boosted trees, typically the winner)

Metrics (accuracy is intentionally excluded — misleading for imbalanced data):
  - Precision, Recall, F1
  - ROC-AUC
  - Precision-Recall AUC  (more informative than ROC on this dataset)
  - Confusion matrix

Outputs:
  - docs/screenshots/fig_confusion_matrices.png
  - docs/screenshots/fig_roc_curves.png
  - docs/screenshots/fig_pr_curves.png
  - docs/screenshots/fig_model_comparison.png
  - ml-service/models/fraud_model.pkl   (the winning model)
  - ml-service/models/model_metadata.json
"""

import os
import json
import time
import joblib
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score,
    confusion_matrix, classification_report,
    roc_curve, precision_recall_curve,
)

# ──────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────
plt.rcParams['figure.dpi'] = 100
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 11
sns.set_style('whitegrid')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
FIGURE_DIR = os.path.join(SCRIPT_DIR, '..', '..', 'docs', 'screenshots')
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(FIGURE_DIR, exist_ok=True)

RANDOM_STATE = 42

# ──────────────────────────────────────────────────────────────────────
# 1. Load preprocessed data
# ──────────────────────────────────────────────────────────────────────
print("=" * 60)
print("1. LOADING PREPROCESSED DATA")
print("=" * 60)
X_train = np.load(os.path.join(DATA_DIR, 'X_train.npy'))
y_train = np.load(os.path.join(DATA_DIR, 'y_train.npy'))
X_test  = np.load(os.path.join(DATA_DIR, 'X_test.npy'))
y_test  = np.load(os.path.join(DATA_DIR, 'y_test.npy'))
feature_names = np.load(os.path.join(DATA_DIR, 'feature_names.npy'))

print(f"X_train: {X_train.shape}  (SMOTE-balanced)")
print(f"y_train: {y_train.shape}  — frauds: {int(y_train.sum()):,}")
print(f"X_test:  {X_test.shape}   (original distribution)")
print(f"y_test:  {y_test.shape}   — frauds: {int(y_test.sum()):,}")

# ──────────────────────────────────────────────────────────────────────
# 2. Define models
# ──────────────────────────────────────────────────────────────────────
# Each model is picked to answer a different thesis question:
#   LR  — "can a simple linear model work?"           (baseline)
#   RF  — "can an ensemble of shallow learners help?" (non-linear)
#   XGB — "can gradient boosting do better?"          (industry standard)
models = {
    'Logistic Regression': LogisticRegression(
    max_iter=1000,
    random_state=RANDOM_STATE,
    ),
    'Random Forest': RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ),
    'XGBoost': XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        eval_metric='logloss',
    ),
}

# ──────────────────────────────────────────────────────────────────────
# 3. Train + evaluate each model
# ──────────────────────────────────────────────────────────────────────
results = {}

for name, model in models.items():
    print("\n" + "=" * 60)
    print(f"TRAINING: {name}")
    print("=" * 60)

    # Training timer (nice to have in the thesis)
    t0 = time.time()
    model.fit(X_train, y_train)
    train_seconds = time.time() - t0

    # Predictions on the untouched test set
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]  # P(fraud) for each row

    # Metrics — note: accuracy is intentionally excluded
    precision = precision_score(y_test, y_pred)
    recall    = recall_score(y_test, y_pred)
    f1        = f1_score(y_test, y_pred)
    roc_auc   = roc_auc_score(y_test, y_proba)
    pr_auc    = average_precision_score(y_test, y_proba)
    cm        = confusion_matrix(y_test, y_pred)

    results[name] = {
        'model':       model,
        'y_pred':      y_pred,
        'y_proba':     y_proba,
        'precision':   precision,
        'recall':      recall,
        'f1':          f1,
        'roc_auc':     roc_auc,
        'pr_auc':      pr_auc,
        'cm':          cm,
        'train_time':  train_seconds,
    }

    print(f"Training time:  {train_seconds:.2f}s")
    print(f"Precision:      {precision:.4f}")
    print(f"Recall:         {recall:.4f}")
    print(f"F1-score:       {f1:.4f}")
    print(f"ROC-AUC:        {roc_auc:.4f}")
    print(f"PR-AUC:         {pr_auc:.4f}")
    print(f"Confusion matrix (rows=true, cols=predicted):")
    print(f"  [[TN {cm[0,0]:>6}   FP {cm[0,1]:>4}]")
    print(f"   [FN {cm[1,0]:>6}   TP {cm[1,1]:>4}]]")

# ──────────────────────────────────────────────────────────────────────
# 4. Comparison table (print)
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL COMPARISON")
print("=" * 60)
header = f"{'Model':<22}{'Prec':>8}{'Recall':>8}{'F1':>8}{'ROC-AUC':>10}{'PR-AUC':>10}{'Train(s)':>10}"
print(header)
print("-" * len(header))
for name, r in results.items():
    print(f"{name:<22}"
          f"{r['precision']:>8.4f}"
          f"{r['recall']:>8.4f}"
          f"{r['f1']:>8.4f}"
          f"{r['roc_auc']:>10.4f}"
          f"{r['pr_auc']:>10.4f}"
          f"{r['train_time']:>10.2f}")

# ──────────────────────────────────────────────────────────────────────
# 5. Confusion-matrix plot
# ──────────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
for ax, (name, r) in zip(axes, results.items()):
    sns.heatmap(r['cm'], annot=True, fmt='d', cmap='Blues', cbar=False,
                xticklabels=['Legit', 'Fraud'],
                yticklabels=['Legit', 'Fraud'], ax=ax)
    ax.set_title(f"{name}\nRecall={r['recall']:.3f}  Prec={r['precision']:.3f}",
                 fontsize=12, fontweight='bold')
    ax.set_xlabel('Predicted')
    ax.set_ylabel('True')
plt.tight_layout()
out = os.path.join(FIGURE_DIR, 'fig_confusion_matrices.png')
plt.savefig(out, bbox_inches='tight')
plt.close()
print(f"\nSaved: {out}")

# ──────────────────────────────────────────────────────────────────────
# 6. ROC curves
# ──────────────────────────────────────────────────────────────────────
plt.figure(figsize=(9, 7))
for name, r in results.items():
    fpr, tpr, _ = roc_curve(y_test, r['y_proba'])
    plt.plot(fpr, tpr, linewidth=2,
             label=f"{name} (AUC = {r['roc_auc']:.4f})")
plt.plot([0, 1], [0, 1], 'k--', alpha=0.4, label='Random')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curves — Model Comparison', fontsize=13, fontweight='bold')
plt.legend(loc='lower right')
plt.tight_layout()
out = os.path.join(FIGURE_DIR, 'fig_roc_curves.png')
plt.savefig(out, bbox_inches='tight')
plt.close()
print(f"Saved: {out}")

# ──────────────────────────────────────────────────────────────────────
# 7. Precision-Recall curves  (more informative than ROC for imbalance)
# ──────────────────────────────────────────────────────────────────────
plt.figure(figsize=(9, 7))
for name, r in results.items():
    precisions, recalls, _ = precision_recall_curve(y_test, r['y_proba'])
    plt.plot(recalls, precisions, linewidth=2,
             label=f"{name} (PR-AUC = {r['pr_auc']:.4f})")
plt.xlabel('Recall')
plt.ylabel('Precision')
plt.title('Precision-Recall Curves — Model Comparison',
          fontsize=13, fontweight='bold')
plt.legend(loc='lower left')
plt.tight_layout()
out = os.path.join(FIGURE_DIR, 'fig_pr_curves.png')
plt.savefig(out, bbox_inches='tight')
plt.close()
print(f"Saved: {out}")

# ──────────────────────────────────────────────────────────────────────
# 8. Metric comparison bar chart
# ──────────────────────────────────────────────────────────────────────
metrics = ['precision', 'recall', 'f1', 'roc_auc', 'pr_auc']
metric_labels = ['Precision', 'Recall', 'F1', 'ROC-AUC', 'PR-AUC']
names = list(results.keys())
x = np.arange(len(metrics))
width = 0.25
colors = ['#3498db', '#2ecc71', '#e74c3c']

fig, ax = plt.subplots(figsize=(11, 6))
for i, name in enumerate(names):
    values = [results[name][m] for m in metrics]
    ax.bar(x + i * width, values, width, label=name,
           color=colors[i], edgecolor='black')

ax.set_ylabel('Score')
ax.set_title('Model Performance Comparison', fontsize=13, fontweight='bold')
ax.set_xticks(x + width)
ax.set_xticklabels(metric_labels)
ax.legend(loc='lower right')
ax.set_ylim(0, 1.05)
plt.tight_layout()
out = os.path.join(FIGURE_DIR, 'fig_model_comparison.png')
plt.savefig(out, bbox_inches='tight')
plt.close()
print(f"Saved: {out}")

# ──────────────────────────────────────────────────────────────────────
# 9. Pick the winner and save it
# ──────────────────────────────────────────────────────────────────────
# We pick by PR-AUC (not ROC-AUC, not accuracy) because it best reflects
# performance on the positive (fraud) class under severe imbalance.
winner_name = max(results, key=lambda k: results[k]['pr_auc'])
winner = results[winner_name]

print("\n" + "=" * 60)
print(f"WINNER: {winner_name}")
print("=" * 60)
print(f"Chosen by PR-AUC: {winner['pr_auc']:.4f}")
print(f"Precision: {winner['precision']:.4f}")
print(f"Recall:    {winner['recall']:.4f}")
print(f"F1:        {winner['f1']:.4f}")
print(f"ROC-AUC:   {winner['roc_auc']:.4f}")

model_path = os.path.join(MODELS_DIR, 'fraud_model.pkl')
joblib.dump(winner['model'], model_path)
print(f"\nSaved model: {model_path}")

# Metadata — the FastAPI service reads this to expose /model/info
metadata = {
    'model_name':       winner_name,
    'model_version':    'v1.0',
    'feature_names':    feature_names.tolist(),
    'n_features':       int(X_train.shape[1]),
    'training_samples': int(X_train.shape[0]),
    'test_samples':     int(X_test.shape[0]),
    'metrics': {
        'precision': float(winner['precision']),
        'recall':    float(winner['recall']),
        'f1':        float(winner['f1']),
        'roc_auc':   float(winner['roc_auc']),
        'pr_auc':    float(winner['pr_auc']),
    },
    'all_models_compared': {
        name: {
            'precision': float(r['precision']),
            'recall':    float(r['recall']),
            'f1':        float(r['f1']),
            'roc_auc':   float(r['roc_auc']),
            'pr_auc':    float(r['pr_auc']),
            'train_time_seconds': float(r['train_time']),
        }
        for name, r in results.items()
    },
}
metadata_path = os.path.join(MODELS_DIR, 'model_metadata.json')
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"Saved metadata: {metadata_path}")

print("\nTraining complete. Ready to build the FastAPI inference service.")