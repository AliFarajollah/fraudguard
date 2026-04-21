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