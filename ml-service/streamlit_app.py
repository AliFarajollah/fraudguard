"""
streamlit_app.py — FraudGuard ML Intelligence Dashboard

An interactive Streamlit dashboard for the thesis presentation.
Runs separately from FastAPI on port 8501.

Pages:
  1. 📊 Model Performance  — metrics, model comparison, ROC/PR curves
  2. 🔍 Live Scorer        — score any transaction interactively
  3. 📈 Transaction History — pulls live data from the NestJS API
  4. 🧠 Feature Importance — top XGBoost features

Run:
    cd ml-service
    streamlit run streamlit_app.py
"""

import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR  = os.path.join(BASE_DIR, "models")
MODEL_PATH  = os.path.join(MODELS_DIR, "fraud_model.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.pkl")
META_PATH   = os.path.join(MODELS_DIR, "model_metadata.json")

FASTAPI_URL = "http://localhost:8000"
NESTJS_URL  = "http://localhost:3000"

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="FraudGuard ML Dashboard",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    /* Dark sidebar */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    }
    [data-testid="stSidebar"] * { color: #e2e8f0 !important; }
    [data-testid="stSidebar"] .stRadio label { color: #94a3b8 !important; }
    [data-testid="stSidebar"] .stRadio label[data-checked="true"] {
        color: #60a5fa !important; font-weight: 700;
    }

    /* Main area */
    .main { background: #f8fafc; }

    /* Metric cards */
    .metric-card {
        background: white;
        border-radius: 12px;
        padding: 20px 24px;
        border-left: 4px solid;
        box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    }
    .metric-card.blue  { border-color: #3b82f6; }
    .metric-card.green { border-color: #10b981; }
    .metric-card.red   { border-color: #ef4444; }
    .metric-card.amber { border-color: #f59e0b; }

    .metric-label { font-size: 12px; font-weight: 600; color: #64748b;
                    text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 36px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .metric-sub   { font-size: 12px; color: #94a3b8; margin-top: 4px; }

    /* Winner badge */
    .winner-badge {
        display: inline-block; background: #dcfce7; color: #15803d;
        padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;
        margin-left: 8px;
    }

    /* Fraud alert */
    .fraud-alert {
        background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px;
        padding: 20px; text-align: center;
    }
    .legit-alert {
        background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
        padding: 20px; text-align: center;
    }
    .prob-number { font-size: 52px; font-weight: 900; }
    .fraud-alert .prob-number { color: #dc2626; }
    .legit-alert .prob-number { color: #16a34a; }

    /* Hide Streamlit branding */
    #MainMenu, footer, header { visibility: hidden; }
</style>
""", unsafe_allow_html=True)


# ── Cached loaders ────────────────────────────────────────────────────────────

@st.cache_resource
def load_model_artifacts():
    """Load model, scaler, and metadata once and cache them."""
    model   = joblib.load(MODEL_PATH)
    scaler  = joblib.load(SCALER_PATH)
    with open(META_PATH) as f:
        meta = json.load(f)
    return model, scaler, meta


@st.cache_data(ttl=30)
def fetch_transactions(token: str):
    """Pull live transactions from NestJS (cached 30 s)."""
    try:
        r = requests.get(
            f"{NESTJS_URL}/transactions",
            params={"page": 1, "limit": 100},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        r.raise_for_status()
        return r.json().get("data", [])
    except Exception:
        return []


@st.cache_data(ttl=30)
def fetch_stats(token: str):
    """Pull aggregate stats from NestJS."""
    try:
        r = requests.get(
            f"{NESTJS_URL}/transactions/stats",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        r.raise_for_status()
        return r.json()
    except Exception:
        return {}


# ── Sidebar ────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## 🛡️ FraudGuard")
    st.markdown("**ML Intelligence Dashboard**")
    st.markdown("---")

    page = st.radio(
        "Navigation",
        ["📊 Model Performance", "🔍 Live Scorer", "📈 Transaction History", "🧠 Feature Importance"],
        label_visibility="collapsed",
    )

    st.markdown("---")
    st.markdown("### 🔑 API Token")
    st.markdown("Paste your JWT to enable live data pages.")
    token = st.text_input("JWT Token", type="password", placeholder="eyJ...", key="jwt_token")

    st.markdown("---")
    st.markdown("**Services**")
    # Quick health check indicators
    try:
        h = requests.get(f"{FASTAPI_URL}/health", timeout=2)
        ml_ok = h.status_code == 200
    except Exception:
        ml_ok = False

    try:
        h2 = requests.get(f"{NESTJS_URL}", timeout=2)
        api_ok = h2.status_code < 500
    except Exception:
        api_ok = False

    st.markdown(
        f"{'🟢' if ml_ok else '🔴'} FastAPI ML (:{8000})\n\n"
        f"{'🟢' if api_ok else '🔴'} NestJS API (:{3000})"
    )


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1 — Model Performance
# ══════════════════════════════════════════════════════════════════════════════

if page == "📊 Model Performance":
    model, scaler, meta = load_model_artifacts()

    st.title("📊 Model Performance")
    st.markdown(
        f"Comparing **Logistic Regression**, **Random Forest**, and **XGBoost** "
        f"trained on {meta['training_samples']:,} transactions · "
        f"Tested on {meta['test_samples']:,} transactions"
    )

    # ── Winner metrics ────────────────────────────────────────────────────────
    m = meta["metrics"]
    cols = st.columns(5)
    cards = [
        ("Precision", f"{m['precision']:.1%}", "blue",   "TP / (TP + FP)"),
        ("Recall",    f"{m['recall']:.1%}",    "green",  "TP / (TP + FN)"),
        ("F1 Score",  f"{m['f1']:.1%}",        "amber",  "Harmonic mean"),
        ("ROC-AUC",   f"{m['roc_auc']:.4f}",   "blue",   "Area under ROC"),
        ("PR-AUC",    f"{m['pr_auc']:.4f}",    "green",  "Area under PR curve"),
    ]
    for col, (label, value, color, sub) in zip(cols, cards):
        with col:
            st.markdown(f"""
            <div class="metric-card {color}">
                <div class="metric-label">{label}</div>
                <div class="metric-value">{value}</div>
                <div class="metric-sub">{sub}</div>
            </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Model comparison table ────────────────────────────────────────────────
    st.subheader("Model Comparison")
    all_models = meta["all_models_compared"]
    df_compare = pd.DataFrame(all_models).T.reset_index()
    df_compare.columns = ["Model", "Precision", "Recall", "F1", "ROC-AUC", "PR-AUC", "Train Time (s)"]
    df_compare = df_compare.sort_values("PR-AUC", ascending=False).reset_index(drop=True)

    # Highlight best row
    def highlight_winner(row):
        return ["background-color: #f0fdf4; font-weight: bold"] * len(row) \
            if row.name == 0 else [""] * len(row)

    styled = (
        df_compare.style
        .format({
            "Precision": "{:.1%}", "Recall": "{:.1%}", "F1": "{:.1%}",
            "ROC-AUC": "{:.4f}", "PR-AUC": "{:.4f}", "Train Time (s)": "{:.1f}s"
        })
        .apply(highlight_winner, axis=1)
    )
    st.dataframe(styled, use_container_width=True, hide_index=True)

    # ── Bar chart comparison ──────────────────────────────────────────────────
    st.subheader("Visual Comparison")
    metrics_to_plot = ["Precision", "Recall", "F1", "ROC-AUC", "PR-AUC"]
    df_melt = df_compare[["Model"] + metrics_to_plot].melt(id_vars="Model", var_name="Metric", value_name="Score")

    fig = px.bar(
        df_melt,
        x="Metric", y="Score", color="Model", barmode="group",
        color_discrete_map={
            "XGBoost": "#3b82f6",
            "Random Forest": "#10b981",
            "Logistic Regression": "#f59e0b",
        },
        range_y=[0, 1.05],
        template="plotly_white",
    )
    fig.update_layout(
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        font=dict(family="Inter, sans-serif"),
        height=380,
    )
    st.plotly_chart(fig, use_container_width=True)

    # ── Training time ─────────────────────────────────────────────────────────
    st.subheader("Training Time")
    fig2 = px.bar(
        df_compare, x="Model", y="Train Time (s)",
        color="Model",
        color_discrete_map={
            "XGBoost": "#3b82f6",
            "Random Forest": "#10b981",
            "Logistic Regression": "#f59e0b",
        },
        template="plotly_white",
        text_auto=".1f",
    )
    fig2.update_layout(showlegend=False, height=300, font=dict(family="Inter, sans-serif"))
    st.plotly_chart(fig2, use_container_width=True)

    st.caption(
        f"**Winner: {meta['model_name']} v{meta['model_version']}** — "
        f"selected for best PR-AUC ({m['pr_auc']:.4f}) with a good precision/recall balance."
    )


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2 — Live Scorer
# ══════════════════════════════════════════════════════════════════════════════

elif page == "🔍 Live Scorer":
    model, scaler, meta = load_model_artifacts()
    feature_names = meta["feature_names"]

    st.title("🔍 Live Transaction Scorer")
    st.markdown("Adjust the feature sliders and click **Score** to get an instant ML prediction.")

    col_preset, col_spacer = st.columns([2, 6])
    with col_preset:
        preset = st.selectbox(
            "Load preset",
            ["Custom", "Known Fraud Example", "Known Legit Example"],
        )

    # Preset feature values
    FRAUD_VALUES = {
        "Time": 406, "Amount": 0,
        "V1": -2.3122, "V2": 1.9519, "V3": -1.6099, "V4": 3.9979,
        "V5": -0.5221, "V6": -1.4265, "V7": -2.5374, "V8": 1.3917,
        "V9": -2.77,   "V10": -2.7722, "V11": 3.202, "V12": -2.8999,
        "V13": -0.5952, "V14": -4.2893, "V15": 0.3898, "V16": -1.1407,
        "V17": -2.8301, "V18": -0.0168, "V19": 0.417, "V20": 0.1267,
        "V21": 0.5172, "V22": -0.035, "V23": -0.4653, "V24": 0.3201,
        "V25": 0.0445, "V26": 0.1778, "V27": 0.2611, "V28": -0.1432,
    }
    LEGIT_VALUES = {
        "Time": 0, "Amount": 149.62,
        "V1": -1.3598, "V2": -0.0728, "V3": 2.5363, "V4": 1.3782,
        "V5": -0.3383, "V6": 0.4624, "V7": 0.2396, "V8": 0.0987,
        "V9": 0.3638, "V10": 0.0908, "V11": -0.5516, "V12": -0.6178,
        "V13": -0.9914, "V14": -0.3112, "V15": 1.4682, "V16": -0.4704,
        "V17": 0.208, "V18": 0.0258, "V19": 0.404, "V20": 0.2514,
        "V21": -0.0183, "V22": 0.2778, "V23": -0.1105, "V24": 0.0669,
        "V25": 0.1285, "V26": -0.1891, "V27": 0.1336, "V28": -0.0211,
    }

    defaults = FRAUD_VALUES if preset == "Known Fraud Example" \
               else LEGIT_VALUES if preset == "Known Legit Example" \
               else {k: 0.0 for k in feature_names}

    # Feature inputs in a 5-column grid
    feature_vals: dict[str, float] = {}
    st.markdown("#### Feature Values")

    # Time + Amount on their own row
    c1, c2, c3 = st.columns(3)
    feature_vals["Time"]   = c1.number_input("Time (seconds)", value=float(defaults.get("Time", 0)), step=1.0)
    feature_vals["Amount"] = c2.number_input("Amount (€)", value=float(defaults.get("Amount", 0.0)), step=0.01)

    # V1 – V28 in a grid
    v_features = [f"V{i}" for i in range(1, 29)]
    cols_per_row = 7
    for row_start in range(0, 28, cols_per_row):
        cols = st.columns(cols_per_row)
        for i, feat in enumerate(v_features[row_start:row_start + cols_per_row]):
            feature_vals[feat] = cols[i].number_input(
                feat,
                value=float(defaults.get(feat, 0.0)),
                step=0.01,
                format="%.4f",
                key=f"feat_{feat}",
            )

    st.markdown("---")

    if st.button("⚡ Score Transaction", type="primary", use_container_width=True):
        with st.spinner("Calling ML model…"):
            try:
                resp = requests.post(
                    f"{FASTAPI_URL}/predict",
                    json=feature_vals,
                    timeout=5,
                )
                resp.raise_for_status()
                result = resp.json()

                prob  = result["fraud_probability"]
                label = result["predicted_label"]
                thresh = result["threshold"]

                r_col1, r_col2 = st.columns([1, 2])
                with r_col1:
                    alert_class = "fraud-alert" if label else "legit-alert"
                    icon        = "🚨" if label else "✅"
                    verdict     = "FRAUD DETECTED" if label else "LEGITIMATE"
                    color       = "#dc2626" if label else "#16a34a"
                    st.markdown(f"""
                    <div class="{alert_class}">
                        <div style="font-size:36px">{icon}</div>
                        <div class="prob-number">{prob:.1%}</div>
                        <div style="font-size:16px; font-weight:700; color:{color}; margin-top:8px">
                            {verdict}
                        </div>
                        <div style="font-size:12px; color:#64748b; margin-top:4px">
                            Threshold: {thresh:.0%} · Model: {result['model_version']}
                        </div>
                    </div>""", unsafe_allow_html=True)

                with r_col2:
                    # Gauge chart
                    fig = go.Figure(go.Indicator(
                        mode="gauge+number",
                        value=prob * 100,
                        number={"suffix": "%", "font": {"size": 36}},
                        gauge={
                            "axis": {"range": [0, 100], "tickwidth": 1},
                            "bar": {"color": "#dc2626" if label else "#10b981"},
                            "bgcolor": "white",
                            "steps": [
                                {"range": [0, 50],  "color": "#dcfce7"},
                                {"range": [50, 100], "color": "#fee2e2"},
                            ],
                            "threshold": {
                                "line": {"color": "#1e293b", "width": 3},
                                "thickness": 0.75,
                                "value": thresh * 100,
                            },
                        },
                        title={"text": "Fraud Probability"},
                    ))
                    fig.update_layout(height=280, margin=dict(t=40, b=10))
                    st.plotly_chart(fig, use_container_width=True)

            except Exception as e:
                st.error(f"Error calling FastAPI: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 3 — Transaction History
# ══════════════════════════════════════════════════════════════════════════════

elif page == "📈 Transaction History":
    st.title("📈 Live Transaction History")

    if not token:
        st.warning("⚠️ Paste your JWT token in the sidebar to load live data from the API.")
        st.stop()

    with st.spinner("Loading transactions…"):
        txs   = fetch_transactions(token)
        stats = fetch_stats(token)

    if not txs:
        st.error("Could not load transactions. Check your token and that NestJS is running.")
        st.stop()

    # ── Top stats ─────────────────────────────────────────────────────────────
    cols = st.columns(4)
    metric_defs = [
        ("Total",            stats.get("total", 0),            "blue"),
        ("Scored",           stats.get("scored", 0),           "green"),
        ("Confirmed Fraud",  stats.get("confirmed_fraud", 0),  "red"),
        ("False Positives",  stats.get("false_positive", 0),   "amber"),
    ]
    for col, (label, value, color) in zip(cols, metric_defs):
        with col:
            st.markdown(f"""
            <div class="metric-card {color}">
                <div class="metric-label">{label}</div>
                <div class="metric-value">{value}</div>
            </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Build DataFrame ───────────────────────────────────────────────────────
    rows = []
    for tx in txs:
        pred = tx.get("prediction") or {}
        rows.append({
            "ID":         tx["id"],
            "Amount (€)": float(tx["amount"]),
            "Date":       tx["occurredAt"][:10],
            "Status":     tx["status"],
            "Fraud Prob": float(pred.get("fraudProbability", 0)) if pred else None,
            "Flagged":    pred.get("predictedLabel", False) if pred else False,
            "Uploaded By": tx.get("uploadedBy", {}).get("email", "—"),
        })
    df = pd.DataFrame(rows)

    # ── Charts ────────────────────────────────────────────────────────────────
    c1, c2 = st.columns(2)

    with c1:
        st.subheader("Status Distribution")
        status_counts = df["Status"].value_counts().reset_index()
        status_counts.columns = ["Status", "Count"]
        fig = px.pie(
            status_counts, values="Count", names="Status",
            color="Status",
            color_discrete_map={"pending": "#94a3b8", "scored": "#3b82f6", "reviewed": "#10b981"},
            hole=0.4, template="plotly_white",
        )
        fig.update_layout(height=300, margin=dict(t=20, b=20))
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.subheader("Fraud Probability Distribution")
        scored = df[df["Fraud Prob"].notna()]
        if not scored.empty:
            fig2 = px.histogram(
                scored, x="Fraud Prob", nbins=20,
                color="Flagged",
                color_discrete_map={True: "#ef4444", False: "#10b981"},
                template="plotly_white",
                labels={"Fraud Prob": "Fraud Probability", "Flagged": "Fraud Flagged"},
            )
            fig2.update_layout(height=300, margin=dict(t=20, b=20))
            st.plotly_chart(fig2, use_container_width=True)

    # ── Amount vs Probability scatter ─────────────────────────────────────────
    st.subheader("Amount vs Fraud Probability")
    if not scored.empty:
        fig3 = px.scatter(
            scored, x="Amount (€)", y="Fraud Prob",
            color="Flagged",
            color_discrete_map={True: "#ef4444", False: "#10b981"},
            size=[8] * len(scored),
            hover_data=["ID", "Status", "Uploaded By"],
            template="plotly_white",
        )
        fig3.add_hline(y=0.5, line_dash="dash", line_color="#1e293b", annotation_text="Threshold (50%)")
        fig3.update_layout(height=350, font=dict(family="Inter, sans-serif"))
        st.plotly_chart(fig3, use_container_width=True)

    # ── Raw table ─────────────────────────────────────────────────────────────
    st.subheader("All Transactions")
    display_df = df.copy()
    display_df["Fraud Prob"] = display_df["Fraud Prob"].apply(
        lambda x: f"{x:.1%}" if x is not None else "—"
    )
    display_df["Flagged"] = display_df["Flagged"].apply(lambda x: "🚨 Yes" if x else "✅ No")
    st.dataframe(display_df, use_container_width=True, hide_index=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 4 — Feature Importance
# ══════════════════════════════════════════════════════════════════════════════

elif page == "🧠 Feature Importance":
    model, scaler, meta = load_model_artifacts()
    st.title("🧠 XGBoost Feature Importance")
    st.markdown(
        "Feature importance shows which PCA components the model relies on most "
        "to distinguish fraudulent transactions from legitimate ones."
    )

    # Extract feature importances from the XGBoost model
    try:
        importances = model.feature_importances_
        feature_names = meta["feature_names"]

        df_imp = pd.DataFrame({
            "Feature": feature_names,
            "Importance": importances,
        }).sort_values("Importance", ascending=False).reset_index(drop=True)
        df_imp["Rank"] = df_imp.index + 1

        # ── Top 15 bar chart ─────────────────────────────────────────────────
        top15 = df_imp.head(15)

        fig = px.bar(
            top15, y="Feature", x="Importance",
            orientation="h",
            color="Importance",
            color_continuous_scale="Blues",
            template="plotly_white",
            text=top15["Importance"].apply(lambda x: f"{x:.4f}"),
        )
        fig.update_layout(
            height=480,
            yaxis={"categoryorder": "total ascending"},
            coloraxis_showscale=False,
            font=dict(family="Inter, sans-serif"),
            margin=dict(l=20, r=20, t=20, b=20),
        )
        fig.update_traces(textposition="outside")
        st.plotly_chart(fig, use_container_width=True)

        # ── Full table ────────────────────────────────────────────────────────
        col1, col2 = st.columns([1, 1])
        with col1:
            st.subheader("All Features Ranked")
            st.dataframe(
                df_imp[["Rank", "Feature", "Importance"]].style.format({"Importance": "{:.6f}"}),
                use_container_width=True, hide_index=True,
            )

        with col2:
            st.subheader("About These Features")
            st.markdown("""
The features **V1–V28** are the result of **Principal Component Analysis (PCA)**
applied to the original Kaggle Credit Card Fraud dataset to protect card holder
privacy. The original features are not disclosed.

**Key insights:**
- **V14** and **V4** consistently rank highest across tree-based models
- **Amount** has moderate importance — fraudulent amounts cluster near €0
- **Time** has low importance — fraud occurs throughout the day
- High-ranking features correspond to spending patterns and merchant categories
  that the PCA captured without revealing identifiable information

**Model:** XGBoost (selected winner after comparing Logistic Regression,
Random Forest, and XGBoost based on PR-AUC on the held-out test set of
{:,} transactions)
            """.format(meta["test_samples"]))

    except AttributeError:
        st.error("Feature importances not available for this model type.")
