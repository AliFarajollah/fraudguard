"""
01_eda.py — Exploratory Data Analysis for the Credit Card Fraud dataset.

Generates 5 PNG figures in docs/screenshots/ that will be used as figures
in the thesis (Chapter 4.1). Also prints a summary to the console.
"""

# ──────────────────────────────────────────────────────────────────────
# Imports and configuration
# ──────────────────────────────────────────────────────────────────────
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['figure.dpi'] = 100
plt.rcParams['savefig.dpi'] = 300  # publication-quality for thesis figures
plt.rcParams['font.size'] = 11
sns.set_style('whitegrid')

# Resolve paths relative to the script location so it works from any CWD
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'creditcard.csv')
FIGURE_DIR = os.path.join(SCRIPT_DIR, '..', '..', 'docs', 'screenshots')
os.makedirs(FIGURE_DIR, exist_ok=True)

print("Setup complete.")
print(f"Dataset path: {DATA_PATH}")
print(f"Figures will be saved to: {FIGURE_DIR}")

# ──────────────────────────────────────────────────────────────────────
# 1. Load the dataset
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("1. LOADING THE DATASET")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
print(f"Dataset shape: {df.shape}")
print(f"Total transactions: {df.shape[0]:,}")
print(f"Number of features: {df.shape[1]}")
print("\nFirst 5 rows:")
print(df.head())

# ──────────────────────────────────────────────────────────────────────
# 2. Basic info + missing values
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("2. BASIC INFO & MISSING VALUES")
print("=" * 60)

print("\nColumn data types:")
print(df.dtypes)
print(f"\nTotal missing values: {df.isnull().sum().sum()}")
print("\nStatistical summary:")
print(df.describe())

# ──────────────────────────────────────────────────────────────────────
# 3. Class distribution (THE critical chart)
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("3. CLASS DISTRIBUTION")
print("=" * 60)

class_counts = df['Class'].value_counts()
class_percentages = df['Class'].value_counts(normalize=True) * 100

print(f"Legitimate (Class 0): {class_counts[0]:,} ({class_percentages[0]:.3f}%)")
print(f"Fraudulent (Class 1): {class_counts[1]:,} ({class_percentages[1]:.3f}%)")
print(f"Imbalance ratio: 1 fraud for every {class_counts[0] // class_counts[1]:,} legitimate")

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
colors = ['#2ecc71', '#e74c3c']

# Linear scale
ax1 = axes[0]
class_counts.plot(kind='bar', ax=ax1, color=colors, edgecolor='black')
ax1.set_title('Class Distribution (Absolute Counts)', fontsize=13, fontweight='bold')
ax1.set_xlabel('Class')
ax1.set_ylabel('Number of Transactions')
ax1.set_xticklabels(['Legitimate (0)', 'Fraudulent (1)'], rotation=0)
for i, v in enumerate(class_counts):
    ax1.text(i, v + 3000, f'{v:,}', ha='center', fontweight='bold')

# Log scale
ax2 = axes[1]
class_counts.plot(kind='bar', ax=ax2, color=colors, edgecolor='black')
ax2.set_yscale('log')
ax2.set_title('Class Distribution (Log Scale)', fontsize=13, fontweight='bold')
ax2.set_xlabel('Class')
ax2.set_ylabel('Number of Transactions (log scale)')
ax2.set_xticklabels(['Legitimate (0)', 'Fraudulent (1)'], rotation=0)

plt.tight_layout()
out_path = os.path.join(FIGURE_DIR, 'fig_class_distribution.png')
plt.savefig(out_path, bbox_inches='tight')
plt.close()
print(f"Saved: {out_path}")

# ──────────────────────────────────────────────────────────────────────
# 4. Amount distribution
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("4. AMOUNT DISTRIBUTION")
print("=" * 60)

legit_amounts = df[df['Class'] == 0]['Amount']
fraud_amounts = df[df['Class'] == 1]['Amount']

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ax1 = axes[0]
ax1.hist(legit_amounts[legit_amounts < 500], bins=50, alpha=0.6,
         color='#2ecc71', label='Legitimate', edgecolor='black')
ax1.hist(fraud_amounts[fraud_amounts < 500], bins=50, alpha=0.8,
         color='#e74c3c', label='Fraudulent', edgecolor='black')
ax1.set_title('Transaction Amount Distribution (< 500)', fontsize=13, fontweight='bold')
ax1.set_xlabel('Amount')
ax1.set_ylabel('Frequency')
ax1.legend()

ax2 = axes[1]
box_data = [legit_amounts, fraud_amounts]
bp = ax2.boxplot(box_data, tick_labels=['Legitimate', 'Fraudulent'],
                 patch_artist=True, showfliers=False)
bp['boxes'][0].set_facecolor('#2ecc71')
bp['boxes'][1].set_facecolor('#e74c3c')
ax2.set_title('Transaction Amount by Class (Boxplot)', fontsize=13, fontweight='bold')
ax2.set_ylabel('Amount')

plt.tight_layout()
out_path = os.path.join(FIGURE_DIR, 'fig_amount_distribution.png')
plt.savefig(out_path, bbox_inches='tight')
plt.close()
print(f"Saved: {out_path}")

print(f"\nLegitimate — mean: {legit_amounts.mean():.2f}, "
      f"median: {legit_amounts.median():.2f}, max: {legit_amounts.max():.2f}")
print(f"Fraudulent — mean: {fraud_amounts.mean():.2f}, "
      f"median: {fraud_amounts.median():.2f}, max: {fraud_amounts.max():.2f}")

# ──────────────────────────────────────────────────────────────────────
# 5. Time distribution (hour of day)
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("5. TIME DISTRIBUTION (HOUR OF DAY)")
print("=" * 60)

df_plot = df.copy()
df_plot['Hour'] = (df_plot['Time'] / 3600) % 24

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ax1 = axes[0]
legit_by_hour = df_plot[df_plot['Class'] == 0].groupby(df_plot['Hour'].astype(int)).size()
ax1.bar(legit_by_hour.index, legit_by_hour.values, color='#2ecc71', edgecolor='black')
ax1.set_title('Legitimate Transactions by Hour of Day', fontsize=13, fontweight='bold')
ax1.set_xlabel('Hour of Day')
ax1.set_ylabel('Number of Transactions')
ax1.set_xticks(range(0, 24, 2))

ax2 = axes[1]
fraud_by_hour = df_plot[df_plot['Class'] == 1].groupby(df_plot['Hour'].astype(int)).size()
ax2.bar(fraud_by_hour.index, fraud_by_hour.values, color='#e74c3c', edgecolor='black')
ax2.set_title('Fraudulent Transactions by Hour of Day', fontsize=13, fontweight='bold')
ax2.set_xlabel('Hour of Day')
ax2.set_ylabel('Number of Transactions')
ax2.set_xticks(range(0, 24, 2))

plt.tight_layout()
out_path = os.path.join(FIGURE_DIR, 'fig_time_distribution.png')
plt.savefig(out_path, bbox_inches='tight')
plt.close()
print(f"Saved: {out_path}")

# ──────────────────────────────────────────────────────────────────────
# 6. Correlation heatmap
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("6. CORRELATION HEATMAP")
print("=" * 60)

fig, ax = plt.subplots(figsize=(14, 10))
correlation_matrix = df.corr()
sns.heatmap(
    correlation_matrix, cmap='coolwarm', center=0, annot=False,
    square=True, linewidths=0.3,
    cbar_kws={'label': 'Correlation Coefficient'}, ax=ax,
)
ax.set_title('Feature Correlation Heatmap', fontsize=14, fontweight='bold')

plt.tight_layout()
out_path = os.path.join(FIGURE_DIR, 'fig_correlation_heatmap.png')
plt.savefig(out_path, bbox_inches='tight')
plt.close()
print(f"Saved: {out_path}")

correlations_with_class = (correlation_matrix['Class']
                           .drop('Class').abs().sort_values(ascending=False))
print("\nTop 10 features correlated with Class:")
print(correlations_with_class.head(10))

# ──────────────────────────────────────────────────────────────────────
# 7. Boxplots of top 6 predictive features
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("7. BOXPLOTS OF TOP PREDICTIVE FEATURES")
print("=" * 60)

top_features = correlations_with_class.head(6).index.tolist()
fig, axes = plt.subplots(2, 3, figsize=(15, 9))
axes = axes.flatten()

for i, feature in enumerate(top_features):
    ax = axes[i]
    data_to_plot = [df[df['Class'] == 0][feature], df[df['Class'] == 1][feature]]
    bp = ax.boxplot(data_to_plot, tick_labels=['Legit', 'Fraud'],
                    patch_artist=True, showfliers=False)
    bp['boxes'][0].set_facecolor('#2ecc71')
    bp['boxes'][1].set_facecolor('#e74c3c')
    ax.set_title(f'{feature}', fontsize=12, fontweight='bold')
    ax.set_ylabel('Value')

plt.suptitle('Top 6 Most Predictive Features — Distribution by Class',
             fontsize=14, fontweight='bold', y=1.00)
plt.tight_layout()
out_path = os.path.join(FIGURE_DIR, 'fig_top_features_boxplot.png')
plt.savefig(out_path, bbox_inches='tight')
plt.close()
print(f"Saved: {out_path}")

# ──────────────────────────────────────────────────────────────────────
# 8. Final summary
# ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("EDA — FINAL SUMMARY")
print("=" * 60)
print(f"Total transactions:        {len(df):,}")
print(f"Legitimate (Class 0):      {(df['Class'] == 0).sum():,} "
      f"({(df['Class'] == 0).mean() * 100:.3f}%)")
print(f"Fraudulent (Class 1):      {(df['Class'] == 1).sum():,} "
      f"({(df['Class'] == 1).mean() * 100:.3f}%)")
print(f"Imbalance ratio:           1:{(df['Class'] == 0).sum() // (df['Class'] == 1).sum()}")
print(f"Features:                  {df.shape[1] - 1} (Time, V1-V28, Amount)")
print(f"Missing values:            {df.isnull().sum().sum()}")
print(f"Mean amount (legit):       {df[df['Class']==0]['Amount'].mean():.2f}")
print(f"Mean amount (fraud):       {df[df['Class']==1]['Amount'].mean():.2f}")
print(f"Top predictive features:   {', '.join(correlations_with_class.head(5).index)}")
print("=" * 60)
print("\nKey findings:")
print("1. The dataset is extremely imbalanced (~0.17% fraud).")
print("2. No missing values — no imputation needed.")
print("3. Fraud transactions tend to have smaller amounts on average.")
print("4. Legitimate transactions follow a circadian pattern; fraud does not.")
print("5. Features V17, V14, V12, V10, V11 show the strongest signal for fraud.")
print("6. Imbalance must be addressed (SMOTE) + metrics must go beyond accuracy.")
print("\nEDA complete. All figures saved to:", FIGURE_DIR)