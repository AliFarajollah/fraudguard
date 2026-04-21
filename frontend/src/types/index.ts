// Shape of a user, as returned by the NestJS API (auth.service strips passwordHash)
export interface User {
    id: number;
    email: string;
    role: 'admin' | 'analyst' | 'viewer';
    createdAt: string;
}

// Shape of /auth/login and /auth/register responses
export interface AuthResponse {
    access_token: string;
    user: User;
}

// Shape of FastAPI's /model/info response
export interface ModelInfo {
    model_name: string;
    model_version: string;
    n_features: number;
    feature_names: string[];
    training_samples: number;
    test_samples: number;
    metrics: {
        precision: number;
        recall: number;
        f1: number;
        roc_auc: number;
        pr_auc: number;
    };
    all_models_compared?: Record<string, {
        precision: number;
        recall: number;
        f1: number;
        roc_auc: number;
        pr_auc: number;
        train_time_seconds: number;
    }>;
}
// Shape of a transaction feature vector sent to FastAPI /predict
export interface TransactionFeatures {
    Time: number;
    Amount: number;
    V1: number; V2: number; V3: number; V4: number;
    V5: number; V6: number; V7: number; V8: number;
    V9: number; V10: number; V11: number; V12: number;
    V13: number; V14: number; V15: number; V16: number;
    V17: number; V18: number; V19: number; V20: number;
    V21: number; V22: number; V23: number; V24: number;
    V25: number; V26: number; V27: number; V28: number;
}

// Shape of FastAPI /predict response
export interface PredictionResponse {
    fraud_probability: number;
    predicted_label: boolean;
    threshold: number;
    model_version: string;
}